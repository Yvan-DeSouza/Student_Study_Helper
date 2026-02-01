// static/js/columns/core/registry.js

export const COLUMN_RENDER_REGISTRY = {
    title: {
        align: "left",
        width: "2fr",
        format: "text",
    },

    grade: {
        align: "right",
        width: "1fr",
        format: "number",
    },

    risk_score: {
        align: "center",
        width: "1fr",
        format: "badge",
    },

    effort_efficiency: {
        align: "center",
        width: "1fr",
        format: "badge",
    },

    days_until_due: {
        align: "right",
        width: "1fr",
        format: "number",
    },
};

export function getRenderHints(columnKey) {
    return COLUMN_RENDER_REGISTRY[columnKey] || {
        align: "left",
        width: "1fr",
        format: "text",
    };
}
