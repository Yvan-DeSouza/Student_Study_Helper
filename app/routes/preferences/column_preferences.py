from flask import request, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.routes.preferences import preferences
from app.models.user import ShownAssignmentColumn


@preferences.route("/api/preferences/columns", methods=["GET"])
@login_required
def get_column_preferences():
    rows = ShownAssignmentColumn.query.filter_by(
        user_id=current_user.user_id,
        page_name="assignments"
    ).all()

    return jsonify({
        r.column_key: r.is_shown
        for r in rows
    })


@preferences.route("/api/preferences/columns", methods=["PUT"])
@login_required
def save_column_preferences():
    data = request.get_json() or {}

    for column_key, is_shown in data.items():
        row = ShownAssignmentColumn.query.filter_by(
            user_id=current_user.user_id,
            page_name="assignments",
            column_key=column_key
        ).first()

        if row:
            row.is_shown = bool(is_shown)

    db.session.commit()
    return jsonify({"success": True})
