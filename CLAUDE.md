# Claude-Mem: AI Development Instructions

Claude-mem is a Claude Code plugin providing persistent memory across sessions. It captures tool usage, compresses observations using the Claude Agent SDK, and injects relevant context into future sessions.

## Architecture

**5 Lifecycle Hooks**: SessionStart → UserPromptSubmit → PostToolUse → Summary → SessionEnd

**Hooks** (`src/hooks/*.ts`) - TypeScript → ESM, built to `plugin/scripts/*-hook.js`

**Worker Service** (`src/services/worker-service.ts`) - Express API on port 37777, Bun-managed, handles AI processing asynchronously

**Database** (`src/services/sqlite/`) - SQLite3 at `~/.claude-mem/claude-mem.db`

**Search Skill** (`plugin/skills/mem-search/SKILL.md`) - HTTP API for searching past work, auto-invoked when users ask about history

**Chroma** (`src/services/sync/ChromaSync.ts`) - Vector embeddings for semantic search

**Viewer UI** (`src/ui/viewer/`) - React interface at http://localhost:37777, built to `plugin/ui/viewer.html`

## 上游合并指南

### 合并策略

**推荐**: Merge（保留完整历史）

```bash
# 1. 创建备份分支
git branch backup-before-upstream-sync-$(date +%Y%m%d-%H%M)

# 2. 获取上游更新
git fetch upstream

# 3. 合并上游
git merge upstream/main --no-ff -m "chore: sync upstream vX.X.X while preserving fork features"

# 4. 解决冲突（见下文）

# 5. 重新构建
npm run build-and-sync
```

### 常见冲突和解决

#### 1. 构建产物冲突 (`plugin/scripts/*.js`)
**策略**: 始终接受上游版本，重新构建
```bash
git checkout --theirs plugin/scripts/
git add plugin/scripts/
```

#### 2. 配置文件冲突 (`SettingsDefaultsManager.ts`)
**策略**: 保留我们的 API 配置项
- 保留: `MEM_ANTHROPIC_BASE_URL`, `MEM_ANTHROPIC_AUTH_TOKEN`
- 确保: `CLAUDE_MEM_MODE: 'code--zh'`（默认中文）

#### 3. .gitignore 冲突
**策略**: 合并双方规则
```bash
# 保留 .cursor/ .specstory/ 和上游的 ~*/ http*/ https*/
```

### Fork 特色功能维护

详见 `docs/fork-customizations.md`

**核心定制**:
1. **自定义 API 端点** (`worker-service.ts:742-769`)
   - 在 worker 启动时注入 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY`
   - 支持智谱 GLM 等兼容端点

2. **中文默认** (`SettingsDefaultsManager.ts:87`)
   - `CLAUDE_MEM_MODE: 'code--zh'`（上游默认 `code`）
   - 使用上游内置的 Mode 系统（v9.0.0+）

### 故障排查

#### Generator夯掉/Pending阻塞诊断（v9.1.0+）
**症状**: 服务夯掉，pending消息积压，observations不生成
**根因**: 未知（API超时？并发冲突？资源耗尽？）
**可观测性增强** (2026-01-09):
- ZhipuAgent日志大幅增强，包含完整时间线
- Generator生命周期: `[Zhipu] Generator STARTING/COMPLETED/ABORTED/FAILED` + 耗时
- 消息处理追踪: `Processing pending message #N | messageId=xxx | tool=xxx`
- API调用详情: `API call START/SUCCESS/FAILED` + 耗时、tokens、responseId
- 慢查询警告: 超过10秒自动警告
- 错误详情: HTTP状态码、响应体、完整堆栈

**诊断流程**:
```bash
# 1. 检查pending积压情况
sqlite3 ~/.claude-mem/claude-mem.db "SELECT status, COUNT(*) FROM pending_messages GROUP BY status;"

# 2. 查看Generator完整执行日志（含时间线）
tail -200 ~/.claude-mem/logs/claude-mem-$(date +%Y-%m-%d).log | grep -E "\[Zhipu\]"

# 3. 定位卡点：
#    - 看最后一条日志是 "Processing pending message #N" → 卡在第N条消息
#    - 看 "API call START" 但没有 SUCCESS → API调用超时/失败
#    - 看 duration=xxxms → 识别慢查询

# 4. 重启恢复
~/.claude/plugins/marketplaces/thedotmack/plugin/scripts/worker-service.cjs restart
```

**经验教训**:
- ⚠️ **日志不足 = 盲人摸象** - 问题根因需要完整时间线才能定位
- ⚠️ **不要瞎改代码** - 先用日志定位根因，再对症下药
- ⚠️ **区分症状和根因** - pending=0只是症状恢复，不代表根因解决

#### Worker 重启无响应
**症状**: Hook 触发，观察入队，但不保存
**根因**: 会话状态污染（通常因 API 错误导致 SDK 崩溃）
**解决**:
```bash
~/.claude/plugins/marketplaces/thedotmack/plugin/scripts/worker-service.cjs restart
```

**验证日志**:
```bash
tail -f ~/.claude-mem/logs/claude-mem-$(date +%Y-%m-%d).log | grep -E "(STORED|Generator failed)"
```

#### 2026-01-09 20:29 系统"挂掉"事件分析（待验证）

**用户报告**: 系统挂掉，重启后找不到挂掉时的日志

**事件时间线**（日志记录）:
```log
[20:28:44.099] [INFO] MCP server shutting down
[20:28:46.342] [INFO] → POST /api/admin/shutdown
[20:28:46.444] [INFO] Shutdown initiated
[20:28:46.894] [ERROR] Worker not available
[20:28:46.894] [ERROR] Tools will fail until Worker is started

... 46秒空窗期 ...

[20:29:32.436] [INFO] Starting worker daemon
[20:29:32.687] [INFO] Worker started {pid=89769}
[20:29:33.001] [INFO] [Zhipu] Generator STARTING (首条v9.1.0日志)
```

**AI的错误分析**（被否定）:
- 判断为"正常手动关闭"（/api/admin/shutdown）
- 认为46秒延迟是等待资源释放
- 认为日志完整存在，未丢失
- **用户反馈**: 这个分析完全不对

**待验证的真实根因**:
- ❓ 为什么会有 `/api/admin/shutdown` 调用（谁触发的？）
- ❓ 46秒空窗期发生了什么（真的是等待资源？）
- ❓ 用户感知到的"挂掉"症状具体是什么
- ❓ 重启前最后的Generator活动是什么
- ❓ 是否有pending消息积压未处理

**诊断盲区**:
- v9.1.0日志增强在20:29:33之后才生效
- 20:28:46之前的Generator活动缺乏详细时间线
- 无法确认"挂掉"时刻的最后一条API调用
- 无法确认是否有未捕获的异常或资源耗尽

**下次需要收集的信息**:
1. 用户感知到"挂掉"的具体时刻
2. 重启前是否有操作卡住不响应
3. 是否有内存/CPU异常
4. pending消息队列状态
5. Generator是否在处理长时间任务

**临时结论**:
- ✅ 日志记录了关闭和重启过程
- ❌ 但AI的根因分析被否定
- ⚠️ 真实根因待进一步诊断

#### 自定义 API 端点测试
```bash
# 测试端点可达性
curl -X POST "https://your-endpoint/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-sonnet-4-5", "max_tokens": 100, "messages": [{"role": "user", "content": "test"}]}'
```

### 关键注意事项

⚠️ **不要删除数据库** - `~/.claude-mem/claude-mem.db` 是用户财富
⚠️ **先诊断后修改** - 不要急于修改配置文件，先确认问题
⚠️ **测试 API 通断** - 自定义端点问题先验证连通性
⚠️ **检查构建产物** - 合并后必须重新构建

## Privacy Tags
- `<private>content</private>` - User-level privacy control (manual, prevents storage)

**Implementation**: Tag stripping happens at hook layer (edge processing) before data reaches worker/database. See `src/utils/tag-stripping.ts` for shared utilities.

## Build Commands

```bash
npm run build-and-sync        # Build, sync to marketplace, restart worker
```

## Configuration

Settings are managed in `~/.claude-mem/settings.json`. The file is auto-created with defaults on first run.

## File Locations

- **Source**: `<project-root>/src/`
- **Built Plugin**: `<project-root>/plugin/`
- **Installed Plugin**: `~/.claude/plugins/marketplaces/thedotmack/`
- **Database**: `~/.claude-mem/claude-mem.db`
- **Chroma**: `~/.claude-mem/chroma/`

## Requirements

- **Bun** (all platforms - auto-installed if missing)
- **uv** (all platforms - auto-installed if missing, provides Python for Chroma)
- Node.js

## Documentation

**Public Docs**: https://docs.claude-mem.ai (Mintlify)
**Source**: `docs/public/` - MDX files, edit `docs.json` for navigation
**Deploy**: Auto-deploys from GitHub on push to main

## Pro Features Architecture

Claude-mem is designed with a clean separation between open-source core functionality and optional Pro features.

**Open-Source Core** (this repository):

- All worker API endpoints on localhost:37777 remain fully open and accessible
- Pro features are headless - no proprietary UI elements in this codebase
- Pro integration points are minimal: settings for license keys, tunnel provisioning logic
- The architecture ensures Pro features extend rather than replace core functionality

**Pro Features** (coming soon, external):

- Enhanced UI (Memory Stream) connects to the same localhost:37777 endpoints as the open viewer
- Additional features like advanced filtering, timeline scrubbing, and search tools
- Access gated by license validation, not by modifying core endpoints
- Users without Pro licenses continue using the full open-source viewer UI without limitation

This architecture preserves the open-source nature of the project while enabling sustainable development through optional paid features.

## Important

No need to edit the changelog ever, it's generated automatically.

## 开发日志

### v9.1.0 诊断增强 (2026-01-09)

**背景**:
- 服务经常夯掉，pending消息积压，但日志不足以诊断根因
- 无法区分是API超时、并发冲突还是资源耗尽

**改动文件**:
1. `src/services/worker/ZhipuAgent.ts` - 大幅增强日志（150+行改动）
   - Line 82-85: Generator启动日志（sessionDbId、prompt#、timestamp）
   - Line 102-111: INIT请求发送/响应日志（耗时、tokens、responseId）
   - Line 163-166: 每条pending消息处理日志（序号、messageId、tool）
   - Line 187-196: OBSERVATION请求发送/响应日志
   - Line 254-258: Generator完成日志（总耗时、处理消息数、历史长度）
   - Line 260-285: 错误处理详细日志（ABORTED/FAILED + 耗时）
   - Line 301-369: API调用详细追踪（START/SUCCESS/FAILED、慢查询警告、HTTP错误详情）

2. `src/sdk/prompts.ts` - buildObservationPrompt添加mode参数
   - Line 91: 函数签名添加`mode: ModeConfig`
   - Line 121-130: 添加输出格式指令（recording_focus、output_format_header、observation_types）

3. `src/services/worker/SDKAgent.ts` - 同步buildObservationPrompt参数
   - Line 314: 传递mode参数

**日志增强效果**:
```log
[Zhipu] Generator STARTING | sessionDbId=12583 | prompt#=4
[Zhipu] Sending INIT request | model=glm-4.7 | historyLength=1
[Zhipu] API call START | model=glm-4.7 | messages=1
[Zhipu] API call SUCCESS | duration=7179ms | tokens=1435 | responseId=xxx
[Zhipu] Processing pending message #1 | tool=Bash
[Zhipu] OBSERVATION response received | duration=7788ms
[Zhipu] Generator COMPLETED | duration=15.2s | processedMessages=5
```

**可观测性提升**:
- ✅ 完整时间线：从Generator启动到完成的每个步骤
- ✅ 卡点定位：精确到第几条pending消息、哪个工具调用
- ✅ 性能追踪：每个API调用的耗时（含慢查询警告）
- ✅ 错误详情：HTTP状态码、响应体、堆栈（不再是"API failed"空洞日志）

**下次夯掉时可诊断**:
1. Generator是否启动？（看STARTING日志）
2. 卡在第几条消息？（看Processing pending message #N）
3. API调用耗时多久？（看duration=xxxms，是否超时？）
4. 是否有HTTP错误？（看API HTTP error日志）
5. 最后状态如何？（COMPLETED/ABORTED/FAILED？）

**经验教训**:
- 日志不足时，瞎猜代码bug只会浪费时间
- 可观测性是诊断间歇性问题的唯一路径
- "问题暂时恢复"≠"问题已解决"，需要日志追踪真相

