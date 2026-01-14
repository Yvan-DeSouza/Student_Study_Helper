from datetime import datetime, timezone
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession
from sqlalchemy import func
from .._helpers import weeks_since, earliest_graded_assignment_date, earliest_study_session_date
from .requirements import (
    TimeSpentVsExpectedReq,
    MarginalReturnsReq,
    EffortAllocationReq,
    OutcomeContributionReq
)


def earliest_study_session_date(user_id):
    """Get the earliest completed study session date for a user."""
    result = (
        db.session.query(StudySession.started_at)
        .join(Class)
        .filter(
            Class.user_id == user_id,
            StudySession.is_completed == True,
            StudySession.started_at.isnot(None)
        )
        .order_by(StudySession.started_at.asc())
        .first()
    )
    return result[0] if result else None


def get_time_spent_vs_expected_eligibility(user_id):
    REQ = TimeSpentVsExpectedReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    
    total_completed_sessions = 0
    total_completed_assignments = 0
    representative = None
    max_assignments_count = 0

    for cls in classes:
        # Count completed study sessions
        completed_sessions = db.session.query(StudySession).filter(
            StudySession.class_id == cls.class_id,
            StudySession.is_completed == True
        ).count()
        
        # Count completed assignments
        completed_assignments = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.is_completed == True
        ).count()

        
        # Count assignments with at least one linked study session
        assignments_with_sessions = db.session.query(Assignment.assignment_id).filter(
            Assignment.class_id == cls.class_id,
            Assignment.is_completed == True
        ).distinct().join(
            StudySession,
            StudySession.assignment_id == Assignment.assignment_id
        ).filter(
            StudySession.is_completed == True
        ).count()
        
        total_completed_sessions += completed_sessions
        total_completed_assignments += completed_assignments

        # Track representative class (most assignments with at least one session)
        if completed_sessions > 0 and completed_assignments > max_assignments_count:
            max_assignments_count = completed_assignments
            representative = {
                "class_id": cls.class_id,
                "class_name": cls.class_name,
                "completed_sessions": completed_sessions,
                "completed_assignments": completed_assignments,
                "assignments_with_sessions": assignments_with_sessions
            }

        reasons = []
        if completed_sessions < REQ.min_completed_study_sessions_per_class:
            reasons.append(
                f"{completed_sessions} completed study sessions (need {REQ.min_completed_study_sessions_per_class})"
            )
        if completed_assignments < REQ.min_completed_assignments_per_class:
            reasons.append(
                f"{completed_assignments} completed assignments (need {REQ.min_completed_assignments_per_class})"
            )
        if assignments_with_sessions < REQ.min_assignments_with_linked_sessions:
            reasons.append(
                f"{assignments_with_sessions} assignments with linked sessions (need {REQ.min_assignments_with_linked_sessions})"
            )

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "completed_sessions": completed_sessions,
            "completed_assignments": completed_assignments,
            "assignments_with_sessions": assignments_with_sessions
        })

    classes_with_any_grades = sum(1 for cls in classes if db.session.query(Assignment)
    .filter(Assignment.class_id == cls.class_id, Assignment.grade.isnot(None))
    .count() > 0)

    progress = {
        "eligible_classes": {
            "current": classes_with_any_grades,
            "required": REQ.min_eligible_classes
        },
        "completed_study_sessions_total": {
            "current": total_completed_sessions,
            "required": REQ.min_completed_study_sessions_total
        },
        "completed_assignments_total": {
            "current": total_completed_assignments,
            "required": REQ.min_completed_assignments_total
        }
    }

    eligible = (
        len(eligible_classes) >= REQ.min_eligible_classes
        and total_completed_sessions >= REQ.min_completed_study_sessions_total
        and total_completed_assignments >= REQ.min_completed_assignments_total
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": representative,
        "eligible_assignments": [], 
        "ineligible_assignments": [],
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
    }


def get_marginal_returns_eligibility(user_id):
    REQ = MarginalReturnsReq()
    
    # Count graded assignments with at least one linked study session
    graded_with_sessions = db.session.query(Assignment.assignment_id).filter(
        Assignment.user_id == user_id,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).distinct().join(
        StudySession,
        StudySession.assignment_id == Assignment.assignment_id
    ).filter(
        StudySession.is_completed == True,
        StudySession.duration_minutes > 0
    ).count()
    
    # Total graded assignments
    total_graded = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).count()
    
    # Assignments with at least one session
    assignments_with_sessions = db.session.query(Assignment.assignment_id).filter(
        Assignment.user_id == user_id
    ).distinct().join(
        StudySession,
        StudySession.assignment_id == Assignment.assignment_id
    ).filter(
        StudySession.is_completed == True
    ).count()
    
    # Days since earliest study session
    earliest_session = earliest_study_session_date(user_id)
    days_since_session = weeks_since(earliest_session) * 7
    
    # Days since earliest graded assignment
    earliest_grade = earliest_graded_assignment_date(user_id)
    days_since_grade = weeks_since(earliest_grade) * 7
    
    # Total study time in hours
    total_study_minutes = db.session.query(
        func.sum(StudySession.duration_minutes)
    ).filter(
        StudySession.user_id == user_id,
        StudySession.is_completed == True
    ).scalar() or 0
    
    total_study_hours = total_study_minutes / 60

    progress = {
        "days_since_earliest_study_session": {
            "current": days_since_session,
            "required": REQ.min_days_since_earliest_study_session
        },
        "days_since_earliest_graded_assignment": {
            "current": days_since_grade,
            "required": REQ.min_days_since_earliest_graded_assignment
        },
        "total_study_hours": {
            "current": round(total_study_hours, 1),
            "required": REQ.min_total_study_hours
        },
        "graded_assignments_with_sessions": {
            "current": graded_with_sessions,
            "required": REQ.min_graded_assignments_with_sessions
        },
        "graded_assignments": {
            "current": total_graded,
            "required": REQ.min_graded_assignments_with_sessions

        },
        "assignments_with_sessions": {
            "current": assignments_with_sessions,
            "required": REQ.min_graded_assignments_with_sessions
        }
    }

    eligible = (
        graded_with_sessions >= REQ.min_graded_assignments_with_sessions
        and days_since_session >= REQ.min_days_since_earliest_study_session
        and days_since_grade >= REQ.min_days_since_earliest_graded_assignment
        and total_study_hours >= REQ.min_total_study_hours
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],
        "ineligible_classes": [],
        "eligible_assignments": [], 
        "ineligible_assignments": [],
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": None
    }


def get_effort_allocation_eligibility(user_id):
    REQ = EffortAllocationReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    
    total_completed_sessions = 0
    total_study_minutes = 0
    representative = None
    max_sessions_count = 0

    for cls in classes:
        # Count completed study sessions
        completed_sessions = db.session.query(StudySession).filter(
            StudySession.class_id == cls.class_id,
            StudySession.is_completed == True
        ).count()
        
        # Sum study time for this class
        class_study_minutes = db.session.query(
            func.sum(StudySession.duration_minutes)
        ).filter(
            StudySession.class_id == cls.class_id,
            StudySession.is_completed == True
        ).scalar() or 0
        
        total_completed_sessions += completed_sessions
        total_study_minutes += class_study_minutes
        
        # Track representative class (most sessions)
        if completed_sessions > max_sessions_count:
            max_sessions_count = completed_sessions
            representative = {
                "class_id": cls.class_id,
                "class_name": cls.class_name,
                "completed_sessions": completed_sessions
            }

        reasons = []
        if completed_sessions < REQ.min_completed_study_sessions_per_class:
            reasons.append(
                f"{completed_sessions} completed study sessions (need {REQ.min_completed_study_sessions_per_class})"
            )

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "completed_sessions": completed_sessions
        })

    total_study_hours = total_study_minutes / 60

    progress = {
        "classes": {
            "current": len(classes),
            "required": REQ.min_classes
        },
        "completed_study_sessions_total": {
            "current": total_completed_sessions,
            "required": REQ.min_completed_study_sessions_total
        },
        "total_study_hours": {
            "current": round(total_study_hours, 1),
            "required": REQ.min_total_study_hours
        }
    }

    eligible = (
        len(eligible_classes) >= REQ.min_classes
        and total_completed_sessions >= REQ.min_completed_study_sessions_total
        and total_study_hours >= REQ.min_total_study_hours
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "eligible_assignments": [], 
        "ineligible_assignments": [],
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": representative
    }


def get_outcome_contribution_eligibility(user_id):
    REQ = OutcomeContributionReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    
    total_graded = 0
    representative = None
    max_graded_count = 0

    for cls in classes:
        # Count graded assignments
        graded_count = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.grade.isnot(None)
        ).count()
        
        total_graded += graded_count
        
        # Track representative class (most graded assignments)
        if graded_count > max_graded_count:
            max_graded_count = graded_count
            representative = {
                "class_id": cls.class_id,
                "class_name": cls.class_name,
                "graded_count": graded_count
            }

        reasons = []
        if graded_count < REQ.min_graded_assignments_per_class:
            reasons.append(
                f"{graded_count} graded assignments (need {REQ.min_graded_assignments_per_class})"
            )

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "graded_count": graded_count
        })


    classes_with_any_grades = sum(1 for cls in classes if db.session.query(Assignment)
        .filter(Assignment.class_id == cls.class_id, Assignment.grade.isnot(None))
        .count() > 0)

    progress = {
        "classes_with_grades": {
            "current": classes_with_any_grades,
            "required": REQ.min_classes_with_grades
        },
        "graded_assignments_total": {
            "current": total_graded,
            "required": REQ.min_graded_assignments_total
        }
    }

    eligible = (
        len(eligible_classes) >= REQ.min_classes_with_grades
        and total_graded >= REQ.min_graded_assignments_total
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "eligible_assignments": [], 
        "ineligible_assignments": [],
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": representative
    }