from flask import Blueprint, render_template

study = Blueprint("study", __name__)

@study.route("/study")
def study_sessions():
    return render_template("study.html")

@study.route("/study/new")
def new_study_session():
    return render_template("new_study.html")
