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
        "representative": None
    }


def get_assignment_risk_breakdown_eligibility(user_id):
    REQ = AssignmentRiskBreakdownReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
   
    total_incomplete_with_due = 0
    total_incomplete_without_due = 0
    total_graded = 0

    for cls in classes:
        incomplete_with_due = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.is_completed == False,
            Assignment.due_at.isnot(None)
        ).count()
       
        incomplete_without_due = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.is_completed == False,
            Assignment.due_at.is_(None)
        ).count()

        graded = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.grade.isnot(None)
        ).count()
       
        total_incomplete_with_due += incomplete_with_due
        total_incomplete_without_due += incomplete_without_due
        total_graded += graded

        reasons = []
        if incomplete_with_due < REQ.min_incomplete_assignments_with_due_date:
            reasons.append(
                f"{incomplete_with_due} incomplete with due date (need {REQ.min_incomplete_assignments_with_due_date})"
            )
        if graded < REQ.min_graded_assignments:
            reasons.append(f"{graded} graded (need {REQ.min_graded_assignments})")

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "incomplete_with_due": incomplete_with_due,
            "incomplete_without_due": incomplete_without_due,
            "graded": graded
        })

    progress = {
        "incomplete_assignments_with_due": {
            "current": total_incomplete_with_due,
            "required": REQ.min_incomplete_assignments_with_due_date
        },
        "graded_assignments": {
            "current": total_graded,
            "required": REQ.min_graded_assignments
        },
        "incomplete_assignments_without_due": {
            "current": total_incomplete_without_due
        }
    }

    eligible = (
        total_incomplete_with_due >= REQ.min_incomplete_assignments_with_due_date
        and total_graded >= REQ.min_graded_assignments
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": None
    }


def get_urgency_risk_matrix_eligibility(user_id):
    REQ = UrgencyRiskMatrixReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
   
    all_deadline_dates = set()
    total_incomplete_with_due = 0
    total_incomplete_without_due = 0
    total_graded = 0

    for cls in classes:
        incomplete_assignments = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.is_completed == False,
            Assignment.due_at.isnot(None)
        ).all()
       
        incomplete_without_due = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.is_completed == False,
            Assignment.due_at.is_(None)
        ).count()

        graded = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.grade.isnot(None)
        ).count()

        deadline_dates = {a.due_at.date() for a in incomplete_assignments if a.due_at is not None}
        all_deadline_dates.update(deadline_dates)
       
        incomplete_with_due_count = len(incomplete_assignments)
        total_incomplete_with_due += incomplete_with_due_count
        total_incomplete_without_due += incomplete_without_due
        total_graded += graded

        reasons = []
        if incomplete_with_due_count < REQ.min_incomplete_assignments_with_due_date:
            reasons.append(
                f"{incomplete_with_due_count} incomplete with due date (need {REQ.min_incomplete_assignments_with_due_date})"
            )
        if len(deadline_dates) < REQ.min_different_deadline_dates:
            reasons.append(
                f"{len(deadline_dates)} different deadlines (need {REQ.min_different_deadline_dates})"
            )
        if graded < REQ.min_graded_assignments:
            reasons.append(f"{graded} graded (need {REQ.min_graded_assignments})")

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "graded": graded,
            "incomplete_with_due": incomplete_with_due_count,
            "incomplete_without_due": incomplete_without_due,
            "different_deadline_dates": len(deadline_dates)
        })

    progress = {
        "incomplete_assignments_with_due": {
            "current": total_incomplete_with_due,
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
            "current": total_incomplete_without_due
        }
    }

    eligible = (
        total_incomplete_with_due >= REQ.min_incomplete_assignments_with_due_date
        and len(all_deadline_dates) >= REQ.min_different_deadline_dates
        and total_graded >= REQ.min_graded_assignments
    )

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": None
    }
