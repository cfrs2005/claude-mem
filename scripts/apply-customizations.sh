#!/bin/bash
# ============================================================================
# apply-customizations.sh
# 智能应用 fork 定制功能到上游代码
# ============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================"
echo "  Fork 定制应用脚本"
echo "============================================"
echo ""

# 检查备份文件是否存在
check_backups() {
    log_info "检查备份文件..."

    if [[ ! -f "docs/prompts-zh.ts.backup" ]]; then
        log_error "缺少 docs/prompts-zh.ts.backup"
        exit 1
    fi

    if [[ ! -f "docs/fork-customizations.md" ]]; then
        log_error "缺少 docs/fork-customizations.md"
        exit 1
    fi

    log_success "备份文件检查通过"
}

# ============================================================================
# 功能1：中文提示词
# ============================================================================

apply_chinese_prompts() {
    log_info "应用中文提示词..."

    local target="src/sdk/prompts-zh.ts"
    local backup="docs/prompts-zh.ts.backup"

    # 检查是否已存在
    if [[ -f "$target" ]]; then
        log_warn "prompts-zh.ts 已存在，跳过"
        return 0
    fi

    # 从备份恢复
    cp "$backup" "$target"
    log_success "已创建 $target"
}

# ============================================================================
# 功能2：prompts.ts 语言切换
# ============================================================================

apply_prompts_language_switch() {
    log_info "修改 prompts.ts 添加语言切换..."

    local target="src/sdk/prompts.ts"

    # 检查是否已包含中文导入
    if grep -q "prompts-zh" "$target"; then
        log_warn "prompts.ts 已包含语言切换，跳过"
        return 0
    fi

    # 在文件开头添加导入（在第一个 import 之后）
    sed -i '' "1a\\
import * as promptsZh from './prompts-zh.js';\\
\\
export type PromptLanguage = 'en' | 'zh';
" "$target"

    # 在文件末尾添加 getPrompts 函数
    cat >> "$target" << 'EOF'

/**
 * Get prompt functions based on language preference
 */
export function getPrompts(language: PromptLanguage) {
  if (language === 'zh') {
    return {
      buildInitPrompt: promptsZh.buildInitPrompt,
      buildObservationPrompt: promptsZh.buildObservationPrompt,
      buildSummaryPrompt: promptsZh.buildSummaryPrompt,
      buildContinuationPrompt: promptsZh.buildContinuationPrompt,
    };
  }
  return {
    buildInitPrompt,
    buildObservationPrompt,
    buildSummaryPrompt,
    buildContinuationPrompt,
  };
}
EOF

    log_success "已修改 $target"
}

# ============================================================================
# 功能3：SettingsDefaultsManager API 配置
# ============================================================================

apply_settings_config() {
    log_info "修改 SettingsDefaultsManager.ts 添加 API 配置..."

    local target="src/shared/SettingsDefaultsManager.ts"

    # 检查是否已包含 API 配置
    if grep -q "MEM_ANTHROPIC_BASE_URL" "$target"; then
        log_warn "SettingsDefaultsManager.ts 已包含 API 配置，跳过"
        return 0
    fi

    # 在接口中添加 API 配置项（在 CLAUDE_CODE_PATH 之后）
    sed -i '' '/CLAUDE_CODE_PATH: string;/a\
  // API Configuration (for independent API endpoint)\
  MEM_ANTHROPIC_BASE_URL: string;\
  MEM_ANTHROPIC_AUTH_TOKEN: string;
' "$target"

    # 在默认值中添加（在 CLAUDE_CODE_PATH 默认值之后）
    sed -i '' "/CLAUDE_CODE_PATH: '',/a\\
    // API Configuration (for independent API endpoint, empty = use Claude Code's default)\\
    MEM_ANTHROPIC_BASE_URL: '',\\
    MEM_ANTHROPIC_AUTH_TOKEN: '',
" "$target"

    log_success "已修改 $target"
}

# ============================================================================
# 功能4：SDKAgent API 注入
# ============================================================================

apply_sdk_agent_changes() {
    log_info "修改 SDKAgent.ts 添加 API 注入..."

    local target="src/services/worker/SDKAgent.ts"

    # 检查是否已包含 API 注入
    if grep -q "getApiEnvironment" "$target"; then
        log_warn "SDKAgent.ts 已包含 API 注入，跳过"
        return 0
    fi

    # 在文件末尾（最后一个 } 之前）添加 getApiEnvironment 方法
    # 使用 sed 在倒数第二行插入
    local method_code='
  /**
   * Get custom API environment variables from settings
   */
  private getApiEnvironment(): Record<string, string> {
    const settingsPath = path.join(homedir(), '\''.claude-mem'\'', '\''settings.json'\'');
    const settings = SettingsDefaultsManager.loadFromFile(settingsPath);
    const env: Record<string, string> = {};
    if (settings.MEM_ANTHROPIC_BASE_URL) {
      env.ANTHROPIC_BASE_URL = settings.MEM_ANTHROPIC_BASE_URL;
    }
    if (settings.MEM_ANTHROPIC_AUTH_TOKEN) {
      env.ANTHROPIC_API_KEY = settings.MEM_ANTHROPIC_AUTH_TOKEN;
    }
    return env;
  }
'

    # 在类的最后一个方法后添加（在最后的 } 之前）
    sed -i '' '/^}$/i\
'"$method_code"'
' "$target"

    log_success "已修改 $target（添加 getApiEnvironment 方法）"
    log_warn "注意：需要手动在 startSession 中调用 getApiEnvironment"
}

# ============================================================================
# 主函数
# ============================================================================

main() {
    check_backups

    log_info "开始应用定制..."
    echo ""

    # 1. 中文提示词
    apply_chinese_prompts
    echo ""

    # 2. 语言切换
    apply_prompts_language_switch
    echo ""

    # 3. API 配置
    apply_settings_config
    echo ""

    # 4. SDK Agent API 注入
    apply_sdk_agent_changes
    echo ""

    log_success "所有定制应用完成！"
    log_info "下一步：运行 npm run build 验证"
}

main "$@"
