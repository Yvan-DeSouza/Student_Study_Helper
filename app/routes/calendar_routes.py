from flask import Blueprint, render_template
from app.utils import login_required
from flask_login import current_user

calendar = Blueprint("calendar", __name__)

@calendar.route("/calendar")
@login_required
def home():
    return render_template("calendar.html", user=current_user)