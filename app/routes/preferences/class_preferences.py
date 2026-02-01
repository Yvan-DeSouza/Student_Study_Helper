from flask import request, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.routes.preferences import preferences
from app.models.user import ClassViewPreferences

from app.services.defaults.classes import (
    CLASS_TYPES,
    IMPORTANCE_LEVELS,
    CLASS_PREF_PAGES,
)

@preferences.route("/api/preferences/classes", methods=["GET"])
@login_required
def get_class_preferences():
    page_name = request.args.get("page", "classes")

    if page_name not in CLASS_PREF_PAGES:
        return jsonify({"error": "Invalid page_name"}), 400

    pref = ClassViewPreferences.query.filter_by(
        user_id=current_user.user_id,
        page_name=page_name
    ).first()

    if not pref:
        return jsonify({
            "page_name": page_name,
            "sort_by": "name_asc",
            "status_filter": "all",
            "filter_importance": IMPORTANCE_LEVELS,
            "filter_class_types": CLASS_TYPES,
        })

    return jsonify({
        "page_name": pref.page_name,
        "sort_by": pref.sort_by,
        "status_filter": pref.status_filter,
        "filter_importance": pref.filter_importance,
        "filter_class_types": pref.filter_class_types,
    })


@preferences.route("/api/preferences/classes", methods=["PUT"])
@login_required
def save_class_preferences():
    data = request.get_json()
    page_name = data.get("page_name")

    if page_name not in CLASS_PREF_PAGES:
        return jsonify({"error": "Invalid page_name"}), 400

    pref = ClassViewPreferences.query.filter_by(
        user_id=current_user.user_id,
        page_name=page_name
    ).first()

    if not pref:
        pref = ClassViewPreferences(
            user_id=current_user.user_id,
            page_name=page_name
        )
        db.session.add(pref)

    pref.sort_by = data.get("sort_by", pref.sort_by)
    pref.status_filter = data.get("status_filter", pref.status_filter)
    pref.filter_importance = data.get("filter_importance", pref.filter_importance)
    pref.filter_class_types = data.get("filter_class_types", pref.filter_class_types)

    db.session.commit()
    return jsonify({"success": True})
