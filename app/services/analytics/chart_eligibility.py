# app/services/analytics/chart_eligibility.py
from datetime import datetime, timezone
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession
from app.models.user import User
from app.extensions import db
from .chart_requirements import CHART_REQUIREMENTS


# ------------------- helpers -------------------

def _weeks_since(date):
    if not date:
        return 0
    return (datetime.now(timezone.utc) - date).days // 7


def _get_earliest_graded_assignment_date(user_id):
    result = db.session.query(
        Assignment.finished_at
    ).join(Class).filter(
        Class.user_id == user_id,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).order_by(Assignment.finished_at.asc()).first()

    return result[0] if result else None


# ============================================================
# GRAPH 1 — Rolling Grade Trend (PER CLASS)
# ============================================================

def get_rolling_grade_trend_eligibility(user_id):
    cfg = CHART_REQUIREMENTS["rolling_grade_trend"]["requirements"]

    classes = (
        db.session.query(Class)
        .filter(Class.user_id == user_id)
        .all()
    )

    now = datetime.now(timezone.utc)

    class_stats = []
    eligible_classes = []
    ineligible_classes = []

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

        earliest_grade_date = (
            min(a.finished_at for a in graded_assignments)
            if graded_assignments else None
        )

        weeks_since_first_grade = (
            (now - earliest_grade_date).days // 7
            if earliest_grade_date else 0
        )

        reasons = []

        if graded_count < cfg.min_graded_assignments_per_class:
            reasons.append(
                f"Only {graded_count} graded assignments "
                f"(need {cfg.min_graded_assignments_per_class})"
            )

        if weeks_since_first_grade < cfg.min_weeks_since_first_grade:
            reasons.append(
                f"Earliest graded assignment is {weeks_since_first_grade} weeks old "
                f"(need {cfg.min_weeks_since_first_grade})"
            )

        class_stats.append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "graded_count": graded_count,
            "weeks_since_first_grade": weeks_since_first_grade,
            "earliest_grade_date": earliest_grade_date
        })

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

    # ------------------------------
    # Select representative class
    # ------------------------------
    representative = None
    if class_stats:
        representative = sorted(
            class_stats,
            key=lambda c: (
                c["earliest_grade_date"] or datetime.max.replace(tzinfo=timezone.utc),
                -c["graded_count"]
            )
        )[0]

    progress = {
        "classes": {
            "current": len(classes),
            "required": cfg.min_classes
        },
        "graded_assignments": {
            "current": representative["graded_count"] if representative else 0,
            "required": cfg.min_graded_assignments_per_class
        },
        "weeks_since_first_grade": {
            "current": representative["weeks_since_first_grade"] if representative else 0,
            "required": cfg.min_weeks_since_first_grade
        }
    }

    eligible = (
        progress["classes"]["current"] >= cfg.min_classes
        and progress["graded_assignments"]["current"] >= cfg.min_graded_assignments_per_class
        and progress["weeks_since_first_grade"]["current"] >= cfg.min_weeks_since_first_grade
        and representative is not None
    )

    return {
        "eligible": eligible,
        "progress": progress,

        "eligible_classes": eligible_classes,

        "ineligible_classes": ineligible_classes,

        "representative": {
            "class_id": representative["class_id"],
            "class_name": representative["class_name"],
            "graded_count": representative["graded_count"],
            "weeks_since_first_grade": representative["weeks_since_first_grade"]
        } if representative else None
    }





# ============================================================
# GRAPH 2 — Performance Stability Index (GLOBAL)
# ============================================================

def get_performance_stability_index_eligibility(user_id):
    cfg = CHART_REQUIREMENTS["performance_stability_index"]["requirements"]

    user = db.session.get(User, user_id)
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    total_graded_assignments = db.session.query(Assignment).join(Class).filter(
        Class.user_id == user_id,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).count()

    total_study_sessions = db.session.query(StudySession).filter(
        StudySession.user_id == user_id,
        StudySession.is_active == False,
        StudySession.is_completed == True
    ).count()


    earliest_grade_date = _get_earliest_graded_assignment_date(user_id)

    eligible = (
        len(classes) >= cfg.min_classes
        and total_graded_assignments >= cfg.min_graded_assignments
        and total_study_sessions >= cfg.min_study_sessions
        and _weeks_since(earliest_grade_date) >= cfg.min_weeks_since_first_grade
        and _weeks_since(user.created_at) >= cfg.min_weeks_since_account_creation
    )

    return {
        "eligible": eligible,
        "progress": {
            "classes": {"current": len(classes), "required": cfg.min_classes},
            "graded_assignments": {
                "current": total_graded_assignments,
                "required": cfg.min_graded_assignments
            },
            "total_study_sessions": {
                "current": total_study_sessions,
                "required": cfg.min_study_sessions
            },
            "weeks_since_first_grade": {
                "current": _weeks_since(earliest_grade_date),
                "required": cfg.min_weeks_since_first_grade
            },
            "weeks_since_account_creation": {
                "current": _weeks_since(user.created_at),
                "required": cfg.min_weeks_since_account_creation
            }
        }
    }

# ============================================================
# GRAPH 3 — Effort → Outcome Timeline (GLOBAL)
# ============================================================

def get_effort_outcome_timeline_eligibility(user_id):
    cfg = CHART_REQUIREMENTS["effort_outcome_timeline"]["requirements"]

    user = db.session.get(User, user_id)
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    total_graded_assignments = db.session.query(Assignment).join(Class).filter(
        Class.user_id == user_id,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).count()

    total_study_sessions = db.session.query(StudySession).filter(
        StudySession.user_id == user_id,
        StudySession.is_active == False,
        StudySession.is_completed == True
    ).count()

    earliest_grade_date = _get_earliest_graded_assignment_date(user_id)

    eligible = (
        len(classes) >= cfg.min_classes
        and total_graded_assignments >= cfg.min_graded_assignments
        and total_study_sessions >= cfg.min_study_sessions
        and _weeks_since(earliest_grade_date) >= cfg.min_weeks_since_first_grade
        and _weeks_since(user.created_at) >= cfg.min_weeks_since_account_creation

    )

    return {
        "eligible": eligible,
        "progress": {
            "classes": {"current": len(classes), "required": cfg.min_classes},
            "graded_assignments": {
                "current": total_graded_assignments,
                "required": cfg.min_graded_assignments
            },
            "total_study_sessions": {
                "current": total_study_sessions,
                "required": cfg.min_study_sessions
            },
            "weeks_since_first_grade": {
                "current": _weeks_since(earliest_grade_date),
                "required": cfg.min_weeks_since_first_grade
            },
            "weeks_since_account_creation": {
                "current": _weeks_since(user.created_at),
                "required": cfg.min_weeks_since_account_creation
            }
        }
    }





# ============================================================
# GRAPH 4 — Lag Correlation Heatmap (PER CLASS)
# ============================================================

def get_lag_correlation_heatmap_eligibility(user_id):
    cfg = CHART_REQUIREMENTS["lag_correlation_heatmap"]["requirements"]

    classes = (
        db.session.query(Class)
        .filter(Class.user_id == user_id)
        .all()
    )

    now = datetime.now(timezone.utc)

    eligible_classes = []
    ineligible_classes = []
    class_stats = []

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

        study_sessions = (
            db.session.query(StudySession)
            .filter(
                StudySession.class_id == cls.class_id,
                StudySession.is_completed == True,
                StudySession.session_end.isnot(None)
            )
            .all()
        )

        graded_count = len(graded_assignments)
        study_count = len(study_sessions)

        earliest_grade_date = (
            min(a.finished_at for a in graded_assignments)
            if graded_assignments else None
        )

        weeks_since_first_grade = (
            (now - earliest_grade_date).days // 7
            if earliest_grade_date else 0
        )

        reasons = []

        if graded_count < cfg.min_graded_assignments_per_class:
            reasons.append(
                f"Only {graded_count} graded assignments (need {cfg.min_graded_assignments_per_class})"
            )

        if study_count < cfg.min_study_session_per_class:
            reasons.append(
                f"Only {study_count} study sessions (need {cfg.min_study_session_per_class})"
            )

        if weeks_since_first_grade < cfg.min_weeks_since_first_grade:
            reasons.append(
                f"Earliest graded assignment is {weeks_since_first_grade} weeks old "
                f"(need {cfg.min_weeks_since_first_grade})"
            )

        class_stats.append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "graded_count": graded_count,
            "study_count": study_count,
            "weeks_since_first_grade": weeks_since_first_grade,
            "earliest_grade_date": earliest_grade_date
        })

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

    # ------------------------------
    # Select representative class
    # ------------------------------
    representative = None
    if class_stats:
        representative = sorted(
            class_stats,
            key=lambda c: (
                c["earliest_grade_date"] or datetime.max.replace(tzinfo=timezone.utc),
                -c["study_count"],
                -c["graded_count"]
            )
        )[0]

    progress = {
        "classes": {
            "current": len(classes),
            "required": cfg.min_classes
        },
        "graded_assignments": {
            "current": representative["graded_count"] if representative else 0,
            "required": cfg.min_graded_assignments_per_class
        },
        "study_sessions": {
            "current": representative["study_count"] if representative else 0,
            "required": cfg.min_study_session_per_class
        },
        "weeks_since_first_grade": {
            "current": representative["weeks_since_first_grade"] if representative else 0,
            "required": cfg.min_weeks_since_first_grade
        }
    }

    eligible = (
        progress["classes"]["current"] >= cfg.min_classes
        and progress["graded_assignments"]["current"] >= cfg.min_graded_assignments_per_class
        and progress["study_sessions"]["current"] >= cfg.min_study_session_per_class
        and progress["weeks_since_first_grade"]["current"] >= cfg.min_weeks_since_first_grade
        and len(eligible_classes) >= 1
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": {
            "class_id": representative["class_id"],
            "class_name": representative["class_name"],
            "graded_count": representative["graded_count"],
            "study_count": representative["study_count"],
            "weeks_since_first_grade": representative["weeks_since_first_grade"]
        } if representative else None
    }



