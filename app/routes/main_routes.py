from flask import Blueprint, render_template
from flask_login import current_user, login_required
from app.models.course import Class


main = Blueprint("main", __name__)

@main.route("/main")
@login_required
def home():
    classes = Class.query.filter_by(user_id=current_user.user_id).all()
    return render_template("home.html", user=current_user, classes=classes)
