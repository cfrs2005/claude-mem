<h1 align="center">
  <br><img width="3552" height="1806" alt="mem-cn" src="https://github.com/user-attachments/assets/c7b28526-4e30-471b-9060-aace5d9916bb" />

  <a href="https://github.com/cfrs2005/claude-mem">
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

---

## 系统要求

- **Node.js**: 18.0.0 或更高版本
- **Claude Code**: 最新版本且支持插件
- **Bun**: JavaScript 运行时和进程管理器（如果缺少会自动安装）
- **uv**: Python 包管理器（如果缺少会自动安装）
- **SQLite 3**: 用于持久化存储（已包含）

---

## 许可证

本项目采用 **GNU Affero General Public License v3.0** (AGPL-3.0) 许可。

版权所有 (C) 2025 Alex Newman (@thedotmack)。保留所有权利。

详见 [LICENSE](LICENSE) 文件。


---

**由 Claude Agent SDK 构建** | **由 Claude Code 驱动** | **用 TypeScript 编写**
