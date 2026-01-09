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
export type ZhipuModel = 'glm-4.7' | 'glm-4-plus' | 'glm-4-flash';

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
   */
  async startSession(session: ActiveSession, worker?: WorkerRef): Promise<void> {
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
      session.conversationHistory.push({ role: 'user', content: initPrompt });
      const initResponse = await this.queryZhipuMultiTurn(session.conversationHistory, apiKey, model);

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

      for await (const message of this.sessionManager.getMessageIterator(session.sessionDbId)) {
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
          });

          session.conversationHistory.push({ role: 'user', content: obsPrompt });
          const obsResponse = await this.queryZhipuMultiTurn(session.conversationHistory, apiKey, model);

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
      const sessionDuration = Date.now() - session.startTime;
      logger.success('SESSION', 'Zhipu agent completed', {
        sessionId: session.sessionDbId,
        duration: `${(sessionDuration / 1000).toFixed(1)}s`,
        historyLength: session.conversationHistory.length
      });

    } catch (error: unknown) {
      if (isAbortError(error)) {
        logger.warn('SESSION', 'Zhipu agent aborted', { sessionId: session.sessionDbId });
        throw error;
      }

      // Check if we should fall back to Claude
      if (shouldFallbackToClaude(error) && this.fallbackAgent) {
        logger.warn('SESSION', 'Zhipu API failed, falling back to Claude SDK', {
          sessionDbId: session.sessionDbId,
          error: error instanceof Error ? error.message : String(error),
          historyLength: session.conversationHistory.length
        });

        return this.fallbackAgent.startSession(session, worker);
      }

      logger.failure('SESSION', 'Zhipu agent error', { sessionDbId: session.sessionDbId }, error as Error);
      throw error;
    }
  }

  /**
   * Query Zhipu API with conversation history
   */
  private async queryZhipuMultiTurn(
    history: ConversationMessage[],
    apiKey: string,
    model: ZhipuModel
  ): Promise<{ content: string; tokensUsed?: number }> {
    const messages: AnthropicMessage[] = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    logger.info('SESSION', `[Zhipu] Calling API with model=${model}`);

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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zhipu API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as AnthropicResponse;

    if (!data.content?.[0]?.text) {
      logger.error('SESSION', 'Empty response from Zhipu API');
      return { content: '' };
    }

    const content = data.content[0].text;
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    logger.info('SESSION', `[Zhipu] API response received, tokens=${tokensUsed}`);

    return { content, tokensUsed };
  }

  /**
   * Get Zhipu configuration from settings
   */
  private getZhipuConfig(): { apiKey: string; model: ZhipuModel } {
    const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
    const settings = SettingsDefaultsManager.loadFromFile(settingsPath);

    const apiKey = settings.CLAUDE_MEM_ZHIPU_API_KEY || '';
    const configuredModel = settings.CLAUDE_MEM_ZHIPU_MODEL || 'glm-4.7';

    const validModels: ZhipuModel[] = ['glm-4.7', 'glm-4-plus', 'glm-4-flash'];
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
