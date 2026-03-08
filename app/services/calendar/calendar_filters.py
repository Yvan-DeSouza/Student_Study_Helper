"""
services/calendar/calendar_filters.py

Apply visibility filters to an already-built list of CalendarEvents.
Pure function: receives a list and filter config, returns a filtered list.

MVP: Pass-through — no filters active yet.
Phase 5: Implement all filter dimensions. The pipeline slot is already
         wired in calendar_service.py so no structural changes needed.
"""


def apply(events: list, filters: dict) -> list:
    """
    Filter CalendarEvents by user preferences.

    Args:
        events:  list of CalendarEvent dicts (fully built, permissions attached)
        filters: dict with filter configuration (see Phase 5 spec)

    Returns:
        Filtered list (same objects, not copies)

    Phase 5 filter dimensions to implement:
        show_assignments (bool)  — toggle all assignment events
        show_sessions    (bool)  — toggle all study session events
        show_classes     (bool)  — toggle all class events
        assignment_lifecycle (list[str]) — e.g. ["due", "created"]
        session_states   (list[str])     — e.g. ["scheduled", "completed"]
        assignment_types (list[str])     — reuse assignment_view_preferences
        class_types      (list[str])     — reuse class_view_preferences
    """
    if not filters:
        return events

    # ── Phase 5: implement filter dimensions here ─────────────
    # result = []
    # for event in events:
    #     if not _passes_filters(event, filters):
    #         continue
    #     result.append(event)
    # return result

    return events


# ── Phase 5: uncomment and complete ──────────────────────────
# def _passes_filters(event: dict, filters: dict) -> bool:
#     entity_type    = event["entity_type"]
#     lifecycle_type = event["lifecycle_type"]
#
#     if entity_type == "assignment" and not filters.get("show_assignments", True):
#         return False
#     if entity_type == "study_session" and not filters.get("show_sessions", True):
#         return False
#     if entity_type == "class" and not filters.get("show_classes", True):
#         return False
#
#     allowed_lifecycles = filters.get("assignment_lifecycle")
#     if allowed_lifecycles and entity_type == "assignment":
#         if lifecycle_type not in allowed_lifecycles:
#             return False
#
#     allowed_states = filters.get("session_states")
#     if allowed_states and entity_type == "study_session":
#         if lifecycle_type not in allowed_states:
#             return False
#
#     allowed_assignment_types = filters.get("assignment_types")
#     if allowed_assignment_types and entity_type == "assignment":
#         at = event.get("metadata", {}).get("assignment_type")
#         if at and at not in allowed_assignment_types:
#             return False
#
#     return True