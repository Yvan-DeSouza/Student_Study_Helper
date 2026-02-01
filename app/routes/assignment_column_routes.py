from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timezone

from app.models.assignment import Assignment

from app.services.analytics.column_orchestration.column_state_resolver import (
    resolve_column_states,
)
from app.services.analytics.column_orchestration.assignment_row_builder import (
    build_assignment_row,
)
from app.services.analytics.column_eligibility import compute_all_eligibility
from app.models.user import ShownAssignmentColumn


assignment_columns = Blueprint("assignment_columns", __name__)

@assignment_columns.route("/api/assignments/columns", methods=["POST"])
@login_required
def build_assignment_columns():
    data = request.get_json() or {}

    assignment_ids = data.get("assignment_ids")
    page = data.get("page", "assignments")
    now = data.get("now")

    if not assignment_ids:
        return jsonify({"error": "assignment_ids is required"}), 400

    now = (
        datetime.fromisoformat(now)
        if now
        else datetime.now(timezone.utc)
    )

    # -------------------------
    # Fetch assignments (preserve order)
    # -------------------------
    assignments = (
        Assignment.query
        .filter(
            Assignment.user_id == current_user.user_id,
            Assignment.assignment_id.in_(assignment_ids),
        )
        .all()
    )

    assignment_map = {a.assignment_id: a for a in assignments}
    ordered_assignments = [
        assignment_map[a_id]
        for a_id in assignment_ids
        if a_id in assignment_map
    ]

    # -------------------------
    # Normalize assignment dicts
    # -------------------------
    assignment_dicts = [
        a.to_analytics_dict()
        for a in ordered_assignments
    ]

    # -------------------------
    # Eligibility (USER + ASSIGNMENT)
    # -------------------------
    eligibility_results = compute_all_eligibility(
        assignments=assignment_dicts,
        now=now,
    )

    # -------------------------
    # User column preferences
    # -------------------------

    rows = ShownAssignmentColumn.query.filter_by(
        user_id=current_user.user_id,
        page_name=page,
    ).all()

    user_column_prefs = {
        r.column_key: r.is_shown
        for r in rows
    }


    # -------------------------
    # Resolve column states
    # -------------------------
    column_states = resolve_column_states(
        page_name=page,
        user_column_prefs=user_column_prefs,
        eligibility_results=eligibility_results,
    )

    # -------------------------
    # Build rows
    # -------------------------
    rows = [
        {
            "assignment_id": a["assignment_id"],
            **build_assignment_row(
                assignment=a,
                all_assignments=assignment_dicts,
                column_states=column_states,
                eligibility_results=eligibility_results,
                now=now,
            ),
        }
        for a in assignment_dicts
    ]

    # -------------------------
    # Column metadata
    # -------------------------
    columns = [
        {
            "key": state.key,
            "label": state.label,
            "visible": state.visible,
            "locked": state.locked,
            "sortable": state.sortable,
            "filterable": state.filterable,
            "selectable": state.selectable,
            "lock_reason": (
                state.lock_reason.__dict__
                if state.lock_reason else None
            ),
        }
        for state in column_states.values()
        if state.visible
    ]

    return jsonify({
        "columns": columns,
        "rows": rows,
    }), 200
