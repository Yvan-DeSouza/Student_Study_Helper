"""
services/calendar/calendar_permission_service.py

Decides, for each CalendarEvent, whether it can be dragged or edited.
This is the AUTHORITATIVE source for permission rules. The frontend
reflects these values but the server always re-validates on mutation.

MVP: draggable is always False (Phase 6 implements drag).
The permission logic is written and ready — just uncomment it in Phase 6.
"""


def attach_permissions(events: list, user_id: int) -> list:
    """
    Set draggable and editable flags on each CalendarEvent in-place.
    Called by calendar_service after factory builds the events.

    Args:
        events:  list of CalendarEvent dicts (already built by factory)
        user_id: current user's ID (reserved for future ownership checks)

    Returns:
        The same list with draggable flags updated.
    """
    for event in events:
        event["draggable"] = _is_draggable(event)
        # editable was set in factory; permission service can override if needed
    return events


def validate_draggable(event: dict) -> bool:
    """
    Server-side draggable validation for PATCH /move endpoint.
    Called by calendar_update_service. ALWAYS authoritative.
    The frontend cannot override this.
    """
    return _is_draggable(event)


# ─────────────────────────────────────────────────────────────
# PRIVATE
# ─────────────────────────────────────────────────────────────

def _is_draggable(event: dict) -> bool:
    """
    Draggable rules (from architecture spec):
      - assignment + due + not completed    → True
      - study_session + scheduled + not active/completed/cancelled → True
      - Everything else                     → False

    MVP: Returns False always (drag is Phase 6).
    Phase 6: Delete the `return False` line below and uncomment the logic.
    """
    # ── MVP: drag disabled ───────────────────────────────────
    return False

    # ── Phase 6: uncomment this block ────────────────────────
    # entity_type    = event.get("entity_type")
    # lifecycle_type = event.get("lifecycle_type")
    # metadata       = event.get("metadata", {})
    #
    # if entity_type == "assignment" and lifecycle_type == "due":
    #     return not metadata.get("is_completed", False)
    #
    # if entity_type == "study_session" and lifecycle_type == "scheduled":
    #     return not (
    #         metadata.get("is_completed", False) or
    #         metadata.get("is_active", False) or
    #         metadata.get("is_cancelled", False)
    #     )
    #
    # return False