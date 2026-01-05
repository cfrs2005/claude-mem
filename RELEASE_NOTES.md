# Release v8.6.0 (中文本地化特别版)

本版本基于官方 `thedotmack/claude-mem` v8.5.9（包含原版最近 ~200 次架构改进与修复）进行**硬分叉 (Hard Fork)**，旨在解决国内开发者使用 Claude Code 的核心痛点。

## 🚀 相对于官方版的关键修复与改进

### 1. 修复：API 端点硬编码 (解锁 GLM-4.7/FoxCode)
- **痛点**：官方版将 Anthropic API 地址写死在代码中，导致国内用户无法使用 **智谱 GLM-4.7**、**FoxCode** 等兼容 Anthropic 协议的高性价模型。
- **解决方案**：重构了 `SDKAgent.ts` 和 `worker-service.ts` 的底层连接逻辑，支持从 `settings.json` 读取自定义配置。
- **新增变量**：
    - `MEM_ANTHROPIC_BASE_URL`: 自定义 API 基础地址（如 `https://open.bigmodel.cn/api/anthropic`）。
    - `MEM_ANTHROPIC_AUTH_TOKEN`: 自定义 API Key（透传给 SDK，解决部分中转服务鉴权问题）。

### 2. 修复：全英文界面认知门槛
- **痛点**：原版 Summary、Observation、Settings 等核心界面均为英文，非母语用户使用这类高频记忆工具时存在认知摩擦。
- **解决方案**：
    - **构建 i18n 引擎**：新增 `src/ui/viewer/utils/i18n.ts` 轻量级翻译模块。
    - **全界面汉化**：覆盖设置面板、状态卡片、Loading 提示等所有交互触点。
    - **信达雅校对**：拒绝机翻，采用互联网术语（如 "Investigated" -> "问题调研"、"Learned" -> "知识沉淀"、"Gotcha" -> "避坑指南"）。

### 3. 修复：非母语 Prompt 导致的水土不服
- **痛点**：默认 System Prompt 强制要求英文输出，且思维链逻辑偏西方语境。
- **解决方案**：将 `code--zh` 设为默认模式，重写系统提示词，强制 AI 使用中文进行思考、总结和日志记录，输出内容更符合中文开发者习惯。

## 🏗 上游基石 (v8.5.9)
本版本完美继承了官方仓库的所有架构升级于特性（截止 commit `f1ccc22`）：
- **模块化架构**：服务解耦，提升稳定性 (PR #534, #538)。
- **错误处理增强**：Worker 服务拥有了更完善的日志捕获机制 (#528)。
- **IDE 集成**：原生支持 Cursor IDE Hooks (v8.5.0+)。
- **时间感知**：上下文头部增加时间戳支持 (v8.5.9)。

## 🛠 配置指南 (GLM-4.7 示例)
```json
// ~/.claude-mem/settings.json
{
  "MEM_ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
  "MEM_ANTHROPIC_AUTH_TOKEN": "your-api-key",
  "CLAUDE_MEM_MODE": "code--zh",
  "CLAUDE_MEM_MODEL": "GLM-4.7"
}
```

## 📦 安装与升级
```bash
git clone https://github.com/cfrs2005/claude-mem.git
cd claude-mem
npm install
npm run build-and-sync
```

## 🔄 Upstream
Based on `thedotmack/claude-mem` v8.5.9.
