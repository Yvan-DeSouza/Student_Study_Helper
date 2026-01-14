from datetime import datetime, timezone
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession
from .._helpers import weeks_since, earliest_graded_assignment_date
from .requirements import (
    DeadlineProximityReq,
    RiskCompositionReq,
    AssignmentRiskBreakdownReq,
    UrgencyRiskMatrixReq
)


def get_deadline_proximity_eligibility(user_id):
    REQ = DeadlineProximityReq()
    
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
    
    # Track eligible and ineligible assignments
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



def get_risk_composition_eligibility(user_id):
    REQ = RiskCompositionReq()
   
    total_graded = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).count()
   
    earliest_date = earliest_graded_assignment_date(user_id)
    days_since_first = weeks_since(earliest_date) * 7


    progress = {
        "graded_assignments": {
            "current": total_graded,
            "required": REQ.min_graded_assignments_total
        },
        "days_since_earliest_graded": {
            "current": days_since_first,
            "required": REQ.min_days_since_earliest_graded
        }
    }


    eligible = (
        total_graded >= REQ.min_graded_assignments_total
        and days_since_first >= REQ.min_days_since_earliest_graded
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




def get_assignment_risk_breakdown_eligibility(user_id):
    REQ = AssignmentRiskBreakdownReq()
    
    # Get all incomplete assignments with due dates (eligible)
    incomplete_with_due = db.session.query(Assignment).join(Class).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).all()
    
    # Get all incomplete assignments without due dates (ineligible)
    incomplete_without_due = db.session.query(Assignment).join(Class).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.is_(None)
    ).all()
    
    # Get total graded assignments
    total_graded = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.grade.isnot(None)
    ).count()
    
    eligible_assignments = []
    ineligible_assignments = []
    representative_assignment = None
    
    # Track eligible assignments (have due dates)
    for a in incomplete_with_due:
        eligible_assignments.append({
            "assignment_id": a.assignment_id,
            "assignment_name": a.title,
            "class_name": a.class_.class_name,
            "class_id": a.class_id
        })
    
    # Track ineligible assignments (no due dates)
    for a in incomplete_without_due:
        ineligible_assignments.append({
            "assignment_id": a.assignment_id,
            "assignment_name": a.title,
            "class_name": a.class_.class_name,
            "class_id": a.class_id,
            "reasons": ["No due date set"]
        })
        
        # Track representative assignment (first one encountered)
        if representative_assignment is None:
            representative_assignment = {
                "assignment_id": a.assignment_id,
                "assignment_name": a.title,
                "class_name": a.class_.class_name,
                "reasons": ["No due date set"]
            }

    progress = {
        "incomplete_assignments_with_due": {
            "current": len(incomplete_with_due),
            "required": REQ.min_incomplete_assignments_with_due_date
        },
        "graded_assignments": {
            "current": total_graded,
            "required": REQ.min_graded_assignments
        },
        "incomplete_assignments_without_due": {
            "current": len(incomplete_without_due)
        }
    }

    eligible = (
        len(incomplete_with_due) >= REQ.min_incomplete_assignments_with_due_date
        and total_graded >= REQ.min_graded_assignments
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],
        "ineligible_classes": [],
        "eligible_assignments": eligible_assignments,
        "ineligible_assignments": ineligible_assignments,
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": representative_assignment
    }


def get_urgency_risk_matrix_eligibility(user_id):
    REQ = UrgencyRiskMatrixReq()
    
    # Get all incomplete assignments with due dates (eligible)
    incomplete_with_due = db.session.query(Assignment).join(Class).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).all()
    
    # Get all incomplete assignments without due dates (ineligible)
    incomplete_without_due = db.session.query(Assignment).join(Class).filter(
        Assignment.user_id == user_id,
        Assignment.is_completed == False,
        Assignment.due_at.is_(None)
    ).all()
    
    # Get total graded assignments
    total_graded = db.session.query(Assignment).filter(
        Assignment.user_id == user_id,
        Assignment.grade.isnot(None)
    ).count()
    
    # Count different deadline dates
    all_deadline_dates = {a.due_at.date() for a in incomplete_with_due if a.due_at is not None}
    
    eligible_assignments = []
    ineligible_assignments = []
    representative_assignment = None
    
    # Track eligible assignments
    for a in incomplete_with_due:
        eligible_assignments.append({
            "assignment_id": a.assignment_id,
            "assignment_name": a.title,
            "class_name": a.class_.class_name,
            "class_id": a.class_id,
            "due_at": a.due_at.isoformat() if a.due_at else None
        })
    
    # Track ineligible assignments
    for a in incomplete_without_due:
        ineligible_assignments.append({
            "assignment_id": a.assignment_id,
            "assignment_name": a.title,
            "class_name": a.class_.class_name,
            "class_id": a.class_id,
            "reasons": ["No due date set"]
        })
        
        if representative_assignment is None:
            representative_assignment = {
                "assignment_id": a.assignment_id,
                "assignment_name": a.title,
                "class_name": a.class_.class_name,
                "reasons": ["No due date set"]
            }

    progress = {
        "incomplete_assignments_with_due": {
            "current": len(incomplete_with_due),
            "required": REQ.min_incomplete_assignments_with_due_date
        },
        "different_deadline_dates": {
            "current": len(all_deadline_dates),
            "required": REQ.min_different_deadline_dates
        },
        "graded_assignments": {
            "current": total_graded,
            "required": REQ.min_graded_assignments
        },
        "incomplete_assignments_without_due": {
            "current": len(incomplete_without_due)
        }
    }

    eligible = (
        len(incomplete_with_due) >= REQ.min_incomplete_assignments_with_due_date
        and len(all_deadline_dates) >= REQ.min_different_deadline_dates
        and total_graded >= REQ.min_graded_assignments
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],
        "ineligible_classes": [],
        "eligible_assignments": eligible_assignments,
        "ineligible_assignments": ineligible_assignments,
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": representative_assignment
    }
