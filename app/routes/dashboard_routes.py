from flask import Blueprint, render_template
from flask_login import current_user, login_required

dashboard = Blueprint("dashboard", __name__)
@dashboard.route("/dashboard")
@login_required
def graphs():
    return render_template(
        "dashboard.html"
    )
