from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from app.models.user import User
from app.extensions import db

auth = Blueprint('auth', __name__)
@auth.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        if password != confirm_password:
            flash('Passwords do not match!')
            return redirect(url_for('auth.register'))
        
        if User.query.filter_by(email=email).first():
            flash('Email already exists!')
            return redirect(url_for('auth.register'))

        new_user = User(username=username, email=email)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        login_user(new_user)

        flash(f'Welcome, {new_user.username}! Your accont has been created.')
        return redirect(url_for('main.home'))

    return render_template('register.html')


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            flash('Invalid email or password')
            return redirect(url_for('auth.login'))

        # Log in the user using Flask-Login
        login_user(user, remember=bool(request.form.get('remember')))
        flash(f'Welcome back, {user.username}!')

        # Redirect to home page
        return redirect(url_for('main.home'))

    return render_template('login.html')


@auth.route('/logout')
@login_required
def logout():
    logout_user()  # <- Flask-Login handles session cleanup
    flash('You have been logged out.')
    return redirect(url_for('auth.login'))

