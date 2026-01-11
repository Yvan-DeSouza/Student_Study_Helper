from datetime import datetime, timezone
from app.models.course import Class
from app.models.assignment import Assignment
from app.extensions import db
from .chart_requirements import CHART_REQUIREMENTS


def get_rolling_grade_trend_eligibility(user_id):
    cfg = CHART_REQUIREMENTS["rolling_grade_trend"]["requirements"]

    classes = (
        db.session.query(Class)
        .filter(Class.user_id == user_id)
        .all()
    )

    now = datetime.now(timezone.utc)

    eligible_classes = []
    ineligible_classes = []

    max_graded_assignments = 0
    earliest_graded_date = None

    for cls in classes:
        graded_assignments = (
            db.session.query(Assignment)
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.grade.isnot(None),
                Assignment.finished_at.isnot(None)
            )
            .all()
        )

        graded_count = len(graded_assignments)
        max_graded_assignments = max(max_graded_assignments, graded_count)

        if graded_assignments:
            class_earliest = min(a.finished_at for a in graded_assignments)
            if not earliest_graded_date or class_earliest < earliest_graded_date:
                earliest_graded_date = class_earliest

        reasons = []

        if graded_count < cfg.min_graded_assignments_per_class:
            reasons.append(
                f"Only {graded_count} graded assignments (need {cfg.min_graded_assignments_per_class})"
            )

        if graded_assignments:
            weeks_since = (now - earliest_graded_date).days // 7
            if weeks_since < cfg.min_weeks_since_first_grade:
                reasons.append(
                    f"Earliest graded assignment is {weeks_since} weeks old (need {cfg.min_weeks_since_first_grade})"
                )

        if reasons:
            ineligible_classes.append({
                "class_id": cls.class_id,
                "class_name": cls.class_name,
                "reasons": reasons
            })
        else:
            eligible_classes.append({
                "class_id": cls.class_id,
                "class_name": cls.class_name
            })

    weeks_since_first_grade = (
        (now - earliest_graded_date).days // 7
        if earliest_graded_date else 0
    )

    progress = {
        "classes": {
            "current": len(classes),
            "required": cfg.min_classes
        },
        "graded_assignments": {
            "current": max_graded_assignments,
            "required": cfg.min_graded_assignments_per_class
        },
        "weeks_since_first_grade": {
            "current": weeks_since_first_grade,
            "required": cfg.min_weeks_since_first_grade
        }
    }

    eligible = (
        progress["classes"]["current"] >= progress["classes"]["required"]
        and progress["graded_assignments"]["current"] >= progress["graded_assignments"]["required"]
        and progress["weeks_since_first_grade"]["current"] >= progress["weeks_since_first_grade"]["required"]
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes
    }
