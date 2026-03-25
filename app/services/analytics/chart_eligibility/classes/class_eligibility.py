from datetime import datetime, timezone, timedelta
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession
from .requirements import (
    GradeVsStudyTimeReq,
    ClassHealthReq
)


def get_grade_vs_study_time_eligibility(user_id):
    REQ = GradeVsStudyTimeReq()
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()

    eligible_classes = []
    ineligible_classes = []
    
    total_completed_sessions = 0
    classes_with_grade = 0
    classes_with_sessions = 0
    classes_with_both = 0

    for cls in classes:
        # Count completed study sessions
        completed_sessions = db.session.query(StudySession).filter(
            StudySession.class_id == cls.class_id,
            StudySession.is_completed == True
        ).count()
        
        total_completed_sessions += completed_sessions
        
        # Check if class has a grade
        has_grade = cls.grade is not None
        
        if has_grade:
            classes_with_grade += 1
        
        if completed_sessions > 0:
            classes_with_sessions += 1
        
        if has_grade and completed_sessions > 0:
            classes_with_both += 1

        reasons = []
        if not has_grade and completed_sessions == 0:
            reasons.append("no completed study sessions yet and no grade yet")
        elif not has_grade:
            reasons.append("no grade yet")
        elif completed_sessions == 0:
            reasons.append("no completed study sessions yet")

        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "has_grade": has_grade,
            "completed_sessions": completed_sessions
        })

    progress = {
        "classes_with_grade": {
            "current": classes_with_grade,
            "required": REQ.min_classes_with_grade
        },
        "completed_study_sessions_total": {
            "current": total_completed_sessions,
            "required": REQ.min_completed_study_sessions_total
        },
        "classes_with_sessions": {
            "current": classes_with_sessions
        },
        "classes_with_both": {
            "current": classes_with_both
        }
    }

    eligible = (
        classes_with_grade >= REQ.min_classes_with_grade
        and total_completed_sessions >= REQ.min_completed_study_sessions_total
        and classes_with_both >= 1  # At least one class must have both
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
        "representative": None
    }



def get_class_health_eligibility(user_id, time_window='all'):
    REQ = ClassHealthReq()
    
    # Calculate time filter
    since = None
    if time_window == 'last_7_days':
        since = datetime.now(timezone.utc) - timedelta(days=7)
    elif time_window == 'last_30_days':
        since = datetime.now(timezone.utc) - timedelta(days=30)
    
    # Count total assignments
    query = db.session.query(Assignment).join(Class).filter(
        Class.user_id == user_id
    )
    
    if since is not None:
        query = query.filter(Assignment.created_at >= since)
    
    total_assignments = query.count()
    
    # Get per-class breakdown
    classes = db.session.query(Class).filter(Class.user_id == user_id).all()
    
    eligible_classes = []
    ineligible_classes = []
    
    for cls in classes:
        base_q = db.session.query(Assignment).filter(Assignment.class_id == cls.class_id)
        if since is not None:
            base_q = base_q.filter(Assignment.created_at >= since)
        
        class_assignments = base_q.count()
        
        reasons = []
        if class_assignments == 0:
            if time_window == 'all':
                reasons.append("no assignments yet")
            else:
                reasons.append("no assignments in this time range")
        
        (ineligible_classes if reasons else eligible_classes).append({
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "reasons": reasons,
            "assignment_count": class_assignments
        })

    progress = {
        "assignments_total": {
            "current": total_assignments,
            "required": REQ.min_assignments_total
        },
        "time_window": time_window
    }

    eligible = total_assignments >= REQ.min_assignments_total

    return {
        "eligible": eligible,
        "progress": progress,
        "eligible_classes": eligible_classes,
        "ineligible_classes": ineligible_classes,
        "eligible_assignments": [], 
        "ineligible_assignments": [],
        "eligible_study_sessions": [],
        "ineligible_study_sessions": [],
        "representative": None
    }