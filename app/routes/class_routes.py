from flask import Blueprint, render_template, request, redirect, url_for, current_app, jsonify, abort, flash
from flask_login import login_required, current_user
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment
from sqlalchemy import and_
from datetime import datetime, timezone
from dateutil import parser


classes = Blueprint("classes", __name__)


@classes.route("/classes/json")
@login_required
def list_classes_json():
    """Return classes as JSON for dropdown population"""
    classes_list = Class.query.filter_by(user_id=current_user.user_id).all()
    
    return jsonify([{
        "class_id": c.class_id,
        "class_name": c.class_name,
        "class_code": c.class_code,
        "color": c.color
    } for c in classes_list])

# Or modify the existing list_classes route to handle both:
@classes.route("/classes")
@login_required
def list_classes():
    classes_list = Class.query.filter_by(user_id=current_user.user_id).all()

    # Handle partial HTML request
    if request.args.get("partial") == "cards":
        return render_template("partials/classes/cards.html", classes=classes_list)
    
    # Handle JSON request
    if request.args.get("partial") == "json":
        return jsonify([{
            "class_id": c.class_id,
            "class_name": c.class_name,
            "class_code": c.class_code,
            "color": c.color
        } for c in classes_list])
    
    # Default: full page
    return render_template("classes.html", classes=classes_list, user=current_user.user_id)


@classes.route("/classes", methods=["POST"])
@login_required
def create_class():
    class_name = request.form["class_name"].strip()
    class_code = request.form["class_code"].strip()

    # Check for duplicate name
    existing_name = Class.query.filter(
        and_(
            Class.user_id == current_user.user_id,
            Class.class_name == class_name
        )
    ).first()

    if existing_name:
        return jsonify({
            "error": "duplicate_name",
            "message": f"The {class_name} is already taken for your class with a code of {existing_name.class_code}, please choose another name."
        }), 400

    # Check for duplicate code
    existing_code = Class.query.filter(
        and_(
            Class.user_id == current_user.user_id,
            Class.class_code == class_code
        )
    ).first()

    if existing_code:
        return jsonify({
            "error": "duplicate_code",
            "message": f"The {class_code} class code is already taken by your class with name '{existing_code.class_name}', please choose another one."
        }), 400

    importance = request.form.get("importance")
    if importance == "":
        importance = None

    difficulty_raw = request.form.get("difficulty")
    pass_grade_raw = request.form.get("pass_grade")

    new_class = Class(
        user_id=current_user.user_id,
        class_name=class_name,
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

    if request.headers.get('Accept') == 'application/json':
        return jsonify({'success': True, 'class_id': new_class.class_id})
    else:
        flash('Class created successfully!', 'success')
        return redirect(url_for('classes.classes')) 



@classes.route("/classes/<int:class_id>", methods=["DELETE"])
@login_required
def delete_class(class_id):
    cls = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first()
    if not cls:
        return jsonify({
            "success": False,
            "error": "CLASS_NOT_FOUND"
        }), 404

    db.session.delete(cls)
    db.session.commit()

    return jsonify({
        "success": True,
        "class_id": class_id
    }), 200


@classes.route("/classes/<int:class_id>", methods=["PATCH"])
@login_required
def update_class(class_id):
    cls = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    new_name = request.form["class_name"].strip()
    new_code = request.form["class_code"].strip()

    # Check for duplicate name if changed
    if new_name != cls.class_name:
        existing_name = Class.query.filter(
            and_(
                Class.user_id == current_user.user_id,
                Class.class_name == new_name
            )
        ).first()
        if existing_name:
            return jsonify({
                "error": "duplicate_name",
                "message": f"The {new_name} is already taken for your class with a code of {existing_name.class_code}, please choose another name."
            }), 400

    # Check for duplicate code if changed
    if new_code != cls.class_code:
        existing_code = Class.query.filter(
            and_(
                Class.user_id == current_user.user_id,
                Class.class_code == new_code
            )
        ).first()
        if existing_code:
            return jsonify({
                "error": "duplicate_code",
                "message": f"The {new_code} class code is already taken by your class with name '{existing_code.class_name}', please choose another one."
            }), 400

    cls.class_name = new_name
    cls.class_code = new_code
    cls.class_type = request.form["class_type"]

    importance = request.form.get("importance")
    cls.importance = importance if importance else None
    teacher_name = request.form.get("teacher_name")
    cls.teacher_name = teacher_name if teacher_name else None
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
    print(class_id)
    print(current_user.user_id)

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


@classes.route("/classes/cards")
@login_required
def classes_cards():
    classes = Class.query.filter_by(user_id=current_user.user_id).all()
    return render_template('partials/classes/cards.html', classes=classes)


@classes.route("/classes/<int:class_id>/card")
@login_required
def get_class_card(class_id):
    """Return HTML for a single class card"""
    cls = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()
    
    return render_template("partials/classes/cards.html", c=cls)