<h1 align="center">

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
  <br><img width="3552" height="1806" alt="mem-cn" src="https://github.com/user-attachments/assets/c7b28526-4e30-471b-9060-aace5d9916bb" />
<br>

## 使用中文版本

### 为什么要克隆这个项目？

这是 `thedotmack/claude-mem` **原版的中文本地化版本**。

**两种用法**：
- **只用中文**：装原版插件，克隆这个项目，编译同步即可
- **修改功能**：在这个项目基础上修改代码，编译同步

核心是：编译后的文件会**替代**本地已装的原版插件。

---

### 一、装好原版插件（前提）

在 Claude Code 中运行（见"快速开始"）：

```
> /plugin marketplace add thedotmack/claude-mem
> /plugin install claude-mem
```

重启 Claude Code。

---

### 二、克隆中文版项目

克隆这个项目（中文本地化版本）：

```bash
git clone https://github.com/cfrs2005/claude-mem.git
cd claude-mem
npm install
```

**npm 卡住？**

```bash
npm cache clean --force
npm install
```

---

### 三、编译并同步

一条命令完成编译、同步、重启：

```bash
npm run build-and-sync
```

这会：
1. 编译 TypeScript、React UI、Worker 服务
2. 同步到 `~/.claude/plugins/marketplaces/thedotmack/claude-mem/`
3. 自动重启 Worker 服务

编译后重启 Claude Code，就用上中文版了。

---

### 四、开发工作流

修改代码后：

```bash
# 仅编译
npm run build

# 仅同步
npm run sync-marketplace

# 仅重启 Worker
npm run worker:restart

# 查看 Worker 日志
npm run worker:logs
```

或用 `npm run build-and-sync` 一键完成。

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
