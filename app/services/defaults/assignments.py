
# ---------- ASSIGNMENT TYPES ----------
ASSIGNMENT_TYPES = [
    "homework",
    "quiz",
    "project",
    "writing",
    "test",
    "exam",
    "lab_report",
    "presentation",
    "reading",
    "other",
]

# ---------- ASSIGNMENT COLORS ----------
ASSIGNMENT_TYPE_COLORS = {
    "homework": "#2421eb",
    "quiz": "#22f50b",
    "project": "#0975f0",
    "writing": "#365a04",
    "test": "#ef8644",
    "exam": "#ef4444",
    "lab_report": "#00ffe1",
    "presentation": "#630101",
    "reading": "#ffff00",
    "other": "#7c800a",
}

# ---------- FILTER VALUES ----------
DUE_STATUS_FILTERS = ["all", "overdue", "not_due"]
COMPLETION_FILTERS = ["all", "completed", "uncompleted"]
GRADED_FILTERS = ["all", "graded", "ungraded"]
CREATED_FILTERS = ["all", "last_7_days", "last_30_days"]

# ---------- RISK ----------
RISK_FILTER_MODES = ["none", "under", "over"]
ASSIGNMENT_PREF_PAGES = {"assignments", "calendar"}

DEFAULT_RISK_THRESHOLD = None
