<h1 align="center">
  <br>
  <a href="https://github.com/thedotmack/claude-mem">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/thedotmack/claude-mem/main/docs/public/claude-mem-logo-for-dark-mode.webp">
      <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/thedotmack/claude-mem/main/docs/public/claude-mem-logo-for-light-mode.webp">
      <img src="https://raw.githubusercontent.com/thedotmack/claude-mem/main/docs/public/claude-mem-logo-for-light-mode.webp" alt="Claude-Mem" width="400">
    </picture>
  </a>
  <br>
</h1>

<h4 align="center">Claude-Mem 中文本地化 - 为 <a href="https://claude.com/claude-code" target="_blank">Claude Code</a> 构建的持久化内存压缩系统（中文版）。</h4>

<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-AGPL%203.0-blue.svg" alt="License">
  </a>
  <a href="package.json">
    <img src="https://img.shields.io/badge/version-7.4.0-green.svg" alt="Version">
  </a>
  <a href="package.json">
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
  </a>
</p>

<br>

## 快速开始

在 Claude Code 中运行以下命令安装：

```
> /plugin marketplace add thedotmack/claude-mem

> /plugin install claude-mem
```

重启 Claude Code。上一个会话的上下文将自动出现在新会话中。

**关键特性：**

- 🧠 **持久化内存** - 跨会话保留上下文
- 📊 **渐进式信息披露** - 分层内存检索，显示令牌成本
- 🔍 **技能搜索** - 使用 mem-search 技能查询项目历史
- 🖥️ **网页查看器 UI** - 实时内存流在 http://localhost:37777
- 💻 **Claude Desktop 技能** - 在 Claude Desktop 对话中搜索内存
- 🔒 **隐私控制** - 使用 `<private>` 标签排除敏感内容
- ⚙️ **上下文配置** - 微调控制注入的上下文
- 🤖 **自动运行** - 无需手动干预
- 🌍 **多语言支持** - 支持中文生成的观察和总结

---

## 中文本地化实现总结

### 功能概述

Claude-Mem 现已支持**完整的中文本地化**，包括：

✅ **UI 界面中文化** - 所有菜单标签、按钮和设置说明都支持中文
✅ **AI 内容生成中文化** - 系统自动生成的观察（Observations）和会话总结（Summaries）支持中文
✅ **语言动态切换** - 在高级设置中选择中文（中文）或英文（English）
✅ **设置持久化** - 语言偏好保存到 `~/.claude-mem/settings.json`

### 实现细节

#### 1. **UI 本地化框架** (`src/ui/viewer/`)
- 使用 React Context 实现 i18n（国际化）
- 创建了 `I18nProvider` 上下文提供者
- 在所有 UI 组件中使用 `useI18n()` 获取翻译
- 翻译文件：
  - `src/ui/viewer/locales/en.json` - 英文翻译
  - `src/ui/viewer/locales/zh.json` - 中文翻译

#### 2. **AI 内容生成本地化** (`src/sdk/`)
- **双语提示词系统**：
  - `src/sdk/prompts.ts` - 英文提示词
  - `src/sdk/prompts-zh.ts` - 中文提示词（新增）
  - `getPrompts(language)` 函数根据语言返回对应的提示词生成器

- **提示词涵盖**：
  - `buildInitPrompt()` - 初始化会话提示词
  - `buildObservationPrompt()` - 生成观察提示词
  - `buildSummaryPrompt()` - 生成总结提示词
  - `buildContinuationPrompt()` - 会话延续提示词

#### 3. **设置管理系统** (`src/ui/viewer/hooks/`)
- **设置接口更新**：
  - `src/ui/viewer/types.ts` - 新增 `CLAUDE_MEM_CONTENT_LANGUAGE` 字段
  - `src/ui/viewer/constants/settings.ts` - 默认值 `'en'`

- **设置 Hook 完整支持**：
  - `src/ui/viewer/hooks/useSettings.ts` 在以下位置添加语言设置支持：
    - ✓ 从 API 读取语言偏好（初始化时）
    - ✓ 保存语言偏好到 `~/.claude-mem/settings.json`（用户更改时）

- **设置对话框集成**：
  - `src/ui/viewer/components/ContextSettingsModal.tsx` 中添加语言选择下拉菜单
  - 位置：高级设置区段（Worker Host 之后）
  - 提供两个选项："English" 和 "中文"

#### 4. **Worker 服务集成** (`src/services/worker/`)
- `src/services/worker/SDKAgent.ts`：
  - `getContentLanguage()` 方法读取 `~/.claude-mem/settings.json` 的语言设置
  - `createMessageGenerator()` 根据语言调用 `getPrompts(language)` 获取对应的提示词
  - 系统在生成观察和总结时，自动使用用户选择的语言

#### 5. **全局设置管理** (`src/shared/`)
- `src/shared/SettingsDefaultsManager.ts`：
  - 为 `CLAUDE_MEM_CONTENT_LANGUAGE` 定义类型（可选字符串）
  - 设置默认值为 `'en'`（英文）

### 关键文件改动汇总

| 文件 | 改动 | 目的 |
|------|------|------|
| `src/ui/viewer/types.ts` | 添加 `CLAUDE_MEM_CONTENT_LANGUAGE?: string` | TypeScript 类型定义 |
| `src/ui/viewer/constants/settings.ts` | 添加 `CLAUDE_MEM_CONTENT_LANGUAGE: 'en'` | 默认值 |
| `src/ui/viewer/hooks/useSettings.ts` | 添加读取和保存语言设置的逻辑 | 设置持久化 |
| `src/sdk/prompts.ts` | 新增 `getPrompts(language)` 函数 | 语言选择器 |
| `src/sdk/prompts-zh.ts` | 新建中文提示词文件 | 中文生成支持 |
| `src/services/worker/SDKAgent.ts` | 集成 `getContentLanguage()` 和语言选择 | Worker 语言支持 |
| `src/shared/SettingsDefaultsManager.ts` | 新增语言字段和默认值 | 全局设置管理 |
| `src/ui/viewer/components/ContextSettingsModal.tsx` | 添加语言选择下拉菜单 | UI 语言控制 |
| `src/ui/viewer/locales/en.json` | 添加语言相关翻译 | UI 翻译 |
| `src/ui/viewer/locales/zh.json` | 添加语言相关翻译 | 中文 UI |

### 工作流程

```
用户在 UI 设置中选择 "中文"
     ↓
useSettings Hook 保存到 ~/.claude-mem/settings.json
     ↓
Worker 启动时读取语言设置
     ↓
getContentLanguage() 返回 'zh'
     ↓
getPrompts('zh') 返回中文提示词函数
     ↓
观察和总结生成为中文 🇨🇳
```

### 测试验证

1. **UI 语言切换**：访问 http://localhost:37777 → 高级设置 → 内容语言 → 选择"中文"→ 确认保存
2. **设置持久化**：运行 `cat ~/.claude-mem/settings.json | grep CLAUDE_MEM_CONTENT_LANGUAGE` 确认 `"zh"` 已保存
3. **内容生成**：新建会话，观察生成的观察和总结应该为中文

### 技术亮点

- ✅ **非侵入式设计** - 保持核心系统不变，通过参数化语言支持
- ✅ **完全解耦** - UI 本地化和内容生成本地化独立实现
- ✅ **零损耗切换** - 用户可随时在中英文之间切换
- ✅ **向后兼容** - 默认英文，现有用户无需配置
- ✅ **可扩展性** - 添加新语言只需创建新的提示词文件和翻译文件

---

## 文档

📚 **[完整文档](docs/)** - 浏览 GitHub 上的 Markdown 文档

💻 **本地预览**：运行 Mintlify 文档：

```bash
cd docs/public
npx mintlify dev
```

### 快速开始

- **[安装指南](https://docs.claude-mem.ai/installation)** - 快速开始和高级安装
- **[使用指南](https://docs.claude-mem.ai/usage/getting-started)** - Claude-Mem 自动运行方式
- **[搜索工具](https://docs.claude-mem.ai/usage/search-tools)** - 使用自然语言查询项目历史

### 架构

- **[概述](https://docs.claude-mem.ai/architecture/overview)** - 系统组件和数据流
- **[Hooks 架构](https://docs.claude-mem.ai/hooks-architecture)** - Claude-Mem 如何使用生命周期钩子
- **[Worker 服务](https://docs.claude-mem.ai/architecture/worker-service)** - HTTP API 和 Bun 管理
- **[数据库](https://docs.claude-mem.ai/architecture/database)** - SQLite 架构和 FTS5 搜索

---

## 开发和编译

### 安装依赖

克隆项目并安装依赖：

```bash
git clone https://github.com/thedotmack/claude-mem.git
cd claude-mem
npm install
```

**常见问题：npm install 网络问题**

如果遇到 npm 缓存权限错误：

```bash
# 清除 npm 缓存
npm cache clean --force

# 重试安装
npm install
```

### 编译和构建

构建所有 TypeScript 代码、React UI 和 Worker 服务：

```bash
npm run build
```

输出文件位置：
- `plugin/` - 构建的插件文件
- `plugin/scripts/` - 编译后的 Hook 脚本（`*-hook.js`）
- `plugin/ui/viewer.html` - React UI 构建文件
- `plugin/ui/viewer-bundle.js` - React 包文件

### 同步到本地插件目录

构建后，同步到 Claude Code 的本地插件目录：

```bash
npm run sync-marketplace
```

这会复制文件到：
- macOS/Linux: `~/.claude/plugins/marketplaces/thedotmack/claude-mem/`
- Windows: `%USERPROFILE%\.claude\plugins\marketplaces\thedotmack\claude-mem\`

### 重启 Worker 服务

更改代码后，需要重启 Worker 服务让更改生效：

```bash
npm run worker:restart
```

查看 Worker 日志：

```bash
npm run worker:logs
```

### 完整工作流（推荐）

一个命令完成构建、同步和重启：

```bash
npm run build-and-sync
```

这相当于：
1. ✅ `npm run build` - 编译所有代码
2. ✅ `npm run sync-marketplace` - 同步到插件目录
3. ✅ `npm run worker:restart` - 自动重启 Worker

---

## 故障排除

### Worker 服务未启动

症状：http://localhost:37777 无法访问

解决方案：

```bash
# 重启 Worker
npm run worker:restart

# 检查 Worker 状态
npm run worker:status

# 查看 Worker 日志找出错误
npm run worker:logs
```

### 中文本地化未生效

如果修改了中文相关代码，需要：

1. **重新编译**：
   ```bash
   npm run build
   ```

2. **同步到插件目录**：
   ```bash
   npm run sync-marketplace
   ```

3. **重启 Worker**：
   ```bash
   npm run worker:restart
   ```

4. **清除浏览器缓存**（可选）：
   - 打开 http://localhost:37777
   - 按 F12 打开开发者工具
   - 清除缓存或硬刷新 (Ctrl+Shift+R)

### 设置未保存到 settings.json

检查 UI Hook 的 useSettings 是否正确读写语言设置字段：

```bash
# 查看当前设置
cat ~/.claude-mem/settings.json | grep CLAUDE_MEM_CONTENT_LANGUAGE

# 应该看到：
# "CLAUDE_MEM_CONTENT_LANGUAGE": "zh"  (如果选了中文)
# 或
# "CLAUDE_MEM_CONTENT_LANGUAGE": "en"  (如果选了英文)
```

---

## 系统要求

- **Node.js**: 18.0.0 或更高版本
- **Claude Code**: 最新版本且支持插件
- **Bun**: JavaScript 运行时和进程管理器（如果缺少会自动安装）
- **uv**: Python 包管理器（如果缺少会自动安装）
- **SQLite 3**: 用于持久化存储（已包含）

---

## 贡献

欢迎贡献！请：

1. Fork 本仓库
2. 创建功能分支
3. 进行更改并添加测试
4. 更新文档
5. 提交 Pull Request

更多详见 [开发指南](https://docs.claude-mem.ai/development)。

---

## 许可证

本项目采用 **GNU Affero General Public License v3.0** (AGPL-3.0) 许可。

版权所有 (C) 2025 Alex Newman (@thedotmack)。保留所有权利。

详见 [LICENSE](LICENSE) 文件。

---

## 支持

- **文档**: [docs/](docs/)
- **问题**: [GitHub Issues](https://github.com/thedotmack/claude-mem/issues)
- **仓库**: [github.com/thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)
- **作者**: Alex Newman ([@thedotmack](https://github.com/thedotmack))

---

**由 Claude Agent SDK 构建** | **由 Claude Code 驱动** | **用 TypeScript 编写**
