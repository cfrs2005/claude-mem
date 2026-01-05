export const translations: Record<string, string> = {
    // Status
    "Loading": "加载中",
    "Saving": "保存中",
    "Error": "错误",
    "Preview for:": "预览项目：",

    // Actions
    "Save": "保存",
    "Close": "关闭",
    "All": "全选",
    "None": "清空",
    "View": "查看",

    // Labels
    "Settings": "设置",
    "Observations": "观察记录",
    "Sessions": "会话",
    "Filters": "筛选",
    "Display": "显示设置",
    "Advanced": "高级选项",

    // Summary Sections
    "Investigated": "已调查",
    "Learned": "已习得",
    "Completed": "已完成",
    "Next Steps": "下一步",
    "Session Summary": "会话总结",

    // Observation Metadata
    "facts": "事实",
    "narrative": "叙述",
    "read": "读取",
    "modified": "修改",

    // Observation Types
    "bugfix": "修复",
    "feature": "功能",
    "refactor": "重构",
    "change": "变更",
    "discovery": "探索",
    "decision": "决策",

    // Concepts
    "how-it-works": "原理",
    "why-it-exists": "缘由",
    "what-changed": "变更点",
    "problem-solution": "方案",
    "gotcha": "注意",
    "pattern": "模式",
    "trade-off": "权衡",

    // Misc
    "Loading more...": "加载更多...",
    "Loading preview...": "加载预览中...",
    "No observations found": "暂无观察记录",
    "Session": "会话",
    "Worker Port": "后台服务端口",
    "AI Provider": "AI 提供商",
    "Claude Model": "Claude 模型",
    "Full Observations": "完整观察详情",
    "Token Economics": "Token 统计",
    "Read cost": "读取消耗",
    "Work investment": "生成消耗",
    "Savings": "节省量"
};

export function t(key: string): string {
    return translations[key] || key;
}
