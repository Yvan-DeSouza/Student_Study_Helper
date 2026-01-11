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

    for cls in classes:
        class_age = now - cls.created_at

        graded_count = (
            db.session.query(Assignment)
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.grade.isnot(None)
            )
            .count()
        )

        reasons = []
        if graded_count < cfg.min_graded_assignments_per_class:
            reasons.append(
                f"Only {graded_count} graded assignments (need {cfg.min_graded_assignments_per_class})"
            )

        if class_age < cfg.min_class_age:
            weeks = class_age.days // 7
            reasons.append(
                f"Class is {weeks} weeks old (need 3 weeks)"
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

    chart_eligible = len(eligible_classes) >= cfg.min_classes

    return {
        "eligible": chart_eligible,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "requirements": {
            "min_classes": cfg.min_classes,
            "min_graded_assignments_per_class": cfg.min_graded_assignments_per_class,
            "min_class_age_weeks": 3
        }
    }
