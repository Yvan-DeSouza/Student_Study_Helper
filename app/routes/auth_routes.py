from flask import Blueprint, render_template, redirect, url_for, request

auth = Blueprint("auth", __name__)

@auth.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        #Temporary (no database yet)
        session["user_id"] = 1
        return redirect(url_for('main.dashboard'))
    
    return render_template('login.html')

@auth.route("/register")
def register():
    return render_template("register.html")

@auth.route("/logout")
def logout():
    return redirect(url_for("auth.login"))
