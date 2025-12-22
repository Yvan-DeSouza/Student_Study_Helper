from flask import Blueprint, request, redirect, url_for, render_template
from flask_login import login_required, current_user
from app.extensions import db
from app.models.assignment import Assignment
from app.models.course import Class
from datetime import datetime

assignment = Blueprint("assignment", __name__)

@assignment.route("/assignment/new", methods=["POST"])
@login_required
def add_assignment():
    class_id = request.form.get("class_id")

    # 🔐 Security check: class must belong to current user
    course = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    is_graded = "is_graded" in request.form

    ponderation = None
    if is_graded:
        ponderation = request.form.get("ponderation")
        ponderation = int(ponderation) if ponderation else None

    due_date = request.form.get("due_date")
    due_date = (
        datetime.fromisoformat(due_date).date()
        if due_date else None
    )
    estimated_minutes = request.form.get("estimated_minutes")
    estimated_minutes = (
        int(estimated_minutes) if estimated_minutes else None
    )

    assignment = Assignment(
        estimated_minutes = estimated_minutes,
        assignment_type = request.form["assignment-type"],
        class_id=course.class_id,
        title=request.form["assignment-title"],
        due_date=due_date,
        is_graded=is_graded,
        ponderation=ponderation
    )

    db.session.add(assignment)
    db.session.commit()
    return redirect(url_for("main.home"))

@assignment.route("/assignments")
@login_required
def list_assignments():
    return render_template("assignments.html")

