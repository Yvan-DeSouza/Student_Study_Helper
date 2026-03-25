from flask import Blueprint, request, redirect, url_for, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.study_session import StudySession
from app.models.course import Class
from app.models.assignment import Assignment
from datetime import datetime, timezone
from dateutil import parser as dtparser

study = Blueprint("study", __name__)


@study.route("/study")
@login_required
def study_sessions():
    return redirect(url_for("main.home"))


@study.route("/study/new", methods=["POST"])
@login_required
def add_session():
    existing_active = StudySession.query.filter_by(
        user_id=current_user.user_id,
        is_active=True
    ).first()

    if existing_active:
        return jsonify({"success": False, "error": "ACTIVE_SESSION_EXISTS"}), 400

    class_id      = request.form.get("class_id")
    assignment_id = request.form.get("assignment_id") or None
    session_type  = request.form.get("session_type")
    expected_dur  = request.form.get("expected_duration_minutes")
    expected_dur  = int(expected_dur) if expected_dur else None

    course = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    if assignment_id:
        asgn = Assignment.query.filter_by(
            assignment_id=assignment_id,
            class_id=course.class_id
        ).first_or_404()
        assignment_id = asgn.assignment_id

    start_option      = request.form.get("start_option")
    started_at_input  = request.form.get("started_at")
    now               = datetime.now(timezone.utc)

    if start_option == "now":
        started_at        = now
        scheduled_start   = None
        scheduled_end     = None
        is_active         = True
    else:
        if not started_at_input:
            return jsonify({"success": False, "error": "MISSING_STARTED_AT"}), 400
        scheduled_start   = datetime.fromisoformat(started_at_input).astimezone(timezone.utc)
        sched_end_input   = request.form.get("scheduled_end_at")
        scheduled_end     = datetime.fromisoformat(sched_end_input).astimezone(timezone.utc) if sched_end_input else None
        started_at        = None
        is_active         = False

    session = StudySession(
        user_id=current_user.user_id,
        class_id=course.class_id,
        assignment_id=assignment_id,
        title=request.form.get("title"),
        session_type=session_type,
        expected_duration_minutes=expected_dur,
        started_at=started_at,
        scheduled_start_at=scheduled_start,
        scheduled_end_at=scheduled_end,
        is_active=is_active,
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({"success": True, "session_id": session.session_id})


@study.route("/study/<int:session_id>/detail", methods=["GET"])
@login_required
def get_session_detail(session_id):
    s = StudySession.query.filter_by(
        session_id=session_id,
        user_id=current_user.user_id
    ).first_or_404()

    return jsonify({
        "session_id":               s.session_id,
        "title":                    s.title,
        "session_type":             s.session_type,
        "class_id":                 s.class_id,
        "class_name":               s.class_.class_name if s.class_ else None,
        "assignment_id":            s.assignment_id,
        "scheduled_start_at":       s.scheduled_start_at.isoformat() if s.scheduled_start_at else None,
        "scheduled_end_at":         s.scheduled_end_at.isoformat()   if s.scheduled_end_at   else None,
        "expected_duration_minutes": s.expected_duration_minutes,
        "is_active":                s.is_active,
        "is_completed":             s.is_completed,
        "is_cancelled":             s.cancelled_at is not None,
    })


# ── Update scheduled fields ────────────────────────────────────────────────────
@study.route("/study/<int:session_id>/update", methods=["PATCH"])
@login_required
def update_session(session_id):
    s = StudySession.query.filter_by(
        session_id=session_id,
        user_id=current_user.user_id
    ).first_or_404()

    if s.is_active or s.is_completed or s.cancelled_at:
        return jsonify({"success": False, "error": "Cannot edit this session"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "No data"}), 400

    if "title" in data:
        s.title = data["title"]
    if "session_type" in data:
        s.session_type = data["session_type"]
    if "expected_duration_minutes" in data:
        v = data["expected_duration_minutes"]
        s.expected_duration_minutes = int(v) if v else None
    if "scheduled_start_at" in data:
        v = data["scheduled_start_at"]
        s.scheduled_start_at = dtparser.isoparse(v).astimezone(timezone.utc) if v else None
    if "scheduled_end_at" in data:
        v = data["scheduled_end_at"]
        s.scheduled_end_at = dtparser.isoparse(v).astimezone(timezone.utc) if v else None

    db.session.commit()
    return jsonify({"success": True})


# ── End / cancel / start / reschedule ─────────────────────────────
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

    session_end_input = (request.json or {}).get("session_end") or request.form.get("session_end")
    session_end = datetime.fromisoformat(session_end_input).astimezone(timezone.utc) if session_end_input else now

    session.session_end      = session_end
    session.duration_minutes = int((session.session_end - session.started_at).total_seconds() / 60)
    session.is_active        = False
    session.is_completed     = True
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
            "elapsed_minutes": elapsed_minutes,
        },
    }


@study.route("/study/<int:session_id>/cancel", methods=["POST"])
@login_required
def cancel_session(session_id):
    session = StudySession.query.filter_by(
        session_id=session_id,
        user_id=current_user.user_id,
        is_active=False,
        cancelled_at=None,
    ).first_or_404()
    session.cancelled_at = datetime.now(timezone.utc)
    db.session.commit()
    return {"success": True}


@study.route("/study/<int:session_id>/start", methods=["POST"])
@login_required
def start_scheduled_session(session_id):
    now = datetime.now(timezone.utc)
    session = StudySession.query.filter(
        StudySession.session_id == session_id,
        StudySession.user_id == current_user.user_id,
        StudySession.is_active == False,
        StudySession.is_completed == False,
        StudySession.cancelled_at.is_(None),
    ).first_or_404()

    existing_active = StudySession.query.filter(
        StudySession.user_id == current_user.user_id,
        StudySession.is_active == True,
    ).first()
    if existing_active:
        return {"success": False, "error": "Active session already exists"}, 400

    if session.scheduled_start_at and session.scheduled_start_at > now:
        return {"success": False, "error": "Session is not due yet"}, 400

    session.started_at = now
    session.is_active  = True
    db.session.commit()
    return {"success": True}


@study.route("/study/<int:session_id>/reschedule", methods=["POST"])
@login_required
def reschedule_session(session_id):
    session = StudySession.query.filter(
        StudySession.session_id == session_id,
        StudySession.user_id == current_user.user_id,
        StudySession.is_active == False,
        StudySession.is_completed == False,
        StudySession.cancelled_at.is_(None),
    ).first_or_404()

    data = request.get_json()
    if not data or "scheduled_start_at" not in data:
        return {"success": False, "error": "Missing scheduled_start_at"}, 400

    try:
        new_time = datetime.fromisoformat(data["scheduled_start_at"]).astimezone(timezone.utc)
    except ValueError:
        return {"success": False, "error": "Invalid datetime format"}, 400

    if new_time <= datetime.now(timezone.utc):
        return {"success": False, "error": "New time must be in the future"}, 400

    session.scheduled_start_at = new_time
    session.rescheduled_count += 1
    db.session.commit()
    return {"success": True}