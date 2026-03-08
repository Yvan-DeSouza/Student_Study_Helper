"""
routes/calendar/calendar_api_routes.py

Role: Handle all JSON API requests from the calendar frontend.

MVP endpoints:
  GET  /api/calendar/events      → fetch events for a date range

Phase 6 endpoint (scaffolded):
  PATCH /api/calendar/events/<event_id>/move → drag & drop

What it must NEVER do:
  - Query models directly
  - Compute event shapes
  - Convert timezones
  - Decide whether an event is draggable
"""

import json
from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required

from app.services.calendar.calendar_service import get_events

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
      200: { success: true, events: [ ...CalendarEvent objects... ] }
      400: { success: false, error: "..." }
      401: redirected by Flask-Login
      500: { success: false, error: "Server error" }
    """
    start = request.args.get("start")
    end   = request.args.get("end")

    # ── Validate required params ──────────────────────────────
    if not start or not end:
        return jsonify({"success": False, "error": "start and end params are required"}), 400

    try:
        from datetime import date
        start_date = date.fromisoformat(start)
        end_date   = date.fromisoformat(end)
    except ValueError:
        return jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if start > end:
        return jsonify({"success": False, "error": "end must be after or equal to start"}), 400

    # Abuse guard: max 366 days per request
    delta = (end_date - start_date).days
    if delta > 366:
        return jsonify({"success": False, "error": "Date range cannot exceed 366 days"}), 400

    # ── Parse optional filters ────────────────────────────────
    filters = None
    filters_str = request.args.get("filters")
    if filters_str:
        try:
            filters = json.loads(filters_str)
        except json.JSONDecodeError:
            return jsonify({"success": False, "error": "Invalid filters JSON"}), 400

    # ── Fetch events through the pipeline ─────────────────────
    try:
        events = get_events(current_user.user_id, start, end, filters)
        return jsonify({"success": True, "events": events})
    except Exception as e:
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
    Phase 6: Handle drag-and-drop repositioning of a calendar event.

    Body JSON:
      new_start  (required) local ISO datetime string
      new_end    (optional) local ISO datetime string
      timezone   (required) IANA timezone string

    Returns:
      200: { success: true, updated_event: { ...CalendarEvent... } }
      400: bad datetime or timezone
      403: not owner or not draggable
      404: event not found
      500: server error
    """
    # ── Phase 6: uncomment and implement ─────────────────────
    # data = request.get_json()
    # if not data:
    #     return jsonify({"success": False, "error": "JSON body required"}), 400
    #
    # new_start = data.get("new_start")
    # new_end   = data.get("new_end")
    # timezone  = data.get("timezone")
    #
    # if not new_start or not timezone:
    #     return jsonify({"success": False, "error": "new_start and timezone are required"}), 400
    #
    # from app.services.shared.time_service import is_valid_timezone
    # if not is_valid_timezone(timezone):
    #     return jsonify({"success": False, "error": "Invalid timezone"}), 400
    #
    # try:
    #     from app.services.calendar.calendar_update_service import move_event
    #     updated = move_event(event_id, new_start, new_end, timezone, current_user.user_id)
    #     return jsonify({"success": True, "updated_event": updated})
    # except PermissionError:
    #     return jsonify({"success": False, "error": "Event not draggable"}), 403
    # except LookupError:
    #     return jsonify({"success": False, "error": "Event not found"}), 404
    # except Exception as e:
    #     return jsonify({"success": False, "error": "Server error"}), 500

    return jsonify({"success": False, "error": "Drag & drop not yet implemented"}), 501