"""
services/calendar/calendar_event_factory.py

Pure transformer. Converts a single projection dict into a fully formed
CalendarEvent dict. NO database calls. NO side effects. NO filters.

This is the contract between the backend pipeline and the frontend.
Every object the frontend ever renders passes through this function.
"""
from datetime import timezone

# Default colors when no user preference exists.
# Matches the frontend constants.js for consistency.
DEFAULT_ASSIGNMENT_COLORS = {
    "homework":     "#2421eb",
    "quiz":         "#16a34a",
    "project":      "#0975f0",
    "writing":      "#365a04",
    "test":         "#ef8644",
    "exam":         "#ef4444",
    "lab_report":   "#00ffe1",
    "presentation": "#630101",
    "reading":      "#d97706",
    "other":        "#7c800a",
}

DEFAULT_CLASS_COLOR = "#6366f1"

def _to_utc_iso(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")

def build(projection: dict) -> dict:
    """
    Convert a single projection object into a fully formed CalendarEvent dict.

    A projection is an intermediate dict produced by calendar_projection_service.
    It contains the raw timestamp, entity metadata, and lifecycle type.

    Returns a CalendarEvent dict matching the frontend contract exactly.
    """
    entity_type    = projection["entity_type"]
    lifecycle_type = projection["lifecycle_type"]
    source_id      = projection["source_id"]

    event_id   = f"{entity_type}_{source_id}_{lifecycle_type}"
    event_type = f"{entity_type}_{lifecycle_type}"

    # Convert datetimes to UTC ISO strings for the API
    start = projection["start"]
    end   = projection.get("end")

    start_iso = _to_utc_iso(start)
    end_iso   = _to_utc_iso(end)

    return {
        "id":             event_id,
        "type":           event_type,
        "title":          projection["title"],
        "start":          start_iso,
        "end":            end_iso,
        "all_day":        projection.get("all_day", False),
        "editable":       _compute_editable(entity_type, lifecycle_type),
        "draggable":      False,  # permission service finalizes this
        "color":          _compute_color(projection),
        "source_id":      source_id,
        "entity_type":    entity_type,
        "lifecycle_type": lifecycle_type,
        "metadata":       projection.get("metadata", {}),
    }


# ─────────────────────────────────────────────────────────────
# PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────

def _compute_color(projection: dict) -> str:
    """
    Color hierarchy:
    1. User's custom color for this type (from user_assignment_type_colors)
    2. Default system color for this type
    3. Class color (for class events)
    4. Fallback indigo
    """
    # User custom color takes highest priority
    user_color = projection.get("user_color")
    if user_color:
        return user_color

    entity_type = projection["entity_type"]
    metadata    = projection.get("metadata", {})

    if entity_type in ("assignment", "study_session"):
        type_key = metadata.get("assignment_type") or metadata.get("session_type")
        return DEFAULT_ASSIGNMENT_COLORS.get(type_key, DEFAULT_CLASS_COLOR)

    if entity_type == "class":
        return metadata.get("class_color", DEFAULT_CLASS_COLOR)

    return DEFAULT_CLASS_COLOR


def _compute_editable(entity_type: str, lifecycle_type: str) -> bool:
    """
    Editable = clicking this event can open an edit modal.

    Non-editable lifecycles are historical facts: created, finished,
    completed, cancelled, active. Class events are never editable from
    the calendar (they have their own page).

    Phase 4 wires the edit button to the actual modal.
    For MVP, editable is set but the button does nothing yet.
    """
    if entity_type == "class":
        return False

    non_editable = {"created", "finished", "completed", "cancelled", "active"}
    return lifecycle_type not in non_editable