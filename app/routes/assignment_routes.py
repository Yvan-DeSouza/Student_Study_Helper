from flask import Blueprint, render_template

assignment = Blueprint("assignment", __name__)

@assignment.route("/assignment")
def study_sessions():
    return render_template("assignment.html")

@assignment.route("/assignment/new")
def new_study_session():
    return render_template("new_assignment.html")