from flask import Blueprint, request, redirect, url_for, render_template
from flask_login import login_required, current_user
from app.extensions import db
from app.models.study_session import StudySession
from app.models.course import Class
from app.models.assignment import Assignment
from datetime import datetime, timezone
study = Blueprint("study", __name__)

@study.route("/study")
@login_required
def study_sessions():
    return redirect(url_for("main.home"))

@study.route("/study/new", methods=["GET", "POST"])
@login_required
def add_session():
    if request.method == "POST":
        existing_active = StudySession.query.filter_by(
            user_id=current_user.user_id,
            is_active=True
        ).first()

        if existing_active:
            return "You already have an active study session", 400
  
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

        start_option = request.form.get("start_option")  # "now" or "later"
        started_at_input = request.form.get("started_at")
        now = datetime.now(timezone.utc)

        if start_option == "now":
            started_at = now
            is_active = True
        elif start_option == "later":
            if not started_at_input:
                return "Started at is required for future sessions", 400
            started_at = datetime.fromisoformat(started_at_input).astimezone(timezone.utc)
            is_active = False




        session = StudySession(
            user_id=current_user.user_id,
            class_id=course.class_id,
            assignment_id=assignment_id,
            title=request.form.get("title"),
            session_type=session_type,
            expected_duration_minutes=expected_duration,
            started_at=started_at,
            is_active=is_active
        )

        db.session.add(session)
        db.session.commit()

        # Redirect back to home page
        return redirect(url_for("main.home"))


    # GET request: render form
    # Get all classes for the current user
    classes = Class.query.filter_by(user_id=current_user.user_id).all()

    # Get all assignments for these classes
    assignments = Assignment.query.filter(
        Assignment.class_id.in_([c.class_id for c in classes])
    ).all()

    # Render the form template and pass the data
    return render_template(
        "new_study.html",
        classes=classes,
        assignments=assignments
    )


@study.route("/study/<int:session_id>/end", methods=["POST"])
@login_required
def end_session(session_id):
    now = datetime.now(timezone.utc)
    session = StudySession.query.filter(
        StudySession.session_id == session_id,
        StudySession.user_id == current_user.user_id,
        StudySession.is_active == True,
        StudySession.started_at <= now
    ).first_or_404()

    if session.is_completed:
        return {"error": "Session already ended"}, 400

    if request.is_json:
        session_end_input = request.json.get("session_end")
    else:
        session_end_input = request.form.get("session_end")

    session_end = datetime.fromisoformat(session_end_input).astimezone(timezone.utc) if session_end_input else now

    session.session_end = session_end
    session.duration_minutes = int((session.session_end - session.started_at).total_seconds() / 60)
    session.is_active = False
    session.is_completed = True

    db.session.commit()

    return {"success": True, "duration_minutes": session.duration_minutes}


@study.route("/study/active", methods=["GET"])
@login_required
def active_session():
    now = datetime.now(timezone.utc)
    session = StudySession.query.filter(
        StudySession.user_id == current_user.user_id,
        StudySession.is_active == True,
        StudySession.started_at <= now
    ).first()

    if not session:
        return {"active": False, "session": None}

    elapsed_minutes = int((now - session.started_at).total_seconds() / 60)

    return {
        "active": True,
        "session": {
            "session_id": session.session_id,
            "title": session.title,
            "class_id": session.class_id,
            "assignment_id": session.assignment_id,
            "session_type": session.session_type,
            "started_at": session.started_at.isoformat(),
            "expected_duration_minutes": session.expected_duration_minutes,
            "elapsed_minutes": elapsed_minutes
        }
    }


