# Fork 核心定制记录

本文档记录了 cfrs2005/claude-mem fork 相对于上游 thedotmack/claude-mem 的核心定制功能。
用于在同步上游更新后重新应用这些改动。

---

## 1. 自定义 API 端点配置

**目的**: 让 claude-mem 使用独立的 API 密钥，避免消耗 Claude Code 订阅配额。

### 1.1 配置项定义

**文件**: `src/shared/SettingsDefaultsManager.ts`

```typescript
// 在 SettingsDefaults 接口中添加:
export interface SettingsDefaults {
  // ... 其他配置 ...

  // API Configuration (for independent API endpoint)
  MEM_ANTHROPIC_BASE_URL: string;
  MEM_ANTHROPIC_AUTH_TOKEN: string;
}

// 在 DEFAULTS 对象中添加默认值:
private static readonly DEFAULTS: SettingsDefaults = {
  // ... 其他默认值 ...

  // API Configuration (for independent API endpoint, empty = use Claude Code's default)
  MEM_ANTHROPIC_BASE_URL: '',
  MEM_ANTHROPIC_AUTH_TOKEN: '',
};
```

### 1.2 API 环境变量注入

**文件**: `src/services/worker/SDKAgent.ts`

```typescript
// 在 SDKAgent 类中添加方法:

/**
 * Get custom API environment variables from settings
 * Maps MEM_ANTHROPIC_* settings to ANTHROPIC_* env vars for Claude Code subprocess
 */
private getApiEnvironment(): Record<string, string> {
  const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
  const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
  const env: Record<string, string> = {};

  // Map custom settings to standard Anthropic env vars
  if (settings.MEM_ANTHROPIC_BASE_URL) {
    env.ANTHROPIC_BASE_URL = settings.MEM_ANTHROPIC_BASE_URL;
  }
  if (settings.MEM_ANTHROPIC_AUTH_TOKEN) {
    env.ANTHROPIC_API_KEY = settings.MEM_ANTHROPIC_AUTH_TOKEN;
  }

  return env;
}
```

### 1.3 SDK 调用时注入环境变量

**文件**: `src/services/worker/SDKAgent.ts` (startSession 方法)

```typescript
// 在 startSession 方法中，构建 SDK options 时:

// Build SDK options with optional custom API endpoint
const sdkOptions: any = {
  model: modelId,
  disallowedTools,
  abortController: session.abortController,
  pathToClaudeCodeExecutable: claudePath
};

// Inject custom API configuration via environment variables
const apiEnv = this.getApiEnvironment();
if (Object.keys(apiEnv).length > 0) {
  sdkOptions.env = { ...process.env, ...apiEnv };
  logger.info('SDK', 'Using custom API endpoint', {
    hasBaseUrl: !!apiEnv.ANTHROPIC_BASE_URL,
    hasAuthToken: !!apiEnv.ANTHROPIC_API_KEY
  });
}

// Run Agent SDK query loop
const queryResult = query({
  prompt: messageGenerator,
  options: sdkOptions
});
```

### 1.4 用户配置示例

用户在 `~/.claude-mem/settings.json` 中配置:

```json
{
  "MEM_ANTHROPIC_BASE_URL": "https://api.anthropic.com",
  "MEM_ANTHROPIC_AUTH_TOKEN": "sk-ant-api03-xxxxx"
}
```

---

## 2. 中文提示词支持

**目的**: 让 claude-mem 的观察和总结输出使用中文。

### 2.1 语言配置项

**文件**: `src/shared/SettingsDefaultsManager.ts`

```typescript
// 已存在于上游，确保配置项存在:
CLAUDE_MEM_CONTENT_LANGUAGE: 'en', // 'en' for English, 'zh' for Chinese
```

### 2.2 中文提示词文件

**文件**: `src/sdk/prompts-zh.ts` (完整文件)

这是一个完整的中文提示词模块，包含以下函数:

- `buildInitPrompt()` - 初始化提示词
- `buildObservationPrompt()` - 工具观察提示词
- `buildSummaryPrompt()` - 进度总结提示词
- `buildContinuationPrompt()` - 会话延续提示词

### 2.3 语言切换逻辑

**文件**: `src/sdk/prompts.ts`

```typescript
import * as promptsZh from './prompts-zh.js';

export type PromptLanguage = 'en' | 'zh';

/**
 * Get prompt functions based on language preference
 */
export function getPrompts(language: PromptLanguage) {
  if (language === 'zh') {
    return {
      buildInitPrompt: promptsZh.buildInitPrompt,
      buildObservationPrompt: promptsZh.buildObservationPrompt,
      buildSummaryPrompt: promptsZh.buildSummaryPrompt,
      buildContinuationPrompt: promptsZh.buildContinuationPrompt,
    };
  }

  // Default to English
  return {
    buildInitPrompt,
    buildObservationPrompt,
    buildSummaryPrompt,
    buildContinuationPrompt,
  };
}
```

### 2.4 SDKAgent 中的语言获取

**文件**: `src/services/worker/SDKAgent.ts`

```typescript
/**
 * Get content language setting from user settings
 */
private getContentLanguage(): PromptLanguage {
  try {
    const settingsContent = readFileSync(USER_SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(settingsContent);
    const language = settings.CLAUDE_MEM_CONTENT_LANGUAGE ||
      SettingsDefaultsManager.get('CLAUDE_MEM_CONTENT_LANGUAGE');
    return (language === 'zh' ? 'zh' : 'en') as PromptLanguage;
  } catch {
    return 'en';
  }
}
```

### 2.5 用户配置示例

用户在 `~/.claude-mem/settings.json` 中配置:

```json
{
  "CLAUDE_MEM_CONTENT_LANGUAGE": "zh"
}
```

---

## 重新应用步骤

同步上游后，按以下顺序重新应用改动:

1. **SettingsDefaultsManager.ts**
   - 添加 `MEM_ANTHROPIC_BASE_URL` 和 `MEM_ANTHROPIC_AUTH_TOKEN` 到接口和默认值

2. **SDKAgent.ts**
   - 添加 `getApiEnvironment()` 方法
   - 修改 `startSession()` 方法注入环境变量

3. **prompts-zh.ts**
   - 创建完整的中文提示词文件

4. **prompts.ts**
   - 添加 `import * as promptsZh`
   - 添加 `getPrompts()` 函数的中文分支

5. **构建和测试**
   ```bash
   npm run build-and-sync
   ```

---

## 注意事项

- 上游可能已经有类似功能，合并前先检查
- 中文提示词需要与上游英文版本保持结构同步
- API 配置功能是独立的，不影响其他功能
