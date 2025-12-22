from flask import Blueprint, render_template, request, redirect, url_for
from flask_login import login_required, current_user
from app.extensions import db
from app.models.course import Class

classes = Blueprint("classes", __name__)

@classes.route("/classes")
def list_classes():
    return render_template("classes.html")

@classes.route("/classes/new", methods=["POST"])
@login_required
def add_class():
    is_graded = "is_graded" in request.form

    ponderation = None
    if is_graded:
        ponderation = request.form.get("ponderation")
        if ponderation:
            ponderation = int(ponderation)

    new_class = Class(
        user_id=current_user.user_id,
        class_name=request.form["class_name"],
        class_type=request.form["class_type"],
        class_code=request.form["class_code"],
        color=request.form.get("color"),
        is_graded=is_graded,
        ponderation=ponderation
    )

    db.session.add(new_class)
    db.session.commit()

    return redirect(url_for("main.home"))
