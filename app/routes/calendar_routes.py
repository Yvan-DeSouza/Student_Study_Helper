from flask import Blueprint, render_template
from flask_login import current_user, login_required

calendar = Blueprint("calendar", __name__)
@calendar.route("/calendar")
@login_required
def enter():
    return render_template("calendar.html", user=current_user.user_id)