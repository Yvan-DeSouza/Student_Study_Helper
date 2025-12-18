from flask import Blueprint, render_template
from app.utils import login_required

main = Blueprint("main", __name__)

@main.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html")
