from datetime import datetime, timezone
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession
from sqlalchemy import func
from .requirements import (
    AssignmentDueTimelineReq,
    AssignmentTypeLoadReq,
    AssignmentProgressDeadlineReq
)


def get_assignment_due_timeline_eligibility(user_id):
    REQ = AssignmentDueTimelineReq()
    
    incomplete_with_due = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).all()
    
    incomplete_without_due = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.is_(None)
    ).all()
    
    eligible_assignments = []
    ineligible_assignments = []
    
    # Process assignments with due dates (eligible)
    for a in incomplete_with_due:
        eligible_assignments.append({
            "assignment_id": a.assignment_id,
            "assignment_name": a.title,
            "class_name": a.class_.class_name if a.class_ else "Unknown"
        })
    
    # Process assignments without due dates (ineligible)
    for a in incomplete_without_due:
        ineligible_assignments.append({
            "assignment_id": a.assignment_id,
            "assignment_name": a.title,
            "class_name": a.class_.class_name if a.class_ else "Unknown",
            "reasons": ["No due date set"]
        })
    
    progress = {
        "incomplete_assignments_with_due": {
            "current": len(incomplete_with_due),
            "required": REQ.min_incomplete_assignments_with_due_date
        },
        "incomplete_assignments_without_due": {
            "current": len(incomplete_without_due)
        }
    }

    eligible = len(incomplete_with_due) >= REQ.min_incomplete_assignments_with_due_date

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],
        "ineligible_classes": [],
        "eligible_assignments": eligible_assignments,
        "ineligible_assignments": ineligible_assignments,
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": None
    }


def get_assignment_type_load_eligibility(user_id, metric='count'):
    REQ = AssignmentTypeLoadReq()
    
    # Count total assignments
    total_assignments = db.session.query(Assignment).filter(
        Assignment.user_id == user_id
    ).count()
    
    # Count assignments with study time
    assignments_with_study_time = db.session.query(Assignment.assignment_id).filter(
        Assignment.user_id == user_id
    ).distinct().join(
        StudySession,
        StudySession.assignment_id == Assignment.assignment_id
    ).filter(
        StudySession.is_completed == True,
        StudySession.duration_minutes > 0
    ).count()
    
    progress = {
        "total_assignments": {
            "current": total_assignments,
            "required": REQ.min_assignments_any
        },
        "assignments_with_study_time": {
            "current": assignments_with_study_time,
            "required": REQ.min_assignments_with_study_time
        }
    }
    
    # Eligibility depends on mode
    if metric == 'study_time':
        eligible = assignments_with_study_time >= REQ.min_assignments_with_study_time
    else:
        eligible = total_assignments >= REQ.min_assignments_any

    return {
        "eligible": eligible,
        "progress": progress,
        "metric": metric,
        "eligible_classes": [],
        "ineligible_classes": [],
        "eligible_assignments": [],
        "ineligible_assignments": [],
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": None
    }


def get_assignment_progress_deadline_eligibility(user_id):
    REQ = AssignmentProgressDeadlineReq()
    
    incomplete_with_due = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).all()
    
    incomplete_without_due = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.is_(None)
    ).all()
    
    eligible_assignments = []
    ineligible_assignments = []
    
    # Process assignments with due dates (eligible)
    for a in incomplete_with_due:
        eligible_assignments.append({
            "assignment_id": a.assignment_id,
            "assignment_name": a.title,
            "class_name": a.class_.class_name if a.class_ else "Unknown"
        })
    
    # Process assignments without due dates (ineligible)
    for a in incomplete_without_due:
        ineligible_assignments.append({
            "assignment_id": a.assignment_id,
            "assignment_name": a.title,
            "class_name": a.class_.class_name if a.class_ else "Unknown",
            "reasons": ["No due date set"]
        })
    
    progress = {
        "incomplete_assignments_with_due": {
            "current": len(incomplete_with_due),
            "required": REQ.min_incomplete_assignments_with_due_date
        },
        "incomplete_assignments_without_due": {
            "current": len(incomplete_without_due)
        }
    }

    eligible = len(incomplete_with_due) >= REQ.min_incomplete_assignments_with_due_date

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],
        "ineligible_classes": [],
        "eligible_assignments": eligible_assignments,
        "ineligible_assignments": ineligible_assignments,
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": None
    }