from flask import Flask
from .config import Config
from .extensions import db, migrate, login_manager
from flask_wtf.csrf import CSRFProtect
from datetime import datetime, timezone
from app.services.study_session_services import get_active_session, get_due_scheduled_session, check_session_collision
from flask_login import current_user


csrf = CSRFProtect()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)


    csrf.init_app(app)
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)


    from app import models
    # Import models (after db is initialized)
    from app.models.user import User


    # Tell Flask-Login how to load a user from an ID
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
        # Where to redirect if a user is not logged in
    login_manager.login_view = "auth.login"
   
    @app.context_processor
    def inject_now():
        return {
            'now': datetime.now(timezone.utc)
        }


    @app.context_processor
    def inject_global_sessions():
        active_session = None
        due_session = None
        session_collision = None

        if current_user.is_authenticated:
            active_session = get_active_session(current_user.user_id)
            due_session = get_due_scheduled_session(current_user.user_id)

            # Detect collision: due session exists but there is also an active session
            if active_session and due_session:
                session_collision = {
                    "active_session_id": active_session.session_id,
                    "scheduled_session_id": due_session.session_id
                }

        return {
            "active_session": active_session,
            "has_active_session": active_session is not None,
            "due_session": due_session,
            "session_collision": session_collision
        }






    # Register blueprints
    from .routes import (
        auth_routes,
        class_routes,
        assignment_routes,
        study_routes,
        dashboard_routes,
        main_routes,
        calendar_routes
    )


    app.register_blueprint(auth_routes.auth)
    app.register_blueprint(class_routes.classes)
    app.register_blueprint(assignment_routes.assignment)
    app.register_blueprint(study_routes.study)
    app.register_blueprint(dashboard_routes.dashboard)
    app.register_blueprint(main_routes.main)
    app.register_blueprint(calendar_routes.calendar)


    return app