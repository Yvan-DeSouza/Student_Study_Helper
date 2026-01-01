from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.user import (
    ClassViewPreferences,
    AssignmentViewPreferences
)
preferences = Blueprint("preferences", __name__)
@preferences.route("/api/preferences/classes", methods=["GET"])
@login_required
def get_class_preferences():
    pref = ClassViewPreferences.query.filter_by(
        user_id=current_user.user_id,
        page_name="classes"
    ).first()

    if not pref:
        return jsonify(None), 200

    return jsonify({
        "page_name": pref.page_name,
        "sort_by": pref.sort_by,
        "status_filter": pref.status_filter,
        "filter_importance": {
            "high": pref.filter_importance_high,
            "medium": pref.filter_importance_medium,
            "low": pref.filter_importance_low,
        },
        "filter_class_types": pref.filter_class_types
    })

@preferences.route("/api/preferences/classes", methods=["PUT"])
@login_required
def save_class_preferences():
    data = request.get_json()

    pref = ClassViewPreferences.query.filter_by(
        user_id=current_user.user_id,
        page_name="classes"
    ).first()

    if not pref:
        pref = ClassViewPreferences(
            user_id=current_user.user_id,
            page_name="classes"
        )
        db.session.add(pref)

    pref.sort_by = data.get("sort_by", pref.sort_by)
    pref.status_filter = data.get("status_filter", pref.status_filter)

    importance = data.get("filter_importance", {})
    pref.filter_importance_high = importance.get("high", True)
    pref.filter_importance_medium = importance.get("medium", True)
    pref.filter_importance_low = importance.get("low", True)

    pref.filter_class_types = data.get("filter_class_types", pref.filter_class_types)

    db.session.commit()

    return jsonify({"success": True}), 200


@preferences.route("/api/preferences/assignments", methods=["GET"])
@login_required
def get_assignment_preferences():
    pref = AssignmentViewPreferences.query.filter_by(
        user_id=current_user.user_id
    ).first()

    if not pref:
        return jsonify(None), 200

    return jsonify({
        "due_status_filter": pref.due_status_filter,
        "completion_filter": pref.completion_filter,
        "graded_filter": pref.graded_filter,
        "created_filter": pref.created_filter,
        "filter_assignment_types": pref.filter_assignment_types,
        "sort_by": pref.sort_by,
        "table_layout": pref.table_layout
    })



@preferences.route("/api/preferences/assignments", methods=["PUT"])
@login_required
def save_assignment_preferences():
    data = request.get_json()

    pref = AssignmentViewPreferences.query.filter_by(
        user_id=current_user.user_id
    ).first()

    if not pref:
        pref = AssignmentViewPreferences(
            user_id=current_user.user_id
        )
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

    db.session.commit()

    return jsonify({"success": True}), 200
