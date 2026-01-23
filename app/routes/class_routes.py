from flask import Blueprint, render_template, request, redirect, url_for, current_app, jsonify, abort
from flask_login import login_required, current_user
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from sqlalchemy import and_
from datetime import datetime, timezone
from dateutil import parser


classes = Blueprint("classes", __name__)

@classes.route("/classes")
@login_required
def list_classes():
    classes = Class.query.filter_by(user_id=current_user.user_id).all()
    return render_template("classes.html", classes=classes, user=current_user.user_id)


@classes.route("/classes", methods=["POST"])
@login_required
def create_class():
    class_code = request.form["class_code"].strip()

    existing = Class.query.filter(
        and_(
            Class.user_id == current_user.user_id,
            Class.class_code == class_code
        )
    ).first()

    if existing:
        return jsonify({
            "success": False,
            "error": "DUPLICATE_CLASS_CODE",
            "existing_class_name": existing.class_name
        }), 409

    importance = request.form.get("importance")
    if importance == "":
        importance = None

    difficulty_raw = request.form.get("difficulty")
    pass_grade_raw = request.form.get("pass_grade")

    new_class = Class(
        user_id=current_user.user_id,
        class_name=request.form["class_name"],
        class_code=class_code,
        class_type=request.form["class_type"],
        teacher_name=request.form.get("teacher_name") or None,
        color=request.form.get("color"),
        importance=importance,
        difficulty=int(difficulty_raw) if difficulty_raw else None,
        pass_grade=float(pass_grade_raw) if pass_grade_raw else None
    )

    db.session.add(new_class)
    db.session.commit()

    return jsonify({"success": True}), 201



@classes.route("/classes/<int:class_id>", methods=["DELETE"])
@login_required
def delete_class(class_id):
    cls = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    db.session.delete(cls)
    db.session.commit()

    return jsonify({"success": True}), 200


@classes.route("/classes/<int:class_id>", methods=["PATCH"])
@login_required
def update_class(class_id):
    cls = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    cls.class_name = request.form["class_name"]
    cls.class_code = request.form["class_code"]
    cls.class_type = request.form["class_type"]

    importance = request.form.get("importance")
    cls.importance = importance if importance else None

    cls.color = request.form.get("color")

    difficulty_raw = request.form.get("difficulty")
    cls.difficulty = int(difficulty_raw) if difficulty_raw else None

    pass_grade_raw = request.form.get("pass_grade")
    cls.pass_grade = float(pass_grade_raw) if pass_grade_raw else None

    if not cls.is_finished:
        grade_raw = request.form.get("grade")
        cls.grade = float(grade_raw) if grade_raw else None


    db.session.commit()
    return jsonify({"success": True}), 200




@classes.route("/classes/<int:class_id>/completion", methods=["PATCH"])
@login_required
def toggle_class_completion(class_id):
    c = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    data = request.get_json()
    is_finished = bool(data.get("is_finished"))
    finished_at = data.get("finished_at")

    if is_finished:
        if not finished_at:
            abort(400, "finished_at required")

        c.is_finished = True
        c.finished_at = parser.isoparse(finished_at)

    else:
        c.is_finished = False
        c.finished_at = None
        c.grade = None

    db.session.commit()
    return {"status": "ok"}, 200






@classes.route("/classes/<int:class_id>/grade", methods=["PATCH"])
@login_required
def update_grade(class_id):
    cls = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    if cls.is_finished:
        return "Class is finished", 400

    try:
        grade = float(request.form.get("grade"))
    except (TypeError, ValueError):
        return "Invalid grade", 400

    if not 0 <= grade <= 100:
        return "Grade must be between 0 and 100", 400

    cls.grade = grade
    db.session.commit()

    return "", 204

