from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import and_, or_, func, false
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment


selector = Blueprint("selector", __name__)


@selector.route("/api/select/classes", methods=["POST"])
@login_required
def select_classes():
    data = request.get_json() or {}

    filters = data.get("filters", {})
    sort_by = data.get("sort", "name_asc")

    query = Class.query.filter(Class.user_id == current_user.user_id)

    # -------------------------
    # STATUS FILTER
    # -------------------------
    status = filters.get("status")
    if status == "in_progress":
        query = query.filter(Class.is_finished.is_(False))
    elif status == "finished":
        query = query.filter(Class.is_finished.is_(True))

    # -------------------------
    # IMPORTANCE FILTER
    # -------------------------
    importance = filters.get("importance")

    if importance is not None:
        if len(importance) == 0:
            # Explicit "show nothing"
            query = query.filter(false())
        else:
            # Include NULL if "none" is selected
            if "none" in importance:
                query = query.filter(
                    (Class.importance.in_([i for i in importance if i != "none"]))
                    | (Class.importance.is_(None))
                )
            else:
                query = query.filter(Class.importance.in_(importance))

    # -------------------------
    # CLASS TYPE FILTER
    # -------------------------
    class_types = filters.get("class_types")

    if class_types is not None:
        if len(class_types) == 0:
            query = query.filter(false())
        else:
            query = query.filter(Class.class_type.in_(class_types))

    # -------------------------
    # SORTING
    # -------------------------
    sort_map = {
        "name_asc": Class.class_name.asc(),
        "name_desc": Class.class_name.desc(),
        "importance_high_low": Class.importance.desc().nullslast(),
        "importance_low_high": Class.importance.asc().nullslast(),
        "difficulty_high_low": Class.difficulty.desc().nullslast(),
        "difficulty_low_high": Class.difficulty.asc().nullslast(),
        "grade_high_low": Class.grade.desc().nullslast(),
        "grade_low_high": Class.grade.asc().nullslast(),
        "created_newest": Class.created_at.desc(),
        "created_oldest": Class.created_at.asc(),
    }

    query = query.order_by(sort_map.get(sort_by, Class.class_name.asc()))

    classes = query.all()

    return jsonify({
        "classes": [
            {
                "class_id": c.class_id,
                "name": c.class_name,
                "importance": c.importance,
                "type": c.class_type,
                "finished": c.is_finished,
                "grade": float(c.grade) if c.grade is not None else None,
                "created_at": c.created_at.isoformat(),
                "assignments_count": c.total_assignments
            }
            for c in classes
        ]
    }), 200



@selector.route("/api/select/assignments", methods=["POST"])
@login_required
def select_assignments():
    data = request.get_json() or {}

    filters = data.get("filters", {})
    sort_by = data.get("sort", "name_asc")
    layout = data.get("layout", "per_class")

    query = Assignment.query.filter(
        Assignment.user_id == current_user.user_id
    )

    now = datetime.now(timezone.utc)

    # -------------------------
    # DUE STATUS FILTER
    # -------------------------
    due_status = filters.get("due_status", "all")
    if due_status == "overdue":
        query = query.filter(
            Assignment.due_at.isnot(None),
            Assignment.due_at < now,
            Assignment.is_completed.is_(False)
        )
    elif due_status == "not_due":
        query = query.filter(
            or_(
                Assignment.due_at.is_(None),
                Assignment.due_at >= now
            )
        )

    # -------------------------
    # COMPLETION FILTER
    # -------------------------
    completion = filters.get("completion", "all")
    if completion == "completed":
        query = query.filter(Assignment.is_completed.is_(True))
    elif completion == "uncompleted":
        query = query.filter(Assignment.is_completed.is_(False))

    # -------------------------
    # GRADED FILTER
    # -------------------------
    graded = filters.get("graded", "all")
    if graded == "graded":
        query = query.filter(Assignment.is_graded.is_(True))
    elif graded == "ungraded":
        query = query.filter(Assignment.is_graded.is_(False))

    # -------------------------
    # CREATED FILTER
    # -------------------------
    created = filters.get("created", "all")
    if created == "last_7_days":
        query = query.filter(Assignment.created_at >= now - timedelta(days=7))
    elif created == "last_30_days":
        query = query.filter(Assignment.created_at >= now - timedelta(days=30))

    # -------------------------
    # ASSIGNMENT TYPE FILTER
    # -------------------------
    assignment_types = filters.get("assignment_types", [])
    if assignment_types:
        query = query.filter(Assignment.assignment_type.in_(assignment_types))

    # -------------------------
    # SORTING
    # -------------------------
    sort_map = {
        "name_asc": Assignment.title.asc(),
        "name_desc": Assignment.title.desc(),
        "difficulty_high_low": Assignment.difficulty.desc().nullslast(),
        "difficulty_low_high": Assignment.difficulty.asc().nullslast(),
        "grade_high_low": Assignment.grade.desc().nullslast(),
        "grade_low_high": Assignment.grade.asc().nullslast(),
        "due_date_soonest": Assignment.due_at.asc().nullslast(),
        "due_date_latest": Assignment.due_at.desc().nullslast(),
        "created_newest": Assignment.created_at.desc(),
        "created_oldest": Assignment.created_at.asc(),
        "ponderation_high_low": Assignment.ponderation.desc().nullslast(),
        "ponderation_low_high": Assignment.ponderation.asc().nullslast(),
        "estimated_minutes_high_low": Assignment.estimated_minutes.desc().nullslast(),
        "estimated_minutes_low_high": Assignment.estimated_minutes.asc().nullslast(),
    }

    query = query.order_by(sort_map.get(sort_by, Assignment.title.asc()))

    assignments = query.all()
    if layout == "single":
        return jsonify({
            "layout": "single",
            "assignments": [
                {
                    "assignment_id": a.assignment_id,
                    "title": a.title,
                    "class_id": a.class_id,
                    "due_at": a.due_at.isoformat() if a.due_at else None,
                    "completed": a.is_completed,
                    "graded": a.is_graded,
                    "difficulty": a.difficulty
                }
                for a in assignments
            ]
        }), 200
    
    classes_map = {}

    for a in assignments:
        cls = a.class_
        if cls.class_id not in classes_map:
            classes_map[cls.class_id] = {
                "class_id": cls.class_id,
                "name": cls.class_name,
                "assignments": []
            }

        classes_map[cls.class_id]["assignments"].append({
            "assignment_id": a.assignment_id,
            "title": a.title,
            "due_at": a.due_at.isoformat() if a.due_at else None,
            "completed": a.is_completed,
            "graded": a.is_graded,
            "difficulty": a.difficulty
        })

    return jsonify({
        "layout": "per_class",
        "classes": list(classes_map.values())
    }), 200





