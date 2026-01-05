export const translations: Record<string, string> = {
    // Status
    "Loading": "加载中",
    "Saving": "正在保存",
    "Error": "异常",
    "Preview for:": "当前预览项目：",

    // Actions
    "Save": "保存设置",
    "Close": "关闭",
    "All": "全选",
    "None": "清空",
    "View": "查看详情",

    // Labels
    "Settings": "系统设置",
    "Observations": "记忆碎片", // More poetic/tech "Memory Fragments" or keep "观察记录" (Observations). Let's stick to professional: "观察记录" -> "记忆语料" or just "观察记录" is fine. User wants "Pro". "记忆语料" (Memory Corpus) is good but might deviate. Let's use "观察记录" but make others better.
    // Actually "Observations" in this context is the core entity. "洞察记录" (Insights)?
    // Let's go with "观察记录" (Standard) or "记忆单元" (Memory Units). Stick to "观察记录" for safety but upgrade context.
    "Observations": "观察记录",
    "Sessions": "会话列表",
    "Filters": "筛选维度",
    "Display": "视图配置",
    "Advanced": "高级选项",

    // Summary Sections
    "Investigated": "问题调研",
    "Learned": "知识沉淀",
    "Completed": "执行结果",
    "Next Steps": "后续规划",
    "Session Summary": "会话摘要",

    // Observation Metadata
    "facts": "关键事实",
    "narrative": "过程叙述",
    "read": "读取",
    "modified": "变更",

    // Observation Types
    "bugfix": "故障修复",
    "feature": "功能开发",
    "refactor": "代码重构",
    "change": "逻辑变更",
    "discovery": "技术探索",
    "decision": "架构决策",

    // Concepts
    "how-it-works": "工作原理",
    "why-it-exists": "设计动机",
    "what-changed": "变更详情",
    "problem-solution": "解决方案",
    "gotcha": "避坑指南",
    "pattern": "设计模式",
    "trade-off": "方案权衡",

    // Misc
    "Loading more...": "正在加载更多...",
    "Loading preview...": "终端预览加载中...",
    "No observations found": "暂无观察记录",
    "Session": "会话 ID",
    "Worker Port": "后台服务端口",
    "AI Provider": "AI 服务商",
    "Claude Model": "Claude 模型版本",
    "Full Observations": "完整详情展示",
    "Token Economics": "Token 开销分析",
    "Read cost": "读取成本",
    "Work investment": "构建投入",
    "Savings": "节省效能"
};

export function t(key: string): string {
    return translations[key] || key;
}
