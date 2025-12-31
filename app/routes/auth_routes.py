from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from app.extensions import db
from app.forms import RegisterForm, LoginForm
from app.models.user import (
    User,
    UserPreferences,
    UserClassTypeColor,
    UserAssignmentTypeColor,
    ClassViewPreferences,
    AssignmentViewPreferences
)

auth = Blueprint('auth', __name__)



DEFAULT_CLASS_COLORS = {
    "math": "#F50000",
    "science": "#16a34a",
    "language": "#FF7B00",
    "social_science": "#db2777",
    "art": "#9333ea",
    "engineering": "#0011FF",
    "technology": "#00BFFF",
    "finance": "#D2B604",
    "other": "#6D6D69"
}

DEFAULT_ASSIGNMENT_COLORS = {
    "homework": "#2421eb",
    "quiz": "#22f50b",
    "project": "#0975f0",
    "writing": "#365a04",
    "test": "#ef8644",
    "exam": "#ef4444",
    "lab_report": "#00ffe1",
    "presentation": "#630101",
    "reading": "#ffff00",
    "other": "#7c800a"
}

@auth.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()

    if form.validate_on_submit():
        if User.query.filter_by(email=form.email.data).first():
            flash('Email already exists!')
            return redirect(url_for('auth.register'))

        new_user = User(
            username=form.username.data,
            email=form.email.data,
            user_type='student'
        )
        new_user.set_password(form.password.data)
        db.session.add(new_user)
        db.session.flush()  # 👈 ensures user_id exists

        # ---------------- USER PREFERENCES ----------------
        db.session.add(UserPreferences(user_id=new_user.user_id))

        # ---------------- CLASS VIEW PREFERENCES ----------------
        for page in ("classes", "assignments"):
            db.session.add(ClassViewPreferences(
                user_id=new_user.user_id,
                page_name=page,
                filter_class_types={k: True for k in DEFAULT_CLASS_COLORS}
            ))

        # ---------------- ASSIGNMENT VIEW PREFERENCES ----------------
        db.session.add(AssignmentViewPreferences(
            user_id=new_user.user_id,
            filter_assignment_types={k: True for k in DEFAULT_ASSIGNMENT_COLORS}
        ))

        # ---------------- CLASS TYPE COLORS ----------------
        for class_type, color in DEFAULT_CLASS_COLORS.items():
            db.session.add(UserClassTypeColor(
                user_id=new_user.user_id,
                class_type=class_type,
                color=color
            ))

        # ---------------- ASSIGNMENT TYPE COLORS ----------------
        for assignment_type, color in DEFAULT_ASSIGNMENT_COLORS.items():
            db.session.add(UserAssignmentTypeColor(
                user_id=new_user.user_id,
                assignment_type=assignment_type,
                color=color
            ))

        db.session.commit()
        login_user(new_user)

        flash(f'Welcome, {new_user.username}! Your account has been created.')
        return redirect(url_for('main.home'))

    return render_template('register.html', form=form)



@auth.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if not user or not user.check_password(form.password.data):
            flash('Invalid email or password')
            return redirect(url_for('auth.login'))

        login_user(user, remember=form.remember.data)
        flash(f'Welcome back, {user.username}!')
        return redirect(url_for('main.home'))

    return render_template('login.html', form=form)


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.')
    return redirect(url_for('auth.login'))
