"""
app/routes/calendar_data_routes.py

Calendar-specific data API endpoints.
These are SEPARATE from the main assignment/class/session routes so nothing
existing is touched. The calendar frontend calls these exclusively for its
own create/read/update flows.

"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timezone

from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession

cal_data = Blueprint("cal_data", __name__)


# ─────────────────────────────────────────────────────────────
# CLASSES
# ─────────────────────────────────────────────────────────────

@cal_data.route("/api/calendar/classes", methods=["GET"])
@login_required
def get_classes():
    """List the current user's classes for dropdowns."""
    classes = (
        Class.query
        .filter_by(user_id=current_user.user_id)
        .order_by(Class.class_name)
        .all()
    )
    return jsonify([
        {"class_id": c.class_id, "class_name": c.class_name, "color": c.color or "#6366f1"}
        for c in classes
    ])


# ─────────────────────────────────────────────────────────────
# ASSIGNMENTS — list, detail, create, update
# ─────────────────────────────────────────────────────────────

@cal_data.route("/api/calendar/assignments", methods=["GET"])
@login_required
def get_assignments():
    """
    List assignments for dropdowns.
    Optional ?class_id=<int> to filter by class.
    """
    class_id = request.args.get("class_id", type=int)
    q = (
        Assignment.query
        .join(Class, Assignment.class_id == Class.class_id)
        .filter(Class.user_id == current_user.user_id)
    )
    if class_id:
        q = q.filter(Assignment.class_id == class_id)
    assignments = q.order_by(Assignment.title).all()
    return jsonify([
        {"assignment_id": a.assignment_id, "title": a.title, "class_id": a.class_id}
        for a in assignments
    ])


@cal_data.route("/api/calendar/assignments/<int:assignment_id>", methods=["GET"])
@login_required
def get_assignment(assignment_id):
    """Full assignment data for the edit modal."""
    a = Assignment.query.filter_by(
        assignment_id=assignment_id,
        user_id=current_user.user_id,
    ).first_or_404()

    return jsonify({
        "id":                  a.assignment_id,
        "title":               a.title,
        "assignment_type":     a.assignment_type,
        "class_id":            a.class_id,
        "due_at":              a.due_at.isoformat()       if a.due_at       else None,
        "finished_at":         a.finished_at.isoformat()  if a.finished_at  else None,
        "is_graded":           bool(a.is_graded),
        "expected_grade":      float(a.expected_grade)    if a.expected_grade is not None else None,
        "pass_grade":          float(a.pass_grade)        if a.pass_grade    is not None else None,
        "ponderation":         a.ponderation,
        "difficulty":          a.difficulty,
        "estimated_minutes":   a.estimated_minutes,
        "is_completed":        bool(a.is_completed),
    })


@cal_data.route("/api/calendar/assignments", methods=["POST"])
@login_required
def create_assignment():
    """
    Create a new assignment from the calendar.
    Accepts multipart/form-data (from the existing add_assignment.html form).
    """
    form = request.form

    class_id = form.get("class_id", type=int)
    if not class_id:
        return jsonify({"success": False, "error": "class_id required"}), 400

    course = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id,
    ).first_or_404()

    title = form.get("assignment_title") or form.get("title")
    if not title:
        return jsonify({"success": False, "error": "title required"}), 400

    def _parse_dt(v):
        if not v:
            return None
        try:
            return datetime.fromisoformat(v)
        except ValueError:
            return None

    def _parse_int(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    def _parse_float(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    is_graded = form.get("is_graded") in ("on", "true", "1", "yes")

    assignment = Assignment(
        user_id=current_user.user_id,
        class_id=course.class_id,
        title=title,
        assignment_type=form.get("assignment_type", "homework"),
        due_at=_parse_dt(form.get("due_at")),
        is_graded=is_graded,
        expected_grade=_parse_float(form.get("expected_grade")) if is_graded else None,
        pass_grade=_parse_float(form.get("pass_grade"))         if is_graded else None,
        ponderation=_parse_int(form.get("ponderation"))         if is_graded else None,
        difficulty=_parse_int(form.get("difficulty")),
        estimated_minutes=_parse_int(form.get("estimated_minutes")),
    )
    db.session.add(assignment)
    db.session.commit()

    return jsonify({"success": True, "assignment_id": assignment.assignment_id})


@cal_data.route("/api/calendar/assignments/<int:assignment_id>", methods=["PATCH"])
@login_required
def update_assignment(assignment_id):
    """Update an assignment from the calendar edit modal. Accepts JSON."""
    a = Assignment.query.filter_by(
        assignment_id=assignment_id,
        user_id=current_user.user_id,
    ).first_or_404()

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "JSON body required"}), 400

    def _dt(v):
        if not v:
            return None
        try:
            return datetime.fromisoformat(v)
        except ValueError:
            return None

    def _int(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    def _float(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    if "title"           in data: a.title           = data["title"]
    if "assignment_type" in data: a.assignment_type = data["assignment_type"]
    if "difficulty"      in data: a.difficulty      = _int(data["difficulty"])
    if "estimated_minutes" in data: a.estimated_minutes = _int(data["estimated_minutes"])
    if "due_at"          in data: a.due_at          = _dt(data["due_at"])

    # Graded fields
    if "is_graded" in data:
        a.is_graded = bool(data["is_graded"])
    if a.is_graded:
        if "expected_grade" in data: a.expected_grade = _float(data["expected_grade"])
        if "pass_grade"     in data: a.pass_grade     = _float(data["pass_grade"])
        if "ponderation"    in data: a.ponderation    = _int(data["ponderation"])
    else:
        a.expected_grade = a.pass_grade = a.ponderation = None

    # Completion
    if "finished_at" in data:
        finished = _dt(data["finished_at"])
        a.finished_at  = finished
        a.is_completed = finished is not None

    if "class_id" in data:
        new_class = Class.query.filter_by(
            class_id=data["class_id"],
            user_id=current_user.user_id,
        ).first()
        if new_class:
            a.class_id = new_class.class_id

    db.session.commit()
    return jsonify({"success": True})


# ─────────────────────────────────────────────────────────────
# SESSIONS — detail, create, update
# ─────────────────────────────────────────────────────────────

@cal_data.route("/api/calendar/sessions/<int:session_id>", methods=["GET"])
@login_required
def get_session(session_id):
    """Full session data for the edit modal."""
    s = StudySession.query.filter_by(
        session_id=session_id,
        user_id=current_user.user_id,
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


@cal_data.route("/api/calendar/sessions", methods=["POST"])
@login_required
def create_session():
    """
    Create a new study session from the calendar.
    Accepts multipart/form-data.
    """
    existing_active = StudySession.query.filter_by(
        user_id=current_user.user_id,
        is_active=True,
    ).first()
    if existing_active:
        return jsonify({"success": False, "error": "ACTIVE_SESSION_EXISTS"}), 400

    form      = request.form
    class_id  = form.get("class_id", type=int)
    if not class_id:
        return jsonify({"success": False, "error": "class_id required"}), 400

    course = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id,
    ).first_or_404()

    assignment_id = form.get("assignment_id", type=int)
    if assignment_id:
        asgn = Assignment.query.filter_by(
            assignment_id=assignment_id,
            class_id=course.class_id,
        ).first()
        assignment_id = asgn.assignment_id if asgn else None

    def _parse_dt(v):
        if not v:
            return None
        try:
            return datetime.fromisoformat(v).astimezone(timezone.utc)
        except ValueError:
            return None

    start_option = form.get("start_option", "later")
    now          = datetime.now(timezone.utc)

    if start_option == "now":
        started_at      = now
        scheduled_start = None
        scheduled_end   = None
        is_active       = True
    else:
        sched_start_val = form.get("scheduled_start_at") or form.get("started_at")
        if not sched_start_val:
            return jsonify({"success": False, "error": "scheduled_start_at required"}), 400
        scheduled_start = _parse_dt(sched_start_val)
        scheduled_end   = _parse_dt(form.get("scheduled_end_at"))
        started_at      = None
        is_active       = False

    exp_dur_raw = form.get("expected_duration_minutes")
    exp_dur     = int(exp_dur_raw) if exp_dur_raw else None

    session = StudySession(
        user_id=current_user.user_id,
        class_id=course.class_id,
        assignment_id=assignment_id,
        title=form.get("title"),
        session_type=form.get("session_type", "homework"),
        expected_duration_minutes=exp_dur,
        started_at=started_at,
        scheduled_start_at=scheduled_start,
        scheduled_end_at=scheduled_end,
        is_active=is_active,
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({"success": True, "session_id": session.session_id})


@cal_data.route("/api/calendar/sessions/<int:session_id>", methods=["PATCH"])
@login_required
def update_session(session_id):
    """Update a scheduled session from the calendar edit modal. Accepts JSON."""
    s = StudySession.query.filter_by(
        session_id=session_id,
        user_id=current_user.user_id,
    ).first_or_404()

    if s.is_active or s.is_completed or s.cancelled_at is not None:
        return jsonify({"success": False, "error": "Cannot edit this session"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "JSON body required"}), 400

    def _dt(v):
        if not v:
            return None
        try:
            return datetime.fromisoformat(v).astimezone(timezone.utc)
        except ValueError:
            return None

    if "title"       in data: s.title       = data["title"]
    if "session_type" in data: s.session_type = data["session_type"]
    if "expected_duration_minutes" in data:
        v = data["expected_duration_minutes"]
        s.expected_duration_minutes = int(v) if v else None
    if "scheduled_start_at" in data: s.scheduled_start_at = _dt(data["scheduled_start_at"])
    if "scheduled_end_at"   in data: s.scheduled_end_at   = _dt(data["scheduled_end_at"])

    db.session.commit()
    return jsonify({"success": True})