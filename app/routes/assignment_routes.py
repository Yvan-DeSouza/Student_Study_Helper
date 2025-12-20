from flask import Blueprint, render_template

assignment = Blueprint("assignment", __name__)

@assignment.route("/assignment")
def assignment_list():
    return render_template("assignment.html")

@assignment.route("/assignment/new")
def add_assignment():
    return render_template("new_assignment.html")