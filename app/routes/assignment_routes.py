from flask import Blueprint, request, jsonify, redirect, url_for, render_template, abort
from flask_login import login_required, current_user
from app.extensions import db
from app.models.assignment import Assignment, AssignmentExpectedGrade
from app.models.course import Class
from app.models.user import UserPreferences
from datetime import datetime
from dateutil import parser

assignment = Blueprint("assignment", __name__)

# ---------------- ADD ASSIGNMENT ----------------
@assignment.route("/assignment", methods=["POST"])
@login_required
def add_assignment():
    class_id = request.form.get("class_id")
    course = Class.query.filter_by(class_id=class_id, user_id=current_user.user_id).first_or_404()

    is_graded = "is_graded" in request.form
    ponderation = int(request.form.get("ponderation")) if is_graded and request.form.get("ponderation") else None
    due_at = datetime.fromisoformat(request.form.get("due_at")).date() if request.form.get("due_at") else None
    estimated_minutes = int(request.form.get("estimated_minutes")) if request.form.get("estimated_minutes") else None
    difficulty = int(request.form.get("difficulty")) if request.form.get("difficulty") else None
    pass_grade = float(request.form.get("pass_grade")) if request.form.get("pass_grade") else None
    expected_grade = float(request.form.get("expected_grade")) if request.form.get("expected_grade") else None

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
        pass_grade=pass_grade
    )

    db.session.add(new_assignment)
    db.session.commit()
    return redirect(url_for("main.home"))

# ---------------- LIST ASSIGNMENTS ----------------
@assignment.route("/assignments")
@login_required
def list_assignments():
    assignments = (
        db.session.query(
            Assignment,
            Class.class_name,
            Class.importance.label('class_importance'),
            Class.class_type.label('class_type'),
            Class.is_finished.label('class_is_finished'),
            Assignment.created_at.label('created_at'),
            Assignment.study_minutes.label('study_minutes')
        )
        .join(Class, Assignment.class_id == Class.class_id)
        .filter(Class.user_id == current_user.user_id)
        .order_by(Assignment.due_at.asc())
        .all()
    )

    rows = [
        {
            "assignment_id": a.assignment_id,
            "title": a.title,
            "assignment_type": a.assignment_type,
            "due_at": a.due_at,
            "is_completed": a.is_completed,
            "grade": a.grade,
            "is_graded": a.is_graded,
            "ponderation": a.ponderation,
            "class_id": a.class_id,
            "expected_grade": a.expected_grade,
            "estimated_minutes": a.estimated_minutes,
            "difficulty": a.difficulty,
            "finished_at": a.finished_at,
            "pass_grade": a.pass_grade,
            "class_name": class_name,
            "class_importance": class_importance,
            "class_type": class_type,
            "class_is_finished": class_is_finished,
            "created_at": created_at,
            "study_minutes": study_minutes
        }
        for a, class_name, class_importance, class_type, class_is_finished, created_at, study_minutes in assignments
    ]

    prefs = UserPreferences.query.filter_by(user_id=current_user.user_id).first()
    deadline_count = prefs.default_upcoming_deadlines_count if prefs else 3
    classes = Class.query.filter_by(user_id=current_user.user_id).all()

    return render_template("assignments.html", assignments=rows, classes=classes, deadline_count=deadline_count)

# ---------------- UPDATE / GRADE / COMPLETE ASSIGNMENT ----------------
@assignment.route("/assignments/<int:assignment_id>/update", methods=["PATCH"])
@login_required
def update_assignment(assignment_id):
    data = request.get_json()
    assignment = Assignment.query.filter_by(assignment_id=assignment_id, user_id=current_user.user_id).first_or_404()

    prev_expected = assignment.expected_grade

    # --- Basic fields ---
    assignment.title = data.get("title", assignment.title)
    assignment.assignment_type = data.get("assignment_type", assignment.assignment_type)
    new_class_id = data.get("class_id")
    if new_class_id:
        course = Class.query.filter_by(class_id=new_class_id, user_id=current_user.user_id).first_or_404()
        assignment.class_id = course.class_id

    def parse_int(val): return int(val) if val not in (None, "", "null") else None
    def parse_float(val): return float(val) if val not in (None, "", "null") else None
    def parse_date(val): return parser.isoparse(val) if val not in (None, "", "null") else None

    assignment.difficulty = parse_int(data.get("difficulty"))
    assignment.estimated_minutes = parse_int(data.get("estimated_minutes"))
    assignment.due_at = parse_date(data.get("due_at"))
    assignment.is_completed = parse_date(data.get("finished_at")) is not None
    assignment.finished_at = parse_date(data.get("finished_at"))

    # --- Only update grading info if provided ---
    if "is_graded" in data:
        assignment.is_graded = bool(data.get("is_graded"))

    if assignment.is_graded:
        if "ponderation" in data:
            assignment.ponderation = parse_int(data.get("ponderation"))
        if "pass_grade" in data:
            assignment.pass_grade = parse_float(data.get("pass_grade"))
        if "expected_grade" in data:
            assignment.expected_grade = parse_float(data.get("expected_grade"))
        if "grade" in data:
            assignment.grade = parse_float(data.get("grade"))
    else:
        # Only reset if explicitly ungrading
        if "is_graded" in data and not assignment.is_graded:
            assignment.ponderation = assignment.pass_grade = assignment.expected_grade = assignment.grade = None
    # --- Expected grade history ---
    if assignment.expected_grade != prev_expected and assignment.expected_grade is not None:
        db.session.add(AssignmentExpectedGrade(
            assignment_id=assignment.assignment_id,
            user_id=current_user.user_id,
            expected_grade=assignment.expected_grade
        ))

    db.session.commit()
    return jsonify({"status": "updated"}), 200


# ---------------- DELETE ----------------
@assignment.route("/assignments/<int:assignment_id>", methods=["DELETE"])
@login_required
def delete_assignment(assignment_id):
    assignment = Assignment.query.filter_by(assignment_id=assignment_id, user_id=current_user.user_id).first_or_404()
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"success": True})

# ---------------- SUMMARY ----------------
@assignment.route("/assignments/<int:assignment_id>/summary", methods=["GET"])
@login_required
def assignment_summary(assignment_id):
    assignment = Assignment.query.filter_by(assignment_id=assignment_id, user_id=current_user.user_id).first_or_404()
    return jsonify({
        "assignment_id": assignment.assignment_id,
        "title": assignment.title,
        "study_session_count": assignment.study_session_count,
        "study_minutes": assignment.study_minutes
    })
