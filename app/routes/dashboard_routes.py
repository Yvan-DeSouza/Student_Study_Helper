from flask import Blueprint, render_template
from app.utils import login_required
from flask_login import current_user
dashboard = Blueprint("dashboard", __name__)
@dashboard.route("/")
@login_required
def home():
    return render_template(
        "dashboard.html",
        user=current_user
    )
