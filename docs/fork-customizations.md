# Fork 核心定制记录

本文档记录了 cfrs2005/claude-mem fork 相对于上游 thedotmack/claude-mem 的核心定制功能。

**最后同步**: v9.0.1 (2026-01-08)

---

## 特色功能状态

### ✅ 1. 自定义 API 端点配置（已保留）

**目的**: 让 claude-mem 使用独立的 API 密钥，避免消耗 Claude Code 订阅配额。

**当前实现**（v9.0.1 后）:

#### 1.1 配置项定义

**文件**: `src/shared/SettingsDefaultsManager.ts`（第 38-39, 85-86 行）

```typescript
export interface SettingsDefaults {
  // API Configuration (for independent API endpoint)
  MEM_ANTHROPIC_BASE_URL: string;
  MEM_ANTHROPIC_AUTH_TOKEN: string;
}

private static readonly DEFAULTS: SettingsDefaults = {
  // API Configuration (for independent API endpoint, empty = use Claude Code's default)
  MEM_ANTHROPIC_BASE_URL: '',
  MEM_ANTHROPIC_AUTH_TOKEN: '',
};
```

#### 1.2 环境变量注入

**文件**: `src/services/worker-service.ts`（第 742-769 行）

在 worker 启动时（`--daemon` 模式）设置全局环境变量：

```typescript
// Set custom API env vars at worker startup (before any SDK subprocess is spawned)
const settingsPath = path.join(homedir(), '.claude-mem', 'settings.json');
try {
  const settingsContent = readFileSync(settingsPath, 'utf-8');
  const settings = JSON.parse(settingsContent);

  if (settings.MEM_ANTHROPIC_BASE_URL) {
    let baseUrl = settings.MEM_ANTHROPIC_BASE_URL;
    // Robustness: Strip trailing /messages if user pasted full endpoint
    if (baseUrl.endsWith('/messages')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - '/messages'.length);
    }
    // Robustness: Strip trailing slash
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 1);
    }

    process.env.ANTHROPIC_BASE_URL = baseUrl;
    logger.info('SYSTEM', 'Set ANTHROPIC_BASE_URL from settings', {
      original: settings.MEM_ANTHROPIC_BASE_URL,
      final: baseUrl
    });
  }

  if (settings.MEM_ANTHROPIC_AUTH_TOKEN) {
    process.env.ANTHROPIC_API_KEY = settings.MEM_ANTHROPIC_AUTH_TOKEN;
    logger.info('SYSTEM', 'Set ANTHROPIC_API_KEY from settings');
  }
} catch (e) {
  // Settings file may not exist, that's OK
}
```

**改进点**：
- ✅ 在 worker 启动时设置，所有子进程自动继承
- ✅ 自动清理 URL 格式问题（/messages 后缀、尾部斜杠）
- ✅ 详细日志记录便于调试

#### 1.3 用户配置示例

用户在 `~/.claude-mem/settings.json` 中配置:

```json
{
  "MEM_ANTHROPIC_BASE_URL": "https://api.anthropic.com",
  "MEM_ANTHROPIC_AUTH_TOKEN": "sk-ant-api03-xxxxx"
}
```

---

### ✅ 2. 中文支持（上游已内置 Mode 系统）

**目的**: 让 claude-mem 的观察和总结输出使用中文。

**当前实现**（v9.0.1 后）:

上游在 PR #412 中引入了 **Mode 系统**（支持继承和多语言），我们之前的硬编码 `prompts-zh.ts` 方案已被更优雅的配置系统取代。

#### 2.1 中文 Mode 配置

**文件**: `plugin/modes/code--zh.json`

完整的中文提示词配置，包含：
- 系统身份定义
- 观察者角色说明
- 记录焦点指导
- XML 输出格式
- 进度总结提示词

#### 2.2 Mode 选择配置

**文件**: `src/shared/SettingsDefaultsManager.ts`（第 40, 87 行）

```typescript
export interface SettingsDefaults {
  CLAUDE_MEM_MODE: string;
}

private static readonly DEFAULTS: SettingsDefaults = {
  CLAUDE_MEM_MODE: 'code--zh', // 默认使用中文模式
};
```

**注意**: 上游默认模式是 `code`（英文），我们 fork 的默认值改为 `code--zh`（中文）。

#### 2.3 可用语言模式

```bash
plugin/modes/
├── code.json             # 英文（上游默认）
├── code--zh.json         # 简体中文（我们的默认）
├── code--ja.json         # 日语
├── code--ko.json         # 韩语
├── code--fr.json         # 法语
├── code--de.json         # 德语
└── ... (30+ 语言)
```

#### 2.4 用户配置示例

用户在 `~/.claude-mem/settings.json` 中配置:

```json
{
  "CLAUDE_MEM_MODE": "code--zh"
}
```

---

## 未来同步策略

### 合并冲突处理

1. **配置项冲突** (`SettingsDefaultsManager.ts`):
   - 保留 `MEM_ANTHROPIC_BASE_URL` 和 `MEM_ANTHROPIC_AUTH_TOKEN`
   - 确保 `CLAUDE_MEM_MODE` 默认值为 `code--zh`

2. **Worker 服务冲突** (`worker-service.ts`):
   - 保留 API 环境变量注入逻辑（`--daemon` 分支）
   - 确保在 worker 启动时设置 `process.env.ANTHROPIC_*`

3. **构建产物冲突** (`plugin/scripts/*.js`):
   - 始终接受上游版本
   - 重新构建以应用源码改动：`npm run build-and-sync`

### 定期检查

- 上游是否改动了 Mode 系统架构
- 上游是否改动了 worker 启动流程
- 上游 `code--zh.json` 是否有翻译更新（我们可以跟进）

---

## 废弃的实现（v9.0.0 前）

以下文件/方法在 Mode 系统引入后已不再需要：

- ❌ `src/sdk/prompts-zh.ts` - 被 `plugin/modes/code--zh.json` 取代
- ❌ `src/sdk/prompts.ts` 中的 `getPrompts()` 函数 - Mode 系统直接读取配置
- ❌ `SDKAgent.getContentLanguage()` - 改用 `CLAUDE_MEM_MODE` 配置

---

## 构建和测试

```bash
# 完整构建和同步
npm run build-and-sync

# 验证 API 配置
cat ~/.claude-mem/settings.json | grep MEM_ANTHROPIC

# 验证中文模式
cat ~/.claude-mem/settings.json | grep CLAUDE_MEM_MODE

# 检查 worker 日志
tail -f ~/.claude-mem/logs/worker-*.log | grep ANTHROPIC
```
