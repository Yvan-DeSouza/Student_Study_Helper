from flask import request, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.routes.preferences import preferences
from app.models.user import AssignmentViewPreferences

from app.services.defaults.assignments import (
    ASSIGNMENT_TYPES,
    DEFAULT_RISK_THRESHOLD,
)

@preferences.route("/api/preferences/assignments", methods=["GET"])
@login_required
def get_assignment_preferences():
    pref = AssignmentViewPreferences.query.filter_by(
        user_id=current_user.user_id
    ).first()

    if not pref:
        return jsonify({
            "filter_assignment_types": ASSIGNMENT_TYPES,
            "risk_filter_mode": "none",
            "risk_threshold": DEFAULT_RISK_THRESHOLD,
        })

    return jsonify({
        "due_status_filter": pref.due_status_filter,
        "completion_filter": pref.completion_filter,
        "graded_filter": pref.graded_filter,
        "created_filter": pref.created_filter,
        "filter_assignment_types": pref.filter_assignment_types,
        "sort_by": pref.sort_by,
        "table_layout": pref.table_layout,
        "risk_filter_mode": pref.risk_filter_mode,
        "risk_threshold": pref.risk_threshold,
    })


@preferences.route("/api/preferences/assignments", methods=["PUT"])
@login_required
def save_assignment_preferences():
    data = request.get_json()

    pref = AssignmentViewPreferences.query.filter_by(
        user_id=current_user.user_id
    ).first()

    if not pref:
        pref = AssignmentViewPreferences(user_id=current_user.user_id)
        db.session.add(pref)

    pref.due_status_filter = data.get("due_status_filter", pref.due_status_filter)
    pref.completion_filter = data.get("completion_filter", pref.completion_filter)
    pref.graded_filter = data.get("graded_filter", pref.graded_filter)
    pref.created_filter = data.get("created_filter", pref.created_filter)
    pref.sort_by = data.get("sort_by", pref.sort_by)
    pref.table_layout = data.get("table_layout", pref.table_layout)
    pref.filter_assignment_types = data.get(
        "filter_assignment_types",
        pref.filter_assignment_types
    )

    pref.risk_filter_mode = data.get("risk_filter_mode", "none")
    pref.risk_threshold = data.get("risk_threshold", DEFAULT_RISK_THRESHOLD)

    db.session.commit()
    return jsonify({"success": True})
