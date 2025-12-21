from flask import Flask
from .config import Config
from .extensions import db, migrate, login_manager


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Import models (after db is initialized)
    from app.models.user import User

    # Tell Flask-Login how to load a user from an ID
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Where to redirect if a user is not logged in
    login_manager.login_view = "auth.login"

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
