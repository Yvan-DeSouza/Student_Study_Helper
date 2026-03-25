

from flask import Blueprint, request, jsonify, render_template
from flask_login import login_required, current_user
from app.extensions import db
from app.models.assignment import Assignment, AssignmentExpectedGrade
from app.models.course import Class
from app.models.user import UserPreferences
from datetime import datetime
from dateutil import parser

assignment = Blueprint("assignment", __name__)


@assignment.route("/assignment", methods=["POST"])
@login_required
def add_assignment():
    class_id = request.form.get("class_id")
    course = Class.query.filter_by(class_id=class_id, user_id=current_user.user_id).first_or_404()

    is_graded         = "is_graded" in request.form
    ponderation       = int(request.form.get("ponderation")) if is_graded and request.form.get("ponderation") else None
    due_at            = datetime.fromisoformat(request.form.get("due_at")) if request.form.get("due_at") else None
    estimated_minutes = int(request.form.get("estimated_minutes")) if request.form.get("estimated_minutes") else None
    difficulty        = int(request.form.get("difficulty")) if request.form.get("difficulty") else None
    pass_grade        = float(request.form.get("pass_grade")) if request.form.get("pass_grade") else None
    expected_grade    = float(request.form.get("expected_grade")) if request.form.get("expected_grade") else None

    new_assignment = Assignment(
        user_id=current_user.user_id,
        estimated_minutes=estimated_minutes,
        assignment_type=request.form.get("assignment_type"),
        class_id=course.class_id,
        title=request.form.get("assignment_title"),
        due_at=due_at,
        is_graded=is_graded,
        expected_grade=expected_grade,
        ponderation=ponderation,
        difficulty=difficulty,
        pass_grade=pass_grade,
    )
    db.session.add(new_assignment)
    db.session.commit()
    return jsonify({"success": True, "assignment_id": new_assignment.assignment_id})


@assignment.route("/assignments/json")
@login_required
def list_assignments_json():
    assignments_list = Assignment.query.join(Class).filter(Class.user_id == current_user.user_id).all()
    return jsonify([{
        "assignment_id": a.assignment_id,
        "title": a.title,
        "class_id": a.class_id,
        "assignment_type": a.assignment_type,
    } for a in assignments_list])


# ─── NEW: detail endpoint for calendar edit ──────────────────────────────────
@assignment.route("/assignments/<int:assignment_id>/detail", methods=["GET"])
@login_required
def get_assignment_detail(assignment_id):
    a = Assignment.query.filter_by(
        assignment_id=assignment_id,
        user_id=current_user.user_id,
    ).first_or_404()
    return jsonify({
        "id":                a.assignment_id,
        "title":             a.title,
        "assignment_type":   a.assignment_type,
        "class_id":          a.class_id,
        "due_at":            a.due_at.isoformat()      if a.due_at      else None,
        "finished_at":       a.finished_at.isoformat() if a.finished_at else None,
        "is_graded":         a.is_graded,
        "expected_grade":    float(a.expected_grade)   if a.expected_grade else None,
        "pass_grade":        float(a.pass_grade)       if a.pass_grade    else None,
        "ponderation":       a.ponderation,
        "difficulty":        a.difficulty,
        "estimated_minutes": a.estimated_minutes,
    })


@assignment.route("/assignments")
@login_required
def list_assignments():
    assignments = (
        db.session.query(
            Assignment,
            Class.class_name,
            Class.importance.label("class_importance"),
            Class.class_type.label("class_type"),
            Class.is_finished.label("class_is_finished"),
            Assignment.created_at.label("created_at"),
            Assignment.study_minutes.label("study_minutes"),
        )
        .join(Class, Assignment.class_id == Class.class_id)
        .filter(Class.user_id == current_user.user_id)
        .order_by(Assignment.due_at.asc())
        .all()
    )

    rows = [{
        "assignment_id": a.assignment_id, "title": a.title,
        "assignment_type": a.assignment_type, "due_at": a.due_at,
        "is_completed": a.is_completed, "grade": a.grade,
        "is_graded": a.is_graded, "ponderation": a.ponderation,
        "class_id": a.class_id, "expected_grade": a.expected_grade,
        "estimated_minutes": a.estimated_minutes, "difficulty": a.difficulty,
        "finished_at": a.finished_at, "pass_grade": a.pass_grade,
        "class_name": cn, "class_importance": ci, "class_type": ct,
        "class_is_finished": cf, "created_at": cat, "study_minutes": sm,
    } for a, cn, ci, ct, cf, cat, sm in assignments]


    prefs        = UserPreferences.query.filter_by(user_id=current_user.user_id).first()
    deadline_count = prefs.default_upcoming_deadlines_count if prefs else 3
    classes      = Class.query.filter_by(user_id=current_user.user_id).all()
    return render_template("assignments.html", assignments=rows, classes=classes, deadline_count=deadline_count)


@assignment.route("/assignments/<int:assignment_id>/update", methods=["PATCH"])
@login_required
def update_assignment(assignment_id):
    data = request.get_json()
    a    = Assignment.query.filter_by(assignment_id=assignment_id, user_id=current_user.user_id).first_or_404()
    prev = a.expected_grade

    a.title           = data.get("title", a.title)
    a.assignment_type = data.get("assignment_type", a.assignment_type)
    new_class_id      = data.get("class_id")
    if new_class_id:
        course   = Class.query.filter_by(class_id=new_class_id, user_id=current_user.user_id).first_or_404()
        a.class_id = course.class_id

    def pi(v): return int(v)   if v not in (None, "", "null") else None
    def pf(v): return float(v) if v not in (None, "", "null") else None
    def pd(v): return parser.isoparse(v) if v not in (None, "", "null") else None

    if "difficulty"         in data: a.difficulty         = pi(data["difficulty"])
    if "estimated_minutes"  in data: a.estimated_minutes  = pi(data["estimated_minutes"])
    if "due_at"             in data: a.due_at             = pd(data["due_at"])
    if "is_graded"          in data: a.is_graded          = bool(data["is_graded"])

    if a.is_graded:
        if "ponderation"    in data: a.ponderation    = pi(data["ponderation"])
        if "pass_grade"     in data: a.pass_grade     = pf(data["pass_grade"])
        if "expected_grade" in data: a.expected_grade = pf(data["expected_grade"])
        if "grade"          in data: a.grade          = pf(data["grade"])
    else:
        if "is_graded" in data and not a.is_graded:
            a.ponderation = a.pass_grade = a.expected_grade = a.grade = None

    finished_at = pd(data.get("finished_at"))
    if finished_at:
        a.is_completed = True
    else:
        a.is_completed = False
        a.grade        = None
    a.finished_at = finished_at

    if a.expected_grade != prev and a.expected_grade is not None:
        db.session.add(AssignmentExpectedGrade(
            assignment_id=a.assignment_id,
            user_id=current_user.user_id,
            expected_grade=a.expected_grade,
        ))

    db.session.commit()
    return jsonify({"status": "updated"}), 200


@assignment.route("/assignments/<int:assignment_id>", methods=["DELETE"])
@login_required
def delete_assignment(assignment_id):
    a = Assignment.query.filter_by(assignment_id=assignment_id, user_id=current_user.user_id).first()
    if not a:
        return jsonify({"success": False, "error": "Assignment not found"}), 404
    db.session.delete(a)
    db.session.commit()
    return jsonify({"success": True})


@assignment.route("/assignments/<int:assignment_id>/summary", methods=["GET"])
@login_required
def assignment_summary(assignment_id):
    a = Assignment.query.filter_by(assignment_id=assignment_id, user_id=current_user.user_id).first_or_404()
    return jsonify({
        "assignment_id":    a.assignment_id,
        "title":            a.title,
        "study_session_count": a.study_session_count,
        "study_minutes":    a.study_minutes,
    })