"""
app/services/calendar/calendar_permission_service.py

Authoritative source for draggability / editability flags.
"""


def attach_permissions(events: list, user_id: int) -> list:
    for event in events:
        event["draggable"] = _is_draggable(event)
    return events


def validate_draggable(event: dict) -> bool:
    """Server-side re-check before executing a drag save."""
    return _is_draggable(event)


def _is_draggable(event: dict) -> bool:
    entity_type    = event.get("entity_type")
    lifecycle_type = event.get("lifecycle_type")
    metadata       = event.get("metadata", {})

    # Incomplete assignment due dates are draggable
    if entity_type == "assignment" and lifecycle_type == "due":
        return not metadata.get("is_completed", False)

    # Scheduled sessions that haven't started / ended / been cancelled
    if entity_type == "study_session" and lifecycle_type == "scheduled":
        return not (
            metadata.get("is_completed", False) or
            metadata.get("is_active",    False) or
            metadata.get("is_cancelled", False)
        )

    return False