from datetime import datetime, timezone, timedelta
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession
from sqlalchemy import func, cast, Date
from .._helpers import weeks_since
from .requirements import (
    TimeDistributionReq,
    WeeklyStudyTrendReq,
    AssignmentLoadReq,
    PerformanceRadarReq
)


def get_time_distribution_eligibility(user_id):
    REQ = TimeDistributionReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    
    total_completed_sessions = 0
    classes_with_study_time = 0

    for cls in classes:
        # Count completed study sessions
        completed_sessions = db.session.query(StudySession).filter(
            StudySession.class_id == cls.class_id,
            StudySession.is_completed == True
        ).count()
        
        total_completed_sessions += completed_sessions
        
        if completed_sessions > 0:
            classes_with_study_time += 1

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

    progress = {
        "completed_study_sessions_total": {
            "current": total_completed_sessions,
            "required": REQ.min_completed_study_sessions_total
        },
        "classes_with_study_time": {
            "current": classes_with_study_time,
            "required": REQ.min_classes_with_study_time
        }
    }

    eligible = (
        total_completed_sessions >= REQ.min_completed_study_sessions_total
        and classes_with_study_time >= REQ.min_classes_with_study_time
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": None
    }


def get_weekly_study_trend_eligibility(user_id):
    REQ = WeeklyStudyTrendReq()
    
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=6)
    
    # Count total completed sessions
    total_sessions = db.session.query(StudySession).filter(
        StudySession.user_id == user_id,
        StudySession.is_completed == True
    ).count()
    
    # Count sessions in last 7 days
    sessions_last_7_days = db.session.query(StudySession).filter(
        StudySession.user_id == user_id,
        StudySession.is_completed == True,
        cast(StudySession.started_at, Date) >= start_date,
        cast(StudySession.started_at, Date) <= today
    ).count()

    progress = {
        "completed_study_sessions": {
            "current": total_sessions,
            "required": REQ.min_completed_study_sessions
        },
        "sessions_in_last_7_days": {
            "current": sessions_last_7_days,
            "required": REQ.min_sessions_in_last_7_days
        }
    }

    eligible = (
        total_sessions >= REQ.min_completed_study_sessions
        and sessions_last_7_days >= REQ.min_sessions_in_last_7_days
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],
        "ineligible_classes": [],
        "representative": None
    }


def get_assignment_load_eligibility(user_id):
    REQ = AssignmentLoadReq()
    
    total_incomplete_with_due = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).count()
    
    total_incomplete_without_due = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.is_(None)
    ).count()

    progress = {
        "incomplete_assignments_with_due": {
            "current": total_incomplete_with_due,
            "required": REQ.min_incomplete_assignments_with_due_date
        },
        "incomplete_assignments_without_due": {
            "current": total_incomplete_without_due
        }
    }

    eligible = total_incomplete_with_due >= REQ.min_incomplete_assignments_with_due_date

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],
        "ineligible_classes": [],
        "representative": None
    }


def get_performance_radar_eligibility(user_id):
    REQ = PerformanceRadarReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    
    total_classes = len(classes)
    classes_with_data = 0

    for cls in classes:
        # Count completed study sessions
        completed_sessions = db.session.query(StudySession).filter(
            StudySession.class_id == cls.class_id,
            StudySession.is_completed == True
        ).count()
        
        # Count graded assignments
        graded_count = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.grade.isnot(None)
        ).count()
        
        has_data = completed_sessions > 0 or graded_count > 0
        
        if has_data:
            classes_with_data += 1

        reasons = []
        if not has_data:
            reasons.append("no study sessions or graded assignments yet")

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "completed_sessions": completed_sessions,
            "graded_count": graded_count
        })

    progress = {
        "classes": {
            "current": total_classes,
            "required": REQ.min_classes
        },
        "study_sessions_or_grades": {
            "current": classes_with_data,
            "required": REQ.min_study_sessions_or_grades
        }
    }

    eligible = (
        total_classes >= REQ.min_classes
        and classes_with_data >= REQ.min_study_sessions_or_grades
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": None
    }