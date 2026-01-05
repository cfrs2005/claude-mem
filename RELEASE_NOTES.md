# Release v8.6.0 (Chinese Localization Edition)

This release is a **hard fork** based on the official `thedotmack/claude-mem` v8.5.9, incorporating their recent ~200 commits of architectural improvements while solving critical localization and compatibility issues for Chinese developers.

## 🚀 Key Problems Fixed (Relative to Upstream)

### 1. Fixed: Hardcoded API Endpoints (Critical for GLM/Domestic Models)
- **Problem**: The official version hardcodes the Anthropic API URL, making it impossible to use domestic models like **Zhipu GLM-4.7** or **FoxCode** which are API-compatible but require a different `Base URL`.
- **Solution**: We refactored `SDKAgent.ts` and `worker-service.ts` to respect `MEM_ANTHROPIC_BASE_URL` from `settings.json`. This unlocks the use of affordable, high-performance domestic models.

### 2. Fixed: English-Only Interface Usability
- **Problem**: The web UI (Summary, Observations, Settings) was entirely in English, creating cognitive friction for non-native speakers.
- **Solution**: Implemented a lightweight i18n system (`src/ui/viewer/utils/i18n.ts`).
    - **Full Translation**: All labels, buttons, and status messages are now in professional Chinese.
    - **Native Terminology**: Polished terms like "问题调研" (Investigated) instead of raw translations.

### 3. Fixed: Non-Native Prompting
- **Problem**: Default system prompts enforced English output and Western logical structures.
- **Solution**: Upgraded `code--zh` mode to be the default. System prompts are re-engineered to instruct the AI to think and reply in native Chinese, improving the quality of generated summaries and logs.

## 🏗 Upstream Foundation (v8.5.9)
This release inherits all recent improvements from the official `thedotmack` repository (commits `f1ccc22` and prior), including but not limited to:
- **Modular Architecture**: Decomposed monolithic services for better stability (PR #534, #538).
- **Error Handling**: Comprehensive error logging for worker services (#528, #522).
- **Cursor Integration**: Recent support for Cursor IDE hooks (v8.5.0+).
- **Context Timestamps**: Added timestamps to context headers for better temporal awareness (v8.5.9).

## 🛠 Configuration Guide (GLM-4.7 Example)
```json
// ~/.claude-mem/settings.json
{
  "MEM_ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
  "MEM_ANTHROPIC_AUTH_TOKEN": "your-api-key",
  "CLAUDE_MEM_MODE": "code--zh",
  "CLAUDE_MEM_MODEL": "GLM-4.7"
}
```

## 📦 Installation
```bash
git clone https://github.com/cfrs2005/claude-mem.git
cd claude-mem
npm install
npm run build-and-sync
```

## 🔄 Upstream
Based on `thedotmack/claude-mem` v8.5.9.
