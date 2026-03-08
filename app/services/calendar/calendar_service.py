"""
services/calendar/calendar_service.py

The PUBLIC entry point for all calendar data operations.
Every other calendar service is an implementation detail called only by this file.

Its job: coordinate the pipeline.
  projection → factory → permissions → filters → sort → return

What it must NEVER do:
  - Query the database directly
  - Convert timezones
  - Apply business rules
  - Know what an assignment or session is
"""

from app.services.calendar.calendar_projection_service import fetch_range
from app.services.calendar.calendar_event_factory import build
from app.services.calendar.calendar_permission_service import attach_permissions
from app.services.calendar.calendar_filters import apply as apply_filters
from app.services.shared.time_service import start_of_day, end_of_day
from app.models.user import User


def get_events(user_id: int, start_str: str, end_str: str, filters: dict = None) -> list:
    """
    Return a sorted, filtered, normalized list of CalendarEvents for the given range.

    Args:
        user_id:   authenticated user
        start_str: ISO date string for range start (e.g. "2026-01-01")
        end_str:   ISO date string for range end   (e.g. "2026-01-31")
        filters:   optional filter config dict (Phase 5)

    Returns:
        List of CalendarEvent dicts sorted by start ascending.
        This list is safe to serialize directly to JSON.
    """
    # Resolve user timezone
    user = User.query.get(user_id)
    user_timezone = (user.timezone or "UTC") if user else "UTC"

    # Convert date strings to UTC range boundaries.
    # Uses true local midnight — not UTC midnight — for correct day boundaries.
    start_utc = start_of_day(start_str, user_timezone)
    end_utc   = end_of_day(end_str, user_timezone)

    # ── 1. Fetch and expand projections ──────────────────────
    projections = fetch_range(user_id, start_utc, end_utc)

    # ── 2. Build CalendarEvent objects ────────────────────────
    events = [build(p) for p in projections]

    # ── 3. Attach permission flags ────────────────────────────
    events = attach_permissions(events, user_id)

    # ── 4. Apply visibility filters (pass-through in MVP) ─────
    if filters:
        events = apply_filters(events, filters)

    # ── 5. Sort by start ascending ────────────────────────────
    events.sort(key=lambda e: e.get("start") or "")

    return events