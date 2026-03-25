"""
app/services/calendar/calendar_filters.py

Apply visibility filters to a list of CalendarEvents.
Pure function — receives a list and a config dict, returns a filtered list.

The filter config mirrors what the frontend sends in the "filters" query param.
"""


def apply(events: list, filters: dict) -> list:
    """
    Filter CalendarEvents by user preferences.

    Args:
        events:  list of CalendarEvent dicts (fully built, permissions attached)
        filters: dict with one or more of these keys:
            show_assignments     (bool)      — toggle all assignment events
            show_sessions        (bool)      — toggle all study session events
            show_classes         (bool)      — toggle all class events
            assignment_lifecycle (list[str]) — e.g. ["due", "created"]
            session_states       (list[str]) — e.g. ["scheduled", "completed"]
            assignment_types     (list[str]) — e.g. ["homework", "exam"]

    Returns:
        Filtered list (same objects, not copies).
    """
    if not filters:
        return events

    return [e for e in events if _passes(e, filters)]


def _passes(event: dict, filters: dict) -> bool:
    entity_type    = event.get("entity_type", "")
    lifecycle_type = event.get("lifecycle_type", "")
    metadata       = event.get("metadata", {})

    # ── Entity type toggles ───────────────────────────────────
    if entity_type == "assignment"    and filters.get("show_assignments") is False:
        return False
    if entity_type == "study_session" and filters.get("show_sessions") is False:
        return False
    if entity_type == "class"         and filters.get("show_classes") is False:
        return False

    # ── Assignment lifecycle ──────────────────────────────────
    allowed_lifecycle = filters.get("assignment_lifecycle")
    if allowed_lifecycle is not None and entity_type == "assignment":
        if lifecycle_type not in allowed_lifecycle:
            return False

    # ── Session state ─────────────────────────────────────────
    allowed_states = filters.get("session_states")
    if allowed_states is not None and entity_type == "study_session":
        if lifecycle_type not in allowed_states:
            return False

    # ── Assignment type ───────────────────────────────────────
    allowed_types = filters.get("assignment_types")
    if allowed_types is not None and entity_type == "assignment":
        at = metadata.get("assignment_type")
        if at and at not in allowed_types:
            return False

    return True