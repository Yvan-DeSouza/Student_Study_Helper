# routes/upcoming_deadlines_routes.py
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models.assignment import Assignment
from app.models.course import Class
from app.models.user import UserPreferences, UserAssignmentTypeColor
from app.services.analytics.computation.expected import estimate_expected_minutes
from datetime import datetime, timezone
from sqlalchemy import case

upcoming_deadlines = Blueprint("upcoming_deadlines", __name__)

@upcoming_deadlines.route("/api/upcoming-deadlines", methods=["GET"])
@login_required
def get_upcoming_deadlines():
    """
    Get top N upcoming uncompleted assignments.
    N is determined by user preference or query param.
    """
    # Get count from query param or user preferences
    count_param = request.args.get('count', type=int)
    
    if count_param is not None:
        # Validate count is between 0-10
        if count_param < 0 or count_param > 10:
            return jsonify({"error": "Count must be between 0 and 10"}), 400
        count = count_param
    else:
        # Get from user preferences
        prefs = UserPreferences.query.filter_by(user_id=current_user.user_id).first()
        count = prefs.default_upcoming_deadlines_count if prefs else 3
    
    # If count is 0, return empty
    if count == 0:
        return jsonify({
            "assignments": [],
            "requested": 0,
            "total_uncompleted": 0,
            "assignment_type_colors": {}
        })
    
    # Get assignment type colors
    type_colors_query = UserAssignmentTypeColor.query.filter_by(
        user_id=current_user.user_id
    ).all()
    
    assignment_type_colors = {
        tc.assignment_type: tc.color
        for tc in type_colors_query
    }
    
    # Get all uncompleted assignments with their class info
    assignments_query = db.session.query(
        Assignment,
        Class.class_name,
        Class.class_type,
        Class.color
    ).join(
        Class, Assignment.class_id == Class.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == False
    )
    
    # Get total count of uncompleted
    total_uncompleted = assignments_query.count()
    
    # Order by: assignments with due_at first (soonest first), then by created_at
    assignments_query = assignments_query.order_by(
        case(
            (Assignment.due_at.is_(None), 1),
            else_=0
        ),
        Assignment.due_at.asc().nullslast(),
        Assignment.created_at.asc()
    ).limit(count)
    
    results = assignments_query.all()
    
    # Get past assignments for estimation
    past_assignments_data = db.session.query(
        Assignment.assignment_type,
        Assignment.study_minutes.label('study_minutes'),
        Assignment.difficulty,
        Class.class_type,
        Class.class_id
    ).join(
        Class, Assignment.class_id == Class.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == True,
        Assignment.study_minutes.isnot(None)
    ).all()
    
    past_assignments = [
        {
            'class_type': p.class_type,
            'assignment_type': p.assignment_type,
            'class_id': p.class_id,
            'actual_minutes': p.study_minutes,
            'difficulty': p.difficulty
        }
        for p in past_assignments_data
    ]
    
    # Format results
    assignments_list = []
    now = datetime.now(timezone.utc)
    
    for assignment, class_name, class_type, class_color in results:
        # Calculate estimated minutes if not provided
        if assignment.estimated_minutes:
            estimated_minutes = assignment.estimated_minutes
            is_user_estimate = True
        else:
            estimated_minutes = estimate_expected_minutes(
                class_type,
                assignment.assignment_type,
                assignment.class_id,
                past_assignments
            )
            is_user_estimate = False
        
        # Calculate status (overdue, soon, normal)
        status = "normal"
        if assignment.due_at:
            time_until_due = (assignment.due_at - now).total_seconds() / 3600  # hours
            if time_until_due < 0:
                status = "overdue"
            elif time_until_due < 48:  # less than 2 days
                status = "soon"
        
        assignments_list.append({
            "assignment_id": assignment.assignment_id,
            "title": assignment.title,
            "assignment_type": assignment.assignment_type,
            "class_name": class_name,
            "class_color": class_color,
            "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
            "study_minutes": assignment.study_minutes or 0,
            "estimated_minutes": estimated_minutes,
            "is_user_estimate": is_user_estimate,
            "study_session_count": assignment.study_session_count,
            "status": status,
            "created_at": assignment.created_at.isoformat()
        })
    
    return jsonify({
        "assignments": assignments_list,
        "requested": count,
        "total_uncompleted": total_uncompleted,
        "assignment_type_colors": assignment_type_colors
    })

@upcoming_deadlines.route("/api/user-preferences/deadlines-count", methods=["POST"])
@login_required
def update_deadlines_count():
    """Update user's default upcoming deadlines count."""
    data = request.get_json()
    count = data.get('count')
    
    if count is None or count < 0 or count > 10:
        return jsonify({"error": "Count must be between 0 and 10"}), 400
    
    # Get or create preferences
    prefs = UserPreferences.query.filter_by(user_id=current_user.user_id).first()
    if not prefs:
        prefs = UserPreferences(user_id=current_user.user_id)
        db.session.add(prefs)
    
    prefs.default_upcoming_deadlines_count = count
    db.session.commit()
    
    return jsonify({"success": True, "count": count})

