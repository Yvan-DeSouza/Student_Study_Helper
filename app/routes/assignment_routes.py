from flask import Blueprint, request, redirect, url_for, render_template, abort, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.assignment import Assignment, AssignmentExpectedGrade
from app.models.course import Class
from datetime import datetime
from dateutil import parser


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

    due_at = request.form.get("due_at")
    due_at = (
        datetime.fromisoformat(due_at).date()
        if due_at else None
    )
    estimated_minutes = request.form.get("estimated_minutes")
    estimated_minutes = (
        int(estimated_minutes) if estimated_minutes else None
    )

    difficulty = request.form.get("difficulty")
    difficulty = int(difficulty) if difficulty else None

    pass_grade = request.form.get("pass_grade")
    pass_grade = float(pass_grade) if pass_grade else None

    expected_grade = request.form.get("expected_grade")
    expected_grade = float(expected_grade) if expected_grade else None

    assignment = Assignment(
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



    db.session.add(assignment)
    db.session.commit()
    return redirect(url_for("main.home"))


@assignment.route("/assignments")
@login_required
def list_assignments():
    # Existing assignments query
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

    # Normalize data for template
    assignment_rows = []
    for a, class_name, class_importance, class_type, class_is_finished, created_at, study_minutes in assignments:
        assignment_rows.append({
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
        })

    # <----- ADD THIS: fetch classes for modal dropdown
    classes = Class.query.filter_by(user_id=current_user.user_id).all()

    return render_template(
        "assignments.html",
        assignments=assignment_rows,
        classes=classes   # <--- pass to template
    )



@assignment.route("/assignments/<int:assignment_id>/update", methods=["PATCH"])
@login_required
def update_assignment(assignment_id):
    data = request.get_json()
    assignment = Assignment.query.filter_by(
        assignment_id=assignment_id,
        user_id=current_user.user_id
    ).first_or_404()

    prev_expected = assignment.expected_grade
    new_is_graded = bool(data.get("is_graded"))

    assignment.title =  data.get("title", assignment.title)
    assignment.assignment_type = data.get("assignment_type", assignment.assignment_type)

    new_class_id = data.get("class_id")
    if new_class_id:
        course = Class.query.filter_by(
            class_id=new_class_id,
            user_id=current_user.user_id
        ).first_or_404()
        assignment.class_id = course.class_id

    def parse_int(val):
        return int(val) if val not in (None, "", "null") else None

    def parse_float(val):
        return float(val) if val not in (None, "", "null") else None


    assignment.difficulty = parse_int(data.get("difficulty"))
    assignment.estimated_minutes = parse_int(data.get("estimated_minutes"))

    # Handle is_graded transition
    if assignment.is_graded and not new_is_graded:
        assignment.ponderation = None
        assignment.grade = None
        assignment.expected_grade = None
        assignment.pass_grade = None

    assignment.is_graded = new_is_graded

    if assignment.is_graded:
        assignment.ponderation = parse_int(data.get("ponderation"))
        assignment.pass_grade = parse_float(data.get("pass_grade"))
        assignment.expected_grade = parse_float(data.get("expected_grade"))


    due_at_str = data.get("due_at")
    assignment.due_at = None
    if due_at_str not in (None, "", "null"):
        try:
            assignment.due_at = parser.isoparse(due_at_str)
        except (ValueError, TypeError):
            return {"error": "Invalid due_at datetime format"}, 400

    finished_at_str = data.get("finished_at")
    assignment.is_completed = False
    assignment.finished_at = None

    if finished_at_str not in (None, "", "null"):
        try:
            assignment.is_completed = True
            # isoparse handles both "YYYY-MM-DDTHH:MM" and "YYYY-MM-DDTHH:MM:SS"
            assignment.finished_at = parser.isoparse(finished_at_str)
        except (ValueError, TypeError):
           return {
                "error": due_at_str,
                "due_at": due_at_str
            }, 400
    
    else:
        assignment.grade = None






    # Expected grade history
    if assignment.expected_grade != prev_expected and assignment.expected_grade is not None:
        record = AssignmentExpectedGrade(
            assignment_id=assignment.assignment_id,
            user_id=current_user.user_id,
            expected_grade=assignment.expected_grade
        )
        db.session.add(record)

    db.session.commit()
    return {"status": "updated"}, 200



@assignment.route("/assignments/<int:assignment_id>/completion", methods=["PATCH"])
@login_required
def toggle_completion(assignment_id):
    assignment = Assignment.query.filter_by(
        assignment_id=assignment_id,
        user_id=current_user.user_id
    ).first_or_404()

    data = request.get_json()

    is_completed = bool(data.get("is_completed"))
    finished_at = data.get("finished_at")

    if is_completed:
        if not finished_at:
            abort(400, "finished_at is required when completing an assignment")

        assignment.is_completed = True
        assignment.finished_at = parser.isoparse(finished_at)

    else:
        assignment.is_completed = False
        assignment.finished_at = None
        assignment.grade = None
        assignment.expected_grade = None

    db.session.commit()
    return {"status": "completion updated"}, 200



@assignment.route("/assignments/<int:assignment_id>/grade", methods=["PATCH"])
@login_required
def change_grade(assignment_id):
    assignment = Assignment.query.filter_by(
        assignment_id=assignment_id,
        user_id=current_user.user_id
    ).first_or_404()

    if not assignment.is_graded:
        abort(400, "Assignment is not gradable")

    grade = request.form.get("grade")

    if grade is None:
        assignment.grade = None
        db.session.commit()
        return {"status": "grade cleared"}, 200

    finished_at = request.form.get("finished_at")
    if not finished_at:
        abort(400, "finished_at is required when setting a grade")

    grade = float(grade)
    if grade < 0 or grade > 100:
        abort(400, "Grade must be between 0 and 100")

    assignment.is_completed = True
    assignment.finished_at = datetime.fromisoformat(finished_at)
    assignment.grade = grade

    db.session.commit()
    return {"status": "grade updated"}, 200


@assignment.route("/assignments/<int:assignment_id>", methods=["DELETE"])
@login_required
def delete_assignment(assignment_id):
    assignment = (
        db.session.query(Assignment)
        .filter_by(
            assignment_id=assignment_id,
            user_id=current_user.user_id
        )
        .first_or_404()
    )

    db.session.delete(assignment)
    db.session.commit()

    return jsonify({"success": True})





@assignment.route("/assignments/<int:assignment_id>/summary", methods=["GET"])
@login_required
def assignment_summary(assignment_id):
    assignment = (
        db.session.query(Assignment)
        .filter_by(
            assignment_id=assignment_id,
            user_id=current_user.user_id
        )
        .first_or_404()
    )

    return jsonify({
        "assignment_id": assignment.assignment_id,
        "title": assignment.title,
        "study_session_count": assignment.study_session_count,
        "study_minutes": assignment.study_minutes
    })


