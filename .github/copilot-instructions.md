# Copilot / AI Assistant Instructions for Student_Study_Helper

Summary
- This is a Flask-based study tracker app (Postgres-backed) organized as a small, modular Flask application using an app factory pattern (`app.create_app`).
- Key responsibilities: authentication (`flask-login`), data models in `app/models`, business logic in `app/services`, and UI in `app/templates` + `app/static`.

Quick start (development)
- The app is launched with: `python run.py` (development server; debug=True in `run.py`).
- Environment vars required: `SECRET_KEY` and `DATABASE_URL` (see `app/config.py` which loads from `.env`). Example:
  - Windows PowerShell: `$env:FLASK_APP = 'run.py'; $env:DATABASE_URL = 'postgresql://user:pass@localhost/dbname'`
- DB migrations: project uses Flask-Migrate (Alembic). Typical flows:
  - `flask db migrate -m "message"`
  - `flask db upgrade`
  (Make sure `FLASK_APP` is set or run `python -m flask ...` from the project root.)

Architecture & Patterns
- App factory: `app.create_app()` in `app/__init__.py` (registers blueprints and initializes extensions `db`, `migrate`, `login_manager`, and `CSRFProtect`).
- Blueprints: All user-facing routes are under `app/routes/*`. Example: `auth_routes.py` defines `auth = Blueprint('auth', ...)` and is registered in `app/__init__.py`.
- Extensions: `app/extensions.py` exports `db`, `migrate`, `login_manager` — use these singletons across the codebase (models import `db` from there).
- Database models: `app/models/` — SQLAlchemy models use server-side defaults and timezone-aware datetimes. Prefer using server defaults where present (see `created_at` columns and `server_default=func.now()`).
- Services: Business logic lives in `app/services/*` (e.g., `study_session_services.py` contains `get_active_session`, `get_due_scheduled_session`, and collision checks). Keep logic that accesses DB in services rather than in routes.
- Context processors: `app/__init__.py` injects `now` (UTC) and active/due sessions into templates — use these names in templates rather than recomputing.

Important project-specific details
- Timezone handling: Code uses timezone-aware datetimes (UTC). Keep new datetime logic UTC-aware to be consistent with existing fields (`datetime.now(timezone.utc)`).
- CSRF and forms: Uses `flask-wtf` with `CSRFProtect()` initialized in `create_app()`; forms are in `app/forms.py`.
- Session consistency: DB schema enforces strict checks on `study_sessions` and `assignments`. Study session semantics (active, completed, cancelled) are strongly enforced by application logic and DB constraints — review `database/schema.sql` and `app/models/study_session.py` before changing session behavior.
- Unique/Index quirks: There is a unique index created in `database/schema.sql` called `one_active_session_per_user` (verify intent when changing session activation logic).
- Passwords: Use `User.set_password()` and `User.check_password()` (Werkzeug PBKDF2) — do not manipulate `password_hash` directly.

Testing & CI
- Tests currently exist as placeholders under `tests/` (empty `test_models.py` and `test_routes.py`). When adding tests:
  - Use the app factory to create a test app and `app.test_client()` for route tests.
  - Tests should be explicit about DB setup/teardown (consider creating a dedicated test DB or using transactions/fixtures).
- No CI config discovered in the repo — expect local testing via `pytest` or `python -m pytest` when you add tests.

Code Conventions & Style (project-specific)
- Prefer service-layer functions to encapsulate DB queries and business rules (see `app/services/study_session_services.py`).
- Models: prefer server- and DB-enforced constraints. Add `server_default` or DB checks if you want behavior strongly enforced at DB level.
- Templates rely on context-injected objects (`now`, `active_session`, `due_session`). When adding features that need these, update the context processor in `app/__init__.py`.
- Avoid relying on implicit timezone-naive datetimes — maintain UTC awareness.

Integration & External Dependencies
- PostgreSQL via `psycopg2-binary` (check `DATABASE_URL` format in `app/config.py`).
- Data analysis libs: `pandas`, `numpy`, `matplotlib` appear in `requirements.txt` and are used by analytics modules.
- Alembic/Flask-Migrate for schema migrations; existing migration files live under `migrations/`.

Where to look when changing X
- Changing authentication / user model: `app/models/user.py`, `app/extensions.py`, `app/routes/auth_routes.py`.
- Changing session behavior / scheduling: `app/models/study_session.py`, `app/services/study_session_services.py`, `database/schema.sql` (be mindful of DB checks and the unique index).
- Adding routes / blueprints: register them in `app/__init__.py` (follow existing naming/blueprint pattern).

Examples (copyable snippets)
- Start dev server: `python run.py` (or set `FLASK_APP=run.py` and `flask run`).
- Run migrations (after setting FLASK_APP): `flask db migrate -m "desc" && flask db upgrade`.
- Query for active session: `from app.services.study_session_services import get_active_session; s = get_active_session(user_id)`.

Tips for AI agents
- Read `database/schema.sql` first to understand the intended data model and constraints before editing models or writing migration scripts.
- Prefer making database changes via `flask-migrate` migrations (do not edit schema files directly without providing a migration).
- Use explicit file references when suggesting edits (e.g., "update `StudySession` in `app/models/study_session.py` to add X").
- When suggesting UI/template changes, reference context variables injected in `app/__init__.py` so code uses consistent naming.

If anything here is unclear or you want more detail (e.g., a mental model of the session lifecycle, typical request flows, or a short how-to for testing), tell me which section to expand and I will refine the instructions.