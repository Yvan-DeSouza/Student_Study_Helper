from flask import Blueprint, render_template
from app.utils import login_required

dashboard = Blueprint("dashboard", __name__)
@dashboard.route("/")
@login_required
def home():
    return render_template(
        "dashboard.html",
        total_minutes=0
    )
