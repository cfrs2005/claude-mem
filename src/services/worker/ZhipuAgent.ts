/**
 * ZhipuAgent: Zhipu GLM API adapter
 *
 * Direct API integration with Zhipu's Anthropic-compatible endpoint.
 * Does NOT use Claude SDK - calls Zhipu API directly via fetch.
 *
 * API Endpoint: https://open.bigmodel.cn/api/anthropic/v1/messages
 */

import path from 'path';
import { homedir } from 'os';
import { DatabaseManager } from './DatabaseManager.js';
import { SessionManager } from './SessionManager.js';
import { logger } from '../../utils/logger.js';
import { buildInitPrompt, buildObservationPrompt, buildSummaryPrompt, buildContinuationPrompt } from '../../sdk/prompts.js';
import { SettingsDefaultsManager } from '../../shared/SettingsDefaultsManager.js';
import type { ActiveSession, ConversationMessage } from '../worker-types.js';
import { ModeManager } from '../domain/ModeManager.js';
import {
  processAgentResponse,
  shouldFallbackToClaude,
  isAbortError,
  type WorkerRef,
  type FallbackAgent
} from './agents/index.js';

// Zhipu Anthropic-compatible API endpoint
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/anthropic/v1/messages';

// Zhipu model types
export type ZhipuModel = 'glm-4.5-flash' | 'glm-4.7' | 'glm-4-plus' | 'glm-4-flash' | 'glm-4-air';

// ============================================================================
// Anthropic-compatible message types
// ============================================================================

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

// ============================================================================
// ZhipuAgent
// ============================================================================

export class ZhipuAgent {
  private dbManager: DatabaseManager;
  private sessionManager: SessionManager;
  private fallbackAgent: FallbackAgent | null = null;

  // 全局串行执行锁：所有实例共享的Promise链
  // 确保同一时间只有一个Zhipu API调用在执行
  private static globalLock: Promise<void> = Promise.resolve();

  constructor(dbManager: DatabaseManager, sessionManager: SessionManager) {
    this.dbManager = dbManager;
    this.sessionManager = sessionManager;
  }

  /**
   * Set fallback agent (Claude SDK) for when Zhipu API fails
   */
  setFallbackAgent(agent: FallbackAgent): void {
    this.fallbackAgent = agent;
  }

  /**
   * Start Zhipu agent for a session
   * 全局串行执行：同一时间只有一个Zhipu调用在运行
   */
  async startSession(session: ActiveSession, worker?: WorkerRef): Promise<void> {
    // 获取全局锁：等待前一个调用完成
    const myTurn = ZhipuAgent.globalLock;
    let resolveMyLock!: () => void;
    ZhipuAgent.globalLock = new Promise(resolve => { resolveMyLock = resolve; });

    logger.debug('SESSION', `[Zhipu] Generator WAITING for global lock | sessionDbId=${session.sessionDbId}`, {
      sessionId: session.sessionDbId
    });
    await myTurn;

    const startTime = Date.now();
    logger.info('SESSION', `[Zhipu] Generator STARTING | sessionDbId=${session.sessionDbId} | contentSessionId=${session.contentSessionId} | prompt#=${session.lastPromptNumber}`, {
      sessionId: session.sessionDbId
    });

    try {
      const { apiKey, model } = this.getZhipuConfig();

      if (!apiKey) {
        throw new Error('Zhipu API key not configured. Set CLAUDE_MEM_ZHIPU_API_KEY in settings.');
      }

      const mode = ModeManager.getInstance().getActiveMode();

      // Build initial prompt
      const initPrompt = session.lastPromptNumber === 1
        ? buildInitPrompt(session.project, session.contentSessionId, session.userPrompt, mode)
        : buildContinuationPrompt(session.userPrompt, session.lastPromptNumber, session.contentSessionId, mode);

      // Add to conversation history and query Zhipu
      logger.info('SESSION', `[Zhipu] Sending INIT request | sessionDbId=${session.sessionDbId} | model=${model} | historyLength=${session.conversationHistory.length + 1}`, {
        sessionId: session.sessionDbId
      });
      const apiStartTime = Date.now();
      session.conversationHistory.push({ role: 'user', content: initPrompt });
      const initResponse = await this.queryZhipuMultiTurn(session.conversationHistory, apiKey, model);
      const apiDuration = Date.now() - apiStartTime;
      logger.info('SESSION', `[Zhipu] INIT response received | sessionDbId=${session.sessionDbId} | duration=${apiDuration}ms | tokensUsed=${initResponse.tokensUsed || 0}`, {
        sessionId: session.sessionDbId
      });

      // Capture memorySessionId from Zhipu's first response (for FK constraint and resume support)
      // This must happen BEFORE processAgentResponse to satisfy memorySessionId requirement
      if (!session.memorySessionId && initResponse.responseId) {
        session.memorySessionId = initResponse.responseId;

        // Persist to database for cross-restart recovery
        this.dbManager.getSessionStore().updateMemorySessionId(
          session.sessionDbId,
          initResponse.responseId
        );

        // Verify database persistence
        const verification = this.dbManager.getSessionStore().getSessionById(session.sessionDbId);
        const dbVerified = verification?.memory_session_id === initResponse.responseId;

        logger.info('SESSION', `MEMORY_ID_CAPTURED | sessionDbId=${session.sessionDbId} | memorySessionId=${initResponse.responseId} | dbVerified=${dbVerified}`, {
          sessionId: session.sessionDbId,
          memorySessionId: initResponse.responseId
        });
      }

      if (initResponse.content) {
        session.conversationHistory.push({ role: 'assistant', content: initResponse.content });

        const tokensUsed = initResponse.tokensUsed || 0;
        session.cumulativeInputTokens += Math.floor(tokensUsed * 0.7);
        session.cumulativeOutputTokens += Math.floor(tokensUsed * 0.3);

        await processAgentResponse(
          initResponse.content,
          session,
          this.dbManager,
          this.sessionManager,
          worker,
          tokensUsed,
          null,
          'Zhipu'
        );
      } else {
        logger.error('SESSION', 'Empty Zhipu init response', {
          sessionId: session.sessionDbId,
          model
        });
      }

      // Process pending messages
      let lastCwd: string | undefined;
      let processedCount = 0;

      for await (const message of this.sessionManager.getMessageIterator(session.sessionDbId)) {
        processedCount++;
        logger.info('SESSION', `[Zhipu] Processing pending message #${processedCount} | sessionDbId=${session.sessionDbId} | messageId=${message.id} | type=${message.type} | tool=${message.tool_name || 'N/A'}`, {
          sessionId: session.sessionDbId
        });

        if (message.cwd) {
          lastCwd = message.cwd;
        }
        const originalTimestamp = session.earliestPendingTimestamp;

        if (message.type === 'observation') {
          if (message.prompt_number !== undefined) {
            session.lastPromptNumber = message.prompt_number;
          }

          const obsPrompt = buildObservationPrompt({
            id: 0,
            tool_name: message.tool_name!,
            tool_input: JSON.stringify(message.tool_input),
            tool_output: JSON.stringify(message.tool_response),
            created_at_epoch: originalTimestamp ?? Date.now(),
            cwd: message.cwd
          }, mode);

          logger.info('SESSION', `[Zhipu] Sending OBSERVATION request | sessionDbId=${session.sessionDbId} | tool=${message.tool_name} | historyLength=${session.conversationHistory.length + 1}`, {
            sessionId: session.sessionDbId
          });
          const obsApiStartTime = Date.now();
          session.conversationHistory.push({ role: 'user', content: obsPrompt });
          const obsResponse = await this.queryZhipuMultiTurn(session.conversationHistory, apiKey, model);
          const obsApiDuration = Date.now() - obsApiStartTime;
          logger.info('SESSION', `[Zhipu] OBSERVATION response received | sessionDbId=${session.sessionDbId} | duration=${obsApiDuration}ms | tokensUsed=${obsResponse.tokensUsed || 0}`, {
            sessionId: session.sessionDbId
          });

          let tokensUsed = 0;
          if (obsResponse.content) {
            session.conversationHistory.push({ role: 'assistant', content: obsResponse.content });
            tokensUsed = obsResponse.tokensUsed || 0;
            session.cumulativeInputTokens += Math.floor(tokensUsed * 0.7);
            session.cumulativeOutputTokens += Math.floor(tokensUsed * 0.3);
          }

          await processAgentResponse(
            obsResponse.content || '',
            session,
            this.dbManager,
            this.sessionManager,
            worker,
            tokensUsed,
            originalTimestamp,
            'Zhipu',
            lastCwd
          );

        } else if (message.type === 'summarize') {
          const summaryPrompt = buildSummaryPrompt({
            id: session.sessionDbId,
            memory_session_id: session.memorySessionId,
            project: session.project,
            user_prompt: session.userPrompt,
            last_assistant_message: message.last_assistant_message || ''
          }, mode);

          session.conversationHistory.push({ role: 'user', content: summaryPrompt });
          const summaryResponse = await this.queryZhipuMultiTurn(session.conversationHistory, apiKey, model);

          let tokensUsed = 0;
          if (summaryResponse.content) {
            session.conversationHistory.push({ role: 'assistant', content: summaryResponse.content });
            tokensUsed = summaryResponse.tokensUsed || 0;
            session.cumulativeInputTokens += Math.floor(tokensUsed * 0.7);
            session.cumulativeOutputTokens += Math.floor(tokensUsed * 0.3);
          }

          await processAgentResponse(
            summaryResponse.content || '',
            session,
            this.dbManager,
            this.sessionManager,
            worker,
            tokensUsed,
            originalTimestamp,
            'Zhipu',
            lastCwd
          );
        }
      }

      // Mark session complete
      const sessionDuration = Date.now() - startTime;
      logger.success('SESSION', `[Zhipu] Generator COMPLETED | sessionDbId=${session.sessionDbId} | duration=${(sessionDuration / 1000).toFixed(1)}s | processedMessages=${processedCount} | historyLength=${session.conversationHistory.length}`, {
        sessionId: session.sessionDbId,
        duration: `${(sessionDuration / 1000).toFixed(1)}s`,
        historyLength: session.conversationHistory.length
      });

    } catch (error: unknown) {
      const failureDuration = Date.now() - startTime;

      if (isAbortError(error)) {
        logger.warn('SESSION', `[Zhipu] Generator ABORTED | sessionDbId=${session.sessionDbId} | duration=${(failureDuration / 1000).toFixed(1)}s`, {
          sessionId: session.sessionDbId
        });
        throw error;
      }

      // Check if we should fall back to Claude
      if (shouldFallbackToClaude(error) && this.fallbackAgent) {
        logger.warn('SESSION', `[Zhipu] API FAILED, falling back to Claude SDK | sessionDbId=${session.sessionDbId} | error=${error instanceof Error ? error.message : String(error)} | duration=${(failureDuration / 1000).toFixed(1)}s`, {
          sessionDbId: session.sessionDbId,
          error: error instanceof Error ? error.message : String(error),
          historyLength: session.conversationHistory.length
        });

        return this.fallbackAgent.startSession(session, worker);
      }

      logger.failure('SESSION', `[Zhipu] Generator FAILED | sessionDbId=${session.sessionDbId} | error=${error instanceof Error ? error.message : String(error)} | duration=${(failureDuration / 1000).toFixed(1)}s`, {
        sessionDbId: session.sessionDbId
      }, error as Error);
      throw error;
    } finally {
      // 释放全局锁，允许下一个Zhipu调用执行
      resolveMyLock();
      logger.debug('SESSION', `[Zhipu] Generator released global lock | sessionDbId=${session.sessionDbId}`, {
        sessionId: session.sessionDbId
      });
    }
  }

  /**
   * Query Zhipu API with conversation history
   */
  private async queryZhipuMultiTurn(
    history: ConversationMessage[],
    apiKey: string,
    model: ZhipuModel
  ): Promise<{ content: string; tokensUsed?: number; responseId?: string }> {
    const messages: AnthropicMessage[] = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    logger.info('SESSION', `[Zhipu] API call START | model=${model} | messages=${messages.length}`);
    const apiCallStart = Date.now();

    try {
      const response = await fetch(ZHIPU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages
        })
      });

      const fetchDuration = Date.now() - apiCallStart;

      // Warn if API call is slow
      if (fetchDuration > 10000) {
        logger.warn('SESSION', `[Zhipu] SLOW API call | duration=${fetchDuration}ms | threshold=10s`, {
          duration: `${fetchDuration}ms`,
          model
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('SESSION', `[Zhipu] API HTTP error | status=${response.status} | duration=${fetchDuration}ms`, {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText.substring(0, 500)
        });
        throw new Error(`Zhipu API error: ${response.status} ${errorText}`);
      }

      const data = await response.json() as AnthropicResponse;

      if (!data.content?.[0]?.text) {
        logger.error('SESSION', `[Zhipu] Empty response | duration=${fetchDuration}ms`, {
          responseId: data.id,
          hasContent: !!data.content,
          contentLength: data.content?.length
        });
        return { content: '' };
      }

      const content = data.content[0].text;
      const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

      logger.info('SESSION', `[Zhipu] API call SUCCESS | duration=${fetchDuration}ms | tokens=${tokensUsed} | responseId=${data.id}`, {
        duration: `${fetchDuration}ms`,
        tokensUsed,
        responseId: data.id
      });

      return { content, tokensUsed, responseId: data.id };
    } catch (error: unknown) {
      const errorDuration = Date.now() - apiCallStart;
      logger.error('SESSION', `[Zhipu] API call FAILED | duration=${errorDuration}ms | error=${error instanceof Error ? error.message : String(error)}`, {
        duration: `${errorDuration}ms`,
        model,
        messagesCount: messages.length
      }, error as Error);
      throw error;
    }
  }

  /**
   * Get Zhipu configuration from settings
   */
  private getZhipuConfig(): { apiKey: string; model: ZhipuModel } {
    const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
    const settings = SettingsDefaultsManager.loadFromFile(settingsPath);

    const apiKey = settings.CLAUDE_MEM_ZHIPU_API_KEY || '';
    const configuredModel = settings.CLAUDE_MEM_ZHIPU_MODEL || 'glm-4.7';

    const validModels: ZhipuModel[] = ['glm-4.5-flash', 'glm-4.7', 'glm-4-plus', 'glm-4-flash', 'glm-4-air'];
    const model: ZhipuModel = validModels.includes(configuredModel as ZhipuModel)
      ? (configuredModel as ZhipuModel)
      : 'glm-4.7';

    return { apiKey, model };
  }
}

/**
 * Check if Zhipu provider is selected in settings
 */
export function isZhipuSelected(): boolean {
  const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  return settings.CLAUDE_MEM_PROVIDER === 'zhipu';
}

/**
 * Check if Zhipu API key is configured
 */
export function isZhipuAvailable(): boolean {
  const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  return !!settings.CLAUDE_MEM_ZHIPU_API_KEY;
}
