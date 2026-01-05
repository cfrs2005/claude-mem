# Release v8.6.0 (Chinese Localization Edition)

This release introduces comprehensive Chinese localization and support for custom API endpoints, specifically optimized for **Zhipu GLM-4.7**.

## 🌟 Key Features

### 1. 🇨🇳 Deep Chinese Localization
- **Full UI Translation**: Settings, Summary Cards, Observation Feeds, and Loading states are fully translated into professional Chinese.
- **Terminology Polish**: Used native/professional terms (e.g., "知识沉淀", "问题调研") instead of machine translation.
- **Optimized Prompts**: `code--zh` mode is now the default, with system prompts tuned for Chinese context.

### 2. 🔌 Custom API & Model Support
- **Flexible Configuration**: Support for custom `MEM_ANTHROPIC_BASE_URL` in `~/.claude-mem/settings.json`.
- **GLM-4.7 Support**: Verified compatibility with Zhipu AI's GLM-4.7 model (via Anthropic API protocol).

### 3. 🛠 Configuration
- Added detailed configuration guide in `README.md`.
- Default mode set to `code--zh`.

## 📦 Installation
```bash
git clone https://github.com/cfrs2005/claude-mem.git
cd claude-mem
npm install
npm run build-and-sync
```

## 🔄 Upstream
Based on `thedotmack/claude-mem` v8.5.9.
