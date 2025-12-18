from flask import Blueprint, render_template

classes = Blueprint("classes", __name__)

@classes.route("/classes")
def list_classes():
    return render_template("classes.html")

@classes.route("/classes/new")
def new_class():
    return render_template("new_class.html")
