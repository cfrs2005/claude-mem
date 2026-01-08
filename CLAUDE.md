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
