from flask import jsonify, request
from flask_login import login_required, current_user
from app.routes.charts import charts
from app.models.course import Class
from app.models.study_session import StudySession
from app.models.assignment import Assignment
from app.extensions import db
import pandas as pd
import numpy as np

from app.services.expected_utils import (
    has_enough_data,
    estimate_expected_minutes
)
from app.services.effort_utils import (
    effort_ratio,
    compute_effort_score,
    cumulative_effort_outcome,
    smooth_marginal_returns,
    effort_allocation_by_class,
    outcome_contribution_by_class
)

# Minimum data requirements
MIN_STUDY_SESSIONS = 10
MIN_ASSIGNMENTS_WITH_GRADES = 5


# =================== GRAPH 1: Time Spent vs Expected Time ===================
@charts.route("/dashboard/spent_vs_expected_time")
@login_required
def spent_vs_expected_time():
    """
    Bar chart comparing actual study time vs expected time per class.
    """
    
    # Check data sufficiency
    session_count = db.session.query(StudySession).filter(
        StudySession.user_id == current_user.user_id,
        StudySession.is_completed == True
    ).count()
    
    grade_count = db.session.query(Assignment).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.grade.isnot(None)
    ).count()
    
    if session_count < MIN_STUDY_SESSIONS or grade_count < MIN_ASSIGNMENTS_WITH_GRADES:
        return jsonify({
            "empty": True,
            "message": f"Need at least {MIN_STUDY_SESSIONS} study sessions and {MIN_ASSIGNMENTS_WITH_GRADES} graded assignments"
        })
    
    # Get all classes
    classes = db.session.query(Class).filter(
        Class.user_id == current_user.user_id
    ).all()
    
    if not classes:
        return jsonify({"empty": True, "message": "No classes found"})
    
    # Get completed study sessions
    sessions = db.session.query(
        StudySession.class_id,
        StudySession.duration_minutes
    ).filter(
        StudySession.user_id == current_user.user_id,
        StudySession.is_completed == True,
        StudySession.duration_minutes.isnot(None)
    ).all()
    
    # Get incomplete assignments for expected time
    incomplete = db.session.query(
        Assignment.class_id,
        Assignment.estimated_minutes
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == False
    ).all()
    
    # Get historical data for estimation
    completed_assignments = db.session.query(
        Assignment.class_id,
        Assignment.assignment_type,
        Class.class_type
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).join(
        StudySession, StudySession.assignment_id == Assignment.assignment_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == True,
        StudySession.duration_minutes.isnot(None)
    ).all()
    
    # Aggregate actual time per class
    actual_by_class = {}
    for s in sessions:
        actual_by_class[s.class_id] = actual_by_class.get(s.class_id, 0) + s.duration_minutes
    
    # Aggregate expected time per class
    expected_by_class = {}
    
    # Build past assignments for estimation
    past_assignments = []
    for ca in completed_assignments:
        # Get actual time spent
        actual_time = db.session.query(
            db.func.sum(StudySession.duration_minutes)
        ).filter(
            StudySession.assignment_id == Assignment.assignment_id,
            StudySession.user_id == current_user.user_id
        ).join(
            Assignment
        ).filter(
            Assignment.class_id == ca.class_id
        ).scalar()
        
        if actual_time:
            past_assignments.append({
                'class_type': ca.class_type,
                'assignment_type': ca.assignment_type,
                'class_id': ca.class_id,
                'actual_minutes': actual_time
            })
    
    for inc in incomplete:
        if inc.estimated_minutes:
            expected_by_class[inc.class_id] = expected_by_class.get(inc.class_id, 0) + inc.estimated_minutes
        else:
            # Use estimation if we have enough data
            if has_enough_data(past_assignments):
                cls = next((c for c in classes if c.class_id == inc.class_id), None)
                if cls:
                    estimated = estimate_expected_minutes(
                        cls.class_type, "other", cls.class_id, past_assignments
                    )
                    expected_by_class[inc.class_id] = expected_by_class.get(inc.class_id, 0) + estimated
    
    # Build response
    labels = []
    actual = []
    expected = []
    
    for cls in classes:
        if cls.class_id in actual_by_class or cls.class_id in expected_by_class:
            labels.append(cls.class_name)
            actual.append(actual_by_class.get(cls.class_id, 0))
            expected.append(expected_by_class.get(cls.class_id, 0))
    
    if not labels:
        return jsonify({"empty": True, "message": "No data available"})
    
    return jsonify({
        "empty": False,
        "labels": labels,
        "actual": actual,
        "expected": expected
    })


# =================== GRAPH 2: Marginal Returns Curve ===================
@charts.route("/dashboard/marginal_returns_curve")
@login_required
def marginal_returns_curve():
    """
    Line chart showing cumulative effort vs outcome.
    """
    
    # Check data sufficiency
    grade_count = db.session.query(Assignment).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.grade.isnot(None)
    ).count()
    
    if grade_count < MIN_ASSIGNMENTS_WITH_GRADES:
        return jsonify({
            "empty": True,
            "message": f"Need at least {MIN_ASSIGNMENTS_WITH_GRADES} graded assignments"
        })
    
    # Get completed assignments with grades and study time
    results = db.session.query(
        Assignment.assignment_id,
        Assignment.finished_at,
        Assignment.grade
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == True,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).order_by(Assignment.finished_at).all()
    
    if not results:
        return jsonify({"empty": True, "message": "No graded assignments"})
    
    # Build assignment data with study time
    assignments = []
    for r in results:
        # Get total study time for this assignment
        study_time = db.session.query(
            db.func.sum(StudySession.duration_minutes)
        ).filter(
            StudySession.assignment_id == r.assignment_id,
            StudySession.is_completed == True
        ).scalar() or 0
        
        if study_time > 0:
            assignments.append({
                'finished_at': r.finished_at,
                'actual_minutes': study_time,
                'grade': float(r.grade)
            })
    
    if len(assignments) < 3:
        return jsonify({"empty": True, "message": "Insufficient data for curve"})
    
    # Compute cumulative data
    cumulative_data = cumulative_effort_outcome(assignments)
    
    # Smooth the curve
    smoothed = smooth_marginal_returns(cumulative_data, window=3)
    
    return jsonify({
        "empty": False,
        "points": smoothed
    })


# =================== GRAPH 3: Effort Allocation ===================
@charts.route("/dashboard/effort_allocation")
@login_required
def effort_allocation():
    """
    Pie/donut chart showing effort allocation by class.
    """
    
    # Check data sufficiency
    session_count = db.session.query(StudySession).filter(
        StudySession.user_id == current_user.user_id,
        StudySession.is_completed == True
    ).count()
    
    if session_count < MIN_STUDY_SESSIONS:
        return jsonify({
            "empty": True,
            "message": f"Need at least {MIN_STUDY_SESSIONS} study sessions"
        })
    
    # Get all study sessions
    sessions = db.session.query(
        StudySession.class_id,
        StudySession.duration_minutes,
        Class.class_name,
        Class.color
    ).join(
        Class, Class.class_id == StudySession.class_id
    ).filter(
        StudySession.user_id == current_user.user_id,
        StudySession.is_completed == True,
        StudySession.duration_minutes.isnot(None)
    ).all()
    
    if not sessions:
        return jsonify({"empty": True, "message": "No completed study sessions"})
    
    # Convert to dict format
    session_data = [
        {
            'class_id': s.class_id,
            'duration_minutes': s.duration_minutes,
            'class_name': s.class_name,
            'color': s.color
        }
        for s in sessions
    ]
    
    # Compute allocation
    allocation = effort_allocation_by_class(session_data)
    
    if not allocation:
        return jsonify({"empty": True, "message": "No data available"})
    
    # Build response
    class_map = {s.class_id: (s.class_name, s.color) for s in sessions}
    
    labels = []
    values = []
    colors = []
    
    for class_id, percentage in sorted(allocation.items(), key=lambda x: x[1], reverse=True):
        if class_id in class_map:
            labels.append(class_map[class_id][0])
            values.append(percentage)
            colors.append(class_map[class_id][1])
    
    return jsonify({
        "empty": False,
        "labels": labels,
        "values": values,
        "colors": colors
    })


# =================== GRAPH 4: Outcome Contribution ===================
@charts.route("/dashboard/outcome_contribution")
@login_required
def outcome_contribution():
    """
    Pie/donut chart showing outcome contribution by class.
    """
    
    # Check data sufficiency
    grade_count = db.session.query(Assignment).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.grade.isnot(None)
    ).count()
    
    if grade_count < MIN_ASSIGNMENTS_WITH_GRADES:
        return jsonify({
            "empty": True,
            "message": f"Need at least {MIN_ASSIGNMENTS_WITH_GRADES} graded assignments"
        })
    
    # Get graded assignments
    assignments = db.session.query(
        Assignment.class_id,
        Assignment.grade,
        Class.class_name,
        Class.color
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.grade.isnot(None)
    ).all()
    
    if not assignments:
        return jsonify({"empty": True, "message": "No graded assignments"})
    
    # Convert to dict format
    assignment_data = [
        {
            'class_id': a.class_id,
            'grade': float(a.grade),
            'class_name': a.class_name,
            'color': a.color
        }
        for a in assignments
    ]
    
    # Compute contribution
    contribution = outcome_contribution_by_class(assignment_data)
    
    if not contribution:
        return jsonify({"empty": True, "message": "No data available"})
    
    # Build response
    class_map = {a.class_id: (a.class_name, a.color) for a in assignments}
    
    labels = []
    values = []
    colors = []
    
    for class_id, percentage in sorted(contribution.items(), key=lambda x: x[1], reverse=True):
        if class_id in class_map:
            labels.append(class_map[class_id][0])
            values.append(percentage)
            colors.append(class_map[class_id][1])
    
    return jsonify({
        "empty": False,
        "labels": labels,
        "values": values,
        "colors": colors
    })