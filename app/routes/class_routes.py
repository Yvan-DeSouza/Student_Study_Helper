from flask import Blueprint, render_template, request, redirect, url_for
from flask_login import login_required, current_user
from app.extensions import db
from app.models.course import Class
from app.models.assignment import Assignment

classes = Blueprint("classes", __name__)

@classes.route("/classes")
def list_classes():
    classes = Class.query.filter_by(user_id=current_user.user_id).all()
    return render_template("classes.html", classes=classes)

@classes.route("/classes/new", methods=["POST"])
@login_required
def add_class():
    new_class = Class(
        user_id=current_user.user_id,
        class_name=request.form["class_name"],
        class_type=request.form["class_type"],
        class_code=request.form["class_code"],
        color=request.form.get("color"),
        grade=None,
        importance=request.form.get("importance")
    )

    db.session.add(new_class)
    db.session.commit()

    return redirect(url_for("main.home"))

@classes.route("/classes/<int:class_id>/delete", methods=["POST"])
@login_required
def delete_class(class_id):
    cls = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    db.session.delete(cls)
    db.session.commit()

    return redirect(url_for("classes.list_classes"))

@classes.route("/classes/<int:class_id>/edit", methods=["POST"])
@login_required
def edit_class(class_id):
    cls = Class.query.filter_by(
        class_id=class_id,
        user_id=current_user.user_id
    ).first_or_404()

    cls.class_name = request.form["class_name"]
    cls.class_code = request.form["class_code"]
    cls.class_type = request.form["class_type"]
    cls.importance = request.form.get("importance")
    cls.color = request.form.get("color")

    db.session.commit()
    return redirect(url_for("classes.list_classes"))
