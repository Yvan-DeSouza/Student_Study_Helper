"""
Single route: POST /api/assignments/columns

Responsibilities:
    - Auth + input validation
    - Fetch + normalize assignments
    - Orchestrate eligibility → column states → row building
    - Serialize to JSON

Does NOT:
    - Contain analytics logic
    - Decide eligibility rules
    - Know about computation internals
"""

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
    # Fetch assignments (preserve order from selector)
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
    # Pass `now` so that time-relative fields (days_until_due) are computed.
    # -------------------------
    visible_assignment_dicts = [
        a.to_analytics_dict(now=now)
        for a in ordered_assignments
    ]
    # -------------------------
    # Fetch ALL assignments for eligibility (GLOBAL)
    # -------------------------
    all_assignments = (
        Assignment.query
        .filter(Assignment.user_id == current_user.user_id)
        .all()
    )

    all_assignment_dicts = [
        a.to_analytics_dict(now=now)
        for a in all_assignments
    ]


    # -------------------------
    # User-level eligibility (runs once, gates advanced columns)
    # -------------------------
    eligibility_results = compute_all_eligibility(
        assignments=all_assignment_dicts,
        now=now,
    )

    # -------------------------
    # User column preferences (what the user has toggled on/off)
    # -------------------------
    pref_rows = ShownAssignmentColumn.query.filter_by(
        user_id=current_user.user_id,
        page_name=page,
    ).all()

    user_column_prefs = {
        r.column_key: r.is_shown
        for r in pref_rows
    }

    # -------------------------
    # Resolve column states (visible / locked / hidden)
    # -------------------------
    column_states = resolve_column_states(
        page_name=page,
        user_column_prefs=user_column_prefs,
        eligibility_results=eligibility_results,
    )

    # -------------------------
    # Build rows (assignment-level eligibility + computation live here)
    # -------------------------
    rows = []
    for a_obj, a_dict in zip(ordered_assignments, visible_assignment_dicts):
        row = {
            "assignment_id": a_dict["assignment_id"],
            "class_id": a_obj.class_id,  # Add class_id to row
            **build_assignment_row(
                assignment=a_dict,
                all_assignments=visible_assignment_dicts,
                column_states=column_states,
                eligibility_results=eligibility_results,
                now=now,
            ),
        }
        
        # Add _meta object with complete assignment data for modals/interactions
        row["_meta"] = {
            "title": a_obj.title,
            "assignment_type": a_obj.assignment_type,
            "class": a_obj.class_.class_name if a_obj.class_ else "",
            "class_id": a_obj.class_id,
            "due_at": a_obj.due_at.isoformat() if a_obj.due_at else None,
            "finished_at": a_obj.finished_at.isoformat() if a_obj.finished_at else None,
            "is_completed": a_obj.is_completed,
            "is_graded": a_obj.is_graded,
            "grade": float(a_obj.grade) if a_obj.grade is not None else None,
            "ponderation": a_obj.ponderation,
            "pass_grade": float(a_obj.pass_grade) if a_obj.pass_grade is not None else None,
            "expected_grade": float(a_obj.expected_grade) if a_obj.expected_grade is not None else None,
            "difficulty": a_obj.difficulty,
            "estimated_minutes": a_obj.estimated_minutes,
        }
        
        rows.append(row)

    # -------------------------
    # Column metadata for the frontend
    # -------------------------
    columns = [
        {
            "key": state.key,
            "label": state.label,
            "visible": state.visible,
            "locked": state.locked,
            "display_mode": state.display_mode.value,
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


@assignment_columns.route("/api/assignments/columns/eligibility", methods=["GET"])
@login_required
def get_column_eligibility():
    """
    Returns column eligibility information without requiring assignment IDs.
    Used by frontend to check if advanced columns are unlocked.
    """
    page = request.args.get("page", "assignments")
    now = datetime.now(timezone.utc)
    
    # Fetch ALL assignments for eligibility computation
    all_assignments = (
        Assignment.query
        .filter(Assignment.user_id == current_user.user_id)
        .all()
    )
    
    all_assignment_dicts = [
        a.to_analytics_dict(now=now)
        for a in all_assignments
    ]
    
    # Compute user-level eligibility
    eligibility_results = compute_all_eligibility(
        assignments=all_assignment_dicts,
        now=now,
    )
    
    # Get user column preferences
    pref_rows = ShownAssignmentColumn.query.filter_by(
        user_id=current_user.user_id,
        page_name=page,
    ).all()
    
    user_column_prefs = {
        r.column_key: r.is_shown
        for r in pref_rows
    }
    
    # Resolve column states
    column_states = resolve_column_states(
        page_name=page,
        user_column_prefs=user_column_prefs,
        eligibility_results=eligibility_results,
    )
    
    # Return column metadata (just the states, no rows)
    columns = [
        {
            "key": state.key,
            "label": state.label,
            "visible": state.visible,
            "locked": state.locked,
            "display_mode": state.display_mode.value,
            "sortable": state.sortable,
            "filterable": state.filterable,
            "selectable": state.selectable,
            "lock_reason": (
                state.lock_reason.__dict__
                if state.lock_reason else None
            ),
        }
        for state in column_states.values()
    ]
    
    return jsonify({
        "columns": columns
    }), 200