"""
routes/calendar/calendar_page_routes.py

Role: Serve the calendar HTML page. This is intentionally the thinnest
      possible route file.

What it does:
  - One route: GET /calendar
  - Authenticates user
  - Reads user.timezone and user.created_at
  - Passes these as Jinja context (NOT event data — events come via API)
  - Renders and returns calendar/calendar.html

What it must NEVER do:
  - Query assignments, sessions, or classes
  - Apply any calendar business logic
  - Return JSON
  - Compute date ranges

Why timezone + created_at are baked into HTML:
  These are configuration values, not event data. The frontend needs
  them immediately to initialize state before making its first event fetch.
  Injecting them into data attributes avoids an extra round-trip.
"""

from flask import Blueprint, render_template
from flask_login import current_user, login_required

calendar = Blueprint("calendar", __name__)


@calendar.route("/calendar")
@login_required
def enter():
    return render_template(
        "calendar/calendar.html",
        user_timezone=current_user.timezone or "UTC",
        user_created_at=current_user.created_at.isoformat(),
    )