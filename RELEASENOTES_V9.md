# Release Notes - v9.0.0 (Claude-Mem Fork)

哥，咱们的克隆版正式同步到了 **v9.0.0**！这不仅仅是一个版本号的跳跃，更是一次架构层面的“降维打击”。

## 🚀 核心升级：Live Context System

上游主干引入了全新的 **分布式上下文系统**，彻底改变了记忆的组织方式：
- **目录级 CLAUDE.md**：每个文件夹现在都会自动生成 `CLAUDE.md`，内含针对该目录的开发活动时间轴。
- **Activity Timelines**：通过表格清晰展示修改记录、Token 消耗以及任务标题，让 Claude 对项目现状的感知效率提升数倍。
- **Worktree 原生支持**：完美支持 git worktree，不同工作树之间的记忆互不干扰。

## 🛠️ 我们的深度定制 (Fork Exclusives)

在同步 v9.0.0 的同时，我确保了我们所有核心“品味”的完美传承：
- **中文原力 (Chinese Prompts)**：全套指令集（包含最新的 Live Context 指令）已完成高质量中文化，SDK Agent 现在用母语为您精准记录。
- **API 自由 (Custom Endpoints)**：保留了对 `MEM_ANTHROPIC_BASE_URL` 的支持，您可以继续在墙内或使用中转 API 丝滑运行。
- **Session 隔离保护**：延续了我们独特的 Session ID 架构，确保对话记忆的绝对纯净，避免了主干在某些极端情况下的 Resume 冲突。

## 🔧 稳定性修复与重构
- **架构解耦**：从单体 Worker 重构为模块化域服务（SQLite, Context, Search 彻底分离）。
- **TTY 输出修复**：解决了 v9.0.0 默认重定向导致终端“失语”的问题，现在的 Observation 反馈实时可见。
- **Windows 兼容增强**：修复了 PowerShell 转义和 Bun 路径检测。

---

> [!TIP]
> 哥，升级后建议跑一下 `npm run build-and-sync` 以确保所有新 hook（如 `context-hook`）正确加载，新版分布式上下文依赖它们来生成 `CLAUDE.md`。
