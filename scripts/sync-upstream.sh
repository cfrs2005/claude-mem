#!/bin/bash
# ============================================================================
# sync-upstream.sh
# 一键同步上游代码并重新应用定制
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================"
echo "  上游同步脚本"
echo "============================================"
echo ""

# 检查工作区状态
check_workspace() {
    log_info "检查工作区状态..."

    if [[ -n $(git status --porcelain) ]]; then
        log_error "工作区有未提交的更改，请先提交或暂存"
        git status --short
        exit 1
    fi

    log_success "工作区干净"
}

# 检查 upstream remote
check_upstream() {
    log_info "检查 upstream remote..."

    if ! git remote | grep -q "upstream"; then
        log_info "添加 upstream remote..."
        git remote add upstream https://github.com/thedotmack/claude-mem.git
    fi

    log_success "upstream remote 已配置"
}

# 同步上游
sync_upstream() {
    log_info "获取上游最新代码..."
    git fetch upstream

    log_info "重置到上游 main 分支..."
    git reset --hard upstream/main

    log_success "已同步到上游最新版本"
}

# 应用定制
apply_customizations() {
    log_info "应用定制功能..."
    bash "$PROJECT_ROOT/scripts/apply-customizations.sh"
}

# 构建验证
build_verify() {
    log_info "构建验证..."
    npm run build

    log_success "构建成功"
}

# 主函数
main() {
    check_workspace
    check_upstream
    echo ""

    sync_upstream
    echo ""

    apply_customizations
    echo ""

    build_verify
    echo ""

    log_success "同步完成！"
    log_warn "请检查后执行: git push --force"
}

main "$@"
