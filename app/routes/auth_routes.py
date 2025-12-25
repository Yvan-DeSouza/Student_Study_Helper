from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from app.models.user import User
from app.extensions import db
from app.forms import RegisterForm, LoginForm

auth = Blueprint('auth', __name__)

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
