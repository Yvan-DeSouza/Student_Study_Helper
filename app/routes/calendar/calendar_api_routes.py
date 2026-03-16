"""
app/routes/calendar/calendar_api_routes.py

All JSON API endpoints for the calendar frontend.

Phase 2+:  GET  /api/calendar/events
Phase 6:   PATCH /api/calendar/events/<event_id>/move
"""

import json
from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required

from app.services.calendar.calendar_service import get_events
from app.services.shared.time_service       import is_valid_timezone

calendar_api = Blueprint("calendar_api", __name__)


# ─────────────────────────────────────────────────────────────
# GET /api/calendar/events
# ─────────────────────────────────────────────────────────────

@calendar_api.route("/api/calendar/events", methods=["GET"])
@login_required
def get_calendar_events():
    """
    Fetch CalendarEvents for a date range.

    Query params:
      start   (required) ISO date string, e.g. "2026-01-01"
      end     (required) ISO date string, e.g. "2026-01-31"
      filters (optional) JSON-encoded filter object

    Returns:
      200: { success: true, events: [ ...CalendarEvent... ] }
      400: { success: false, error: "..." }
      500: { success: false, error: "Server error" }
    """
    start = request.args.get("start")
    end   = request.args.get("end")

    if not start or not end:
        return jsonify({"success": False, "error": "start and end params are required"}), 400

    try:
        from datetime import date
        start_date = date.fromisoformat(start)
        end_date   = date.fromisoformat(end)
    except ValueError:
        return jsonify({"success": False, "error": "Invalid date format — use YYYY-MM-DD"}), 400

    if start > end:
        return jsonify({"success": False, "error": "end must be after or equal to start"}), 400

    if (end_date - start_date).days > 366:
        return jsonify({"success": False, "error": "Date range cannot exceed 366 days"}), 400

    filters = None
    filters_str = request.args.get("filters")
    if filters_str:
        try:
            filters = json.loads(filters_str)
        except json.JSONDecodeError:
            return jsonify({"success": False, "error": "Invalid filters JSON"}), 400

    try:
        events = get_events(current_user.user_id, start, end, filters)
        return jsonify({"success": True, "events": events})
    except Exception:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Server error fetching calendar events"}), 500


# ─────────────────────────────────────────────────────────────
# PATCH /api/calendar/events/<event_id>/move  (Phase 6)
# ─────────────────────────────────────────────────────────────

@calendar_api.route("/api/calendar/events/<event_id>/move", methods=["PATCH"])
@login_required
def move_calendar_event(event_id):
    """
    Drag-and-drop repositioning of a calendar event.

    Body JSON:
      new_start  (required) local ISO datetime, e.g. "2026-01-24T09:00:00"
      new_end    (optional) local ISO datetime
      timezone   (required) IANA string, e.g. "America/New_York"

    Returns:
      200: { success: true, updated_event: { ...CalendarEvent... } }
      400: bad datetime or timezone
      403: event not draggable or not owned by user
      404: event not found
      500: server error
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "JSON body required"}), 400

    new_start    = data.get("new_start")
    new_end      = data.get("new_end")
    timezone_str = data.get("timezone")

    if not new_start or not timezone_str:
        return jsonify({"success": False, "error": "new_start and timezone are required"}), 400

    # Validate the datetime string is parseable
    try:
        from datetime import datetime
        datetime.fromisoformat(new_start)
        if new_end:
            datetime.fromisoformat(new_end)
    except ValueError:
        return jsonify({"success": False, "error": "Invalid datetime format"}), 400

    # Validate timezone
    if not is_valid_timezone(timezone_str):
        return jsonify({"success": False, "error": f"Unknown timezone: {timezone_str!r}"}), 400

    try:
        from app.services.calendar.calendar_update_service import move_event
        updated = move_event(
            event_id    = event_id,
            new_start   = new_start,
            new_end     = new_end,
            timezone_str = timezone_str,
            user_id     = current_user.user_id,
        )
        return jsonify({"success": True, "updated_event": updated})

    except LookupError as e:
        return jsonify({"success": False, "error": str(e)}), 404

    except PermissionError as e:
        return jsonify({"success": False, "error": str(e)}), 403

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Server error moving event"}), 500