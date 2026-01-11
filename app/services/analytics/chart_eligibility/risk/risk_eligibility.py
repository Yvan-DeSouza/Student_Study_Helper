# services/analytics/chart_eligibility/risk/risk_eligibility.py
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
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    total_incomplete_with_due = 0
    total_incomplete_without_due = 0

    for cls in classes:
        incomplete_with_due = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.finished_at.is_(None),
            Assignment.due_at.isnot(None)
        ).count()

        incomplete_without_due = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.finished_at.is_(None),
            Assignment.due_at.is_(None)
        ).count()

        total_incomplete_with_due += incomplete_with_due
        total_incomplete_without_due += incomplete_without_due

        reasons = []
        if incomplete_with_due < REQ.min_incomplete_assignments_with_due_date:
            reasons.append(
                f"{incomplete_with_due} incomplete with due date (need {REQ.min_incomplete_assignments_with_due_date})"
            )

        class_info = {
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "incomplete_with_due": incomplete_with_due,
            "incomplete_without_due": incomplete_without_due
        }

        (ineligible_classes if reasons else eligible_classes).append(class_info)

    eligible = total_incomplete_with_due >= REQ.min_incomplete_assignments_with_due_date

    # Front/back messages
    if total_incomplete_with_due == 0:
        front_message = "🎉 You have no due assignments!"
    elif total_incomplete_without_due > 0:
        front_message = f"⚠ Warning: This graph only shows assignments with a due date, you currently have {total_incomplete_without_due} incomplete assignments with no due date"
    else:
        front_message = None

    back_message = None
    if total_incomplete_without_due > 0:
        back_message = f"You have {total_incomplete_without_due} assignments that are not shown because they do not have a due date."

    progress = {
        "incomplete_assignments_with_due": {
            "current": total_incomplete_with_due,
            "required": REQ.min_incomplete_assignments_with_due_date
        }
    }

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": eligible_classes[0] if eligible_classes else None,
        "front_message": front_message,
        "back_message": back_message
    }


def get_risk_composition_eligibility(user_id):
    REQ = RiskCompositionReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    total_graded = 0
    earliest_date = None

    for cls in classes:
        graded_assignments = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.grade.isnot(None),
            Assignment.finished_at.isnot(None)
        ).all()

        total_graded += len(graded_assignments)
        cls_earliest = min((a.finished_at for a in graded_assignments), default=None)
        if cls_earliest and (earliest_date is None or cls_earliest < earliest_date):
            earliest_date = cls_earliest

    weeks_since_first = weeks_since(earliest_date)

    progress = {
        "graded_assignments_total": {
            "current": total_graded,
            "required": REQ.min_graded_assignments_total
        },
        "days_since_earliest_graded": {
            "current": weeks_since_first * 7,
            "required": REQ.min_days_since_earliest_graded
        }
    }

    eligible = (
        total_graded >= REQ.min_graded_assignments_total
        and weeks_since_first * 7 >= REQ.min_days_since_earliest_graded
    )

    front_message = None
    if total_graded < REQ.min_graded_assignments_total:
        front_message = f"❌ Not enough graded assignments: {total_graded}/{REQ.min_graded_assignments_total}"
    elif weeks_since_first * 7 < REQ.min_days_since_earliest_graded:
        front_message = f"❌ Time since earliest graded assignment: {weeks_since_first * 7}/{REQ.min_days_since_earliest_graded} days"

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": [],
        "ineligible_classes": [],
        "representative": None,
        "front_message": front_message,
        "back_message": None
    }


def get_assignment_risk_breakdown_eligibility(user_id):
    REQ = AssignmentRiskBreakdownReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []

    for cls in classes:
        incomplete_with_due = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.finished_at.is_(None),
            Assignment.due_at.isnot(None)
        ).count()

        graded = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.grade.isnot(None)
        ).count()

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
            "graded": graded
        })

    representative = eligible_classes[0] if eligible_classes else None

    # Back message for assignments without due date
    total_incomplete_without_due = sum(
        db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.finished_at.is_(None),
            Assignment.due_at.is_(None)
        ).count()
        for cls in classes
    )

    back_message = None
    if total_incomplete_without_due > 0:
        back_message = f"You have {total_incomplete_without_due} assignments that are not shown because they do not have a due date."

    progress = {
        "graded_assignments": {
            "current": sum(a["graded"] for a in eligible_classes) if eligible_classes else 0,
            "required": REQ.min_graded_assignments
        },
        "incomplete_assignments_with_due": {
            "current": sum(a["incomplete_with_due"] for a in eligible_classes) if eligible_classes else 0,
            "required": REQ.min_incomplete_assignments_with_due_date
        }
    }

    eligible = all([
        progress["graded_assignments"]["current"] >= REQ.min_graded_assignments,
        progress["incomplete_assignments_with_due"]["current"] >= REQ.min_incomplete_assignments_with_due_date
    ])

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": representative,
        "front_message": None,
        "back_message": back_message
    }


def get_urgency_risk_matrix_eligibility(user_id):
    REQ = UrgencyRiskMatrixReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []

    for cls in classes:
        incomplete_assignments = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.finished_at.is_(None),
            Assignment.due_at.isnot(None)
        ).all()

        graded = db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.grade.isnot(None)
        ).count()

        deadline_dates = {a.due_at for a in incomplete_assignments if a.due_at is not None}
        incomplete_with_due_count = len(incomplete_assignments)

        reasons = []
        if incomplete_with_due_count < REQ.min_incomplete_assignments_with_due_date:
            reasons.append(f"{incomplete_with_due_count} incomplete assignments with due dates (need {REQ.min_incomplete_assignments_with_due_date})")
        if len(deadline_dates) < REQ.min_different_deadline_dates:
            reasons.append(f"{len(deadline_dates)} different deadline dates (need {REQ.min_different_deadline_dates})")
        if graded < REQ.min_graded_assignments:
            reasons.append(f"{graded} graded (need {REQ.min_graded_assignments})")

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "graded": graded,
            "incomplete_with_due": incomplete_with_due_count,
            "different_deadline_dates": len(deadline_dates)
        })

    representative = eligible_classes[0] if eligible_classes else None

    # Back message for assignments without due date
    total_incomplete_without_due = sum(
        db.session.query(Assignment).filter(
            Assignment.class_id == cls.class_id,
            Assignment.finished_at.is_(None),
            Assignment.due_at.is_(None)
        ).count()
        for cls in classes
    )

    back_message = None
    if total_incomplete_without_due > 0:
        back_message = f"You have {total_incomplete_without_due} assignments that are not shown because they do not have a due date."

    progress = {
        "graded_assignments": {
            "current": sum(a["graded"] for a in eligible_classes) if eligible_classes else 0,
            "required": REQ.min_graded_assignments
        },
        "incomplete_assignments_with_due": {
            "current": sum(a["incomplete_with_due"] for a in eligible_classes) if eligible_classes else 0,
            "required": REQ.min_incomplete_assignments_with_due_date
        },
        "different_deadline_dates": {
            "current": sum(a["different_deadline_dates"] for a in eligible_classes) if eligible_classes else 0,
            "required": REQ.min_different_deadline_dates
        }
    }

    eligible = all([
        progress["graded_assignments"]["current"] >= REQ.min_graded_assignments,
        progress["incomplete_assignments_with_due"]["current"] >= REQ.min_incomplete_assignments_with_due_date,
        progress["different_deadline_dates"]["current"] >= REQ.min_different_deadline_dates
    ])

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "representative": representative,
        "front_message": None,
        "back_message": back_message
    }
