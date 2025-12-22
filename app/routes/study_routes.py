from flask import Blueprint, request, redirect, url_for
from flask_login import login_required, current_user
from app.extensions import db
from app.models.study_session import StudySession
from app.models.course import Class
from app.models.assignment import Assignment
from datetime import datetime

study = Blueprint("study", __name__)

@study.route("/study")
@login_required
def study_sessions():
    return render_template("study.html")

@study.route("/study/new", methods=["GET", "POST"])
@login_required
def add_session():
    from flask import render_template

    if request.method == "POST":
        class_id = request.form.get("class_id")
        assignment_id = request.form.get("assignment_id") or None
        session_type = request.form.get("session_type")
        expected_duration = request.form.get("expected_duration_minutes") or None
        expected_duration = int(expected_duration) if expected_duration else None

        # 🔐 Security: class must belong to current user
        course = Class.query.filter_by(class_id=class_id, user_id=current_user.user_id).first_or_404()

        # Optional: check assignment belongs to the class
        assignment = None
        if assignment_id:
            assignment = Assignment.query.filter_by(
                assignment_id=assignment_id, class_id=course.class_id
            ).first_or_404()
            assignment_id = assignment.assignment_id

        # session_date: default to today
        session_date = datetime.utcnow().date()

        session = StudySession(
            class_id=course.class_id,
            assignment_id=assignment_id,
            session_type=session_type,
            expected_duration_minutes=expected_duration,
            session_date=session_date
        )

        db.session.add(session)
        db.session.commit()

        # Redirect back to study sessions page
        return redirect(url_for("study.study_sessions"))

    # GET request: render form
    classes = Class.query.filter_by(user_id=current_user.user_id).all()
    assignments = Assignment.query.filter_by(user_id=current_user.user_id).all()  # optional: filter by class if you want
    return render_template("new_study.html", classes=classes, assignments=assignments)
