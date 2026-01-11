from datetime import datetime, timezone
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession
from .requirements import RollingGradeTrendReq, StabilityIndexReq, EffortOutcomeReq, LagCorrelationReq
from .._helpers import weeks_since, earliest_graded_assignment_date


def get_rolling_grade_trend_eligibility(user_id):
    REQ = RollingGradeTrendReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    class_stats = []

    for cls in classes:
        assignments = (
            db.session.query(Assignment)
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.grade.isnot(None),
                Assignment.finished_at.isnot(None)
            )
            .all()
        )

        graded_count = len(assignments)
        earliest = min((a.finished_at for a in assignments), default=None)
        weeks = weeks_since(earliest)

        reasons = []
        if graded_count < REQ.min_graded_assignments_per_class:
            reasons.append(f"{graded_count} graded (need {REQ.min_graded_assignments_per_class})")
        if weeks < REQ.min_weeks_since_first_grade:
            reasons.append(f"{weeks} weeks since first grade")

        class_stats.append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "graded_count": graded_count,
            "weeks": weeks,
            "earliest": earliest
        })

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons
        })

    representative = (
        sorted(
            class_stats,
            key=lambda c: (c["earliest"] or datetime.max.replace(tzinfo=timezone.utc), -c["graded_count"])
        )[0]
        if class_stats else None
    )

    progress = {
        "classes": {"current": len(classes), "required": REQ.min_classes},
        "graded_assignments": {
            "current": representative["graded_count"] if representative else 0,
            "required": REQ.min_graded_assignments_per_class
        },
        "weeks_since_first_grade": {
            "current": representative["weeks"] if representative else 0,
            "required": REQ.min_weeks_since_first_grade
        }
    }

    eligible = (
        progress["classes"]["current"] >= REQ.min_classes
        and progress["graded_assignments"]["current"] >= REQ.min_graded_assignments_per_class
        and progress["weeks_since_first_grade"]["current"] >= REQ.min_weeks_since_first_grade
        and len(eligible_classes) >= 1
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": representative
    }






def get_stability_index_eligibility(user_id):
    REQ = StabilityIndexReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    total_graded = 0
    total_sessions = 0

    class_stats = []

    for cls in classes:
        graded = (
            db.session.query(Assignment)
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.grade.isnot(None)
            )
            .count()
        )

        sessions = (
            db.session.query(StudySession)
            .filter(StudySession.class_id == cls.class_id)
            .count()
        )

        total_graded += graded
        total_sessions += sessions

        class_stats.append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "graded": graded,
            "sessions": sessions
        })

    first_grade_date = earliest_graded_assignment_date(user_id)

    progress = {
        "classes": {"current": len(classes), "required": REQ.min_classes},
        "graded_assignments": {"current": total_graded, "required": REQ.min_graded_assignments},
        "study_sessions": {"current": total_sessions, "required": REQ.min_study_sessions},
        "weeks_since_first_grade": {
            "current": weeks_since(first_grade_date),
            "required": REQ.min_weeks_since_first_grade
        }
    }

    eligible = (
        progress["classes"]["current"] >= REQ.min_classes
        and progress["graded_assignments"]["current"] >= REQ.min_graded_assignments
        and progress["study_sessions"]["current"] >= REQ.min_study_sessions
        and progress["weeks_since_first_grade"]["current"] >= REQ.min_weeks_since_first_grade
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],     # not class-specific
        "ineligible_classes": [],   # not class-specific
        "representative": None
    }







def get_effort_outcome_eligibility(user_id):
    REQ = EffortOutcomeReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []

    total_graded = 0
    total_sessions = 0

    for cls in classes:
        graded = (
            db.session.query(Assignment)
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.grade.isnot(None)
            )
            .count()
        )

        sessions = (
            db.session.query(StudySession)
            .filter(StudySession.class_id == cls.class_id)
            .count()
        )

        total_graded += graded
        total_sessions += sessions

        reasons = []
        if graded < REQ.min_graded_assignments:
            reasons.append(f"{graded} graded (need {REQ.min_graded_assignments})")
        if sessions < REQ.min_study_sessions:
            reasons.append(f"{sessions} study sessions (need {REQ.min_study_sessions})")

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons
        })

    first_grade_date = earliest_graded_assignment_date(user_id)

    progress = {
        "classes": {"current": len(classes), "required": REQ.min_classes},
        "graded_assignments": {"current": total_graded, "required": REQ.min_graded_assignments},
        "study_sessions": {"current": total_sessions, "required": REQ.min_study_sessions},
        "weeks_since_first_grade": {
            "current": weeks_since(first_grade_date),
            "required": REQ.min_weeks_since_first_grade
        }
    }

    eligible = (
        progress["classes"]["current"] >= REQ.min_classes
        and progress["graded_assignments"]["current"] >= REQ.min_graded_assignments
        and progress["study_sessions"]["current"] >= REQ.min_study_sessions
        and progress["weeks_since_first_grade"]["current"] >= REQ.min_weeks_since_first_grade
        and len(eligible_classes) >= 1
    )

    representative = eligible_classes[0] if eligible_classes else None

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": representative
    }








def get_lag_correlation_eligibility(user_id):
    REQ = LagCorrelationReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    class_stats = []

    for cls in classes:
        graded = (
            db.session.query(Assignment)
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.grade.isnot(None),
                Assignment.finished_at.isnot(None)
            )
            .all()
        )

        sessions = (
            db.session.query(StudySession)
            .filter(StudySession.class_id == cls.class_id)
            .count()
        )

        graded_count = len(graded)
        earliest = min((a.finished_at for a in graded), default=None)
        weeks = weeks_since(earliest)

        reasons = []
        if graded_count < REQ.min_graded_assignments_per_class:
            reasons.append(
                f"{graded_count} graded (need {REQ.min_graded_assignments_per_class})"
            )
        if sessions < REQ.min_study_sessions_per_class:
            reasons.append(
                f"{sessions} study sessions (need {REQ.min_study_sessions_per_class})"
            )
        if weeks < REQ.min_weeks_since_first_grade:
            reasons.append(f"{weeks} weeks since first grade")

        class_stats.append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "graded": graded_count,
            "sessions": sessions,
            "weeks": weeks,
            "earliest": earliest
        })

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons
        })

    representative = (
        sorted(
            class_stats,
            key=lambda c: (c["earliest"] or datetime.max.replace(tzinfo=timezone.utc))
        )[0]
        if class_stats else None
    )

    progress = {
        "classes": {"current": len(classes), "required": REQ.min_classes},
        "graded_assignments_per_class": {
            "current": representative["graded"] if representative else 0,
            "required": REQ.min_graded_assignments_per_class
        },
        "study_sessions_per_class": {
            "current": representative["sessions"] if representative else 0,
            "required": REQ.min_study_sessions_per_class
        },
        "weeks_since_first_grade": {
            "current": representative["weeks"] if representative else 0,
            "required": REQ.min_weeks_since_first_grade
        }
    }

    eligible = (
        progress["classes"]["current"] >= REQ.min_classes
        and len(eligible_classes) >= 1
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": representative
    }
