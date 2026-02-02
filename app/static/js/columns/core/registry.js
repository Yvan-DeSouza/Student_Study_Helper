export const COLUMN_RENDER_REGISTRY = {
    title: { align: "left", width: "2fr", format: "text" },
    assignment_type: { align: "center", width: "1fr", format: "badge" },
    class: { align: "left", width: "1fr", format: "text" },
    due_at: { align: "right", width: "1fr", format: "text" },
    is_completed: { align: "center", width: "1fr", format: "badge" },
    grade: { align: "right", width: "1fr", format: "number" },
    is_graded: { align: "center", width: "1fr", format: "badge" },

    ponderation: { align: "right", width: "1fr", format: "number" },
    pass_grade: { align: "right", width: "1fr", format: "number" },
    difficulty: { align: "center", width: "1fr", format: "badge" },
    expected_grade: { align: "right", width: "1fr", format: "number" },
    finished_at: { align: "right", width: "1fr", format: "text" },
    estimated_minutes: { align: "right", width: "1fr", format: "number" },

    study_minutes: { align: "right", width: "1fr", format: "number" },
    study_session_count: { align: "right", width: "1fr", format: "number" },
    days_until_due: { align: "right", width: "1fr", format: "number" },

    risk_score: { align: "center", width: "1fr", format: "badge" },
    effort_efficiency: { align: "center", width: "1fr", format: "badge" },
    volatility: { align: "center", width: "1fr", format: "badge" },
    deadline_sensitivity: { align: "center", width: "1fr", format: "badge" },
    predictability_confidence: { align: "center", width: "1fr", format: "badge" },
};

export function getRenderHints(columnKey) {
    return COLUMN_RENDER_REGISTRY[columnKey] || {
        align: "left",
        width: "1fr",
        format: "text",
    };
}
