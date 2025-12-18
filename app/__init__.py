from flask import Flask
from .config import Config
from .extensions import db, migrate, login_manager

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    from .routes import auth_routes, class_routes, assignment_routes, study_routes, dashboard_routes
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(class_routes.bp)
    app.register_blueprint(assignment_routes.bp)
    app.register_blueprint(study_routes.bp)
    app.register_blueprint(dashboard_routes.bp)

    return app
