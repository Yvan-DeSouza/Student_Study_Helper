from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from wtforms import StringField
from app.extensions import db
from app.forms import RegisterForm, LoginForm
from app.services.columns.registry import COLUMN_REGISTRY
from app.services.defaults.classes import CLASS_TYPE_COLORS, CLASS_TYPES, IMPORTANCE_LEVELS
from app.services.defaults.assignments import ASSIGNMENT_TYPE_COLORS, ASSIGNMENT_TYPES
from app.models.user import (
    User,
    UserPreferences,
    UserClassTypeColor,
    UserAssignmentTypeColor,
    ClassViewPreferences,
    AssignmentViewPreferences,
    ShownAssignmentColumn
)
import pytz

auth = Blueprint('auth', __name__)






@auth.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()


    if form.validate_on_submit():
        if User.query.filter_by(email=form.email.data).first():
            flash('Email already exists!')
            return redirect(url_for('auth.register'))
       
        # Get timezone from the submitted form
        tz = form.timezone.data or "UTC"
        # Validate the timezone is in pytz
        if tz not in pytz.all_timezones:
            tz = "UTC"

        new_user = User(
            username=form.username.data,
            email=form.email.data,
            user_type='student',
            timezone=tz
        )
        new_user.set_password(form.password.data)
        db.session.add(new_user)
        db.session.flush()  # ensures user_id exists


        for col in COLUMN_REGISTRY.values():
            db.session.add(
                ShownAssignmentColumn(
                    user_id=new_user.user_id,
                    page_name="assignments",
                    column_key=col.key,
                    is_shown=col.default_shown
                )
            )



        # ---------------- USER PREFERENCES ----------------
        db.session.add(UserPreferences(user_id=new_user.user_id))

        # ---------------- CLASS VIEW PREFERENCES ----------------

        for page in ("classes", "assignments", "calendar"):
            db.session.add(ClassViewPreferences(
                user_id=new_user.user_id,
                page_name=page,
                sort_by="name_asc",
                status_filter="all",

                # IMPORTANT: JSONB arrays
                filter_importance=IMPORTANCE_LEVELS,
                filter_class_types=CLASS_TYPES
            ))




        for page in ("assignments", "calendar"):
            db.session.add(AssignmentViewPreferences(
                user_id=new_user.user_id,
                page_name=page,
                due_status_filter="all",
                completion_filter="all",

                # IMPORTANT: JSONB arrays
                filter_assignment_types=ASSIGNMENT_TYPES,
                risk_threshold=0.00,
                risk_filter_mode="none"
            ))


        # ---------------- CLASS TYPE COLORS ----------------
        for class_type, color in CLASS_TYPE_COLORS.items():
            db.session.add(UserClassTypeColor(
                user_id=new_user.user_id,
                class_type=class_type,
                color=color
            ))
        # ---------------- Assignment TYPE COLORS ----------------


        for assignment_type, color in ASSIGNMENT_TYPE_COLORS.items():
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
