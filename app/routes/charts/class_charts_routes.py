from flask import jsonify, request
from flask_login import login_required, current_user
from app.routes.charts import charts
from app.models.course import Class
from app.models.study_session import StudySession
from app.extensions import db
from sqlalchemy import func
from datetime import datetime, timezone, timedelta


@charts.route("/classes/grade_vs_study_time")
@login_required
def grade_vs_study_time():
    """
    Scatter plot:
    X = total study time (minutes)
    Y = average grade (%)
    Bubble size = importance
    Color = class color
    """

    results = (
        db.session.query(
            Class.class_id,
            Class.class_name,
            Class.color,
            Class.importance,
            Class.grade,
            func.coalesce(func.sum(StudySession.duration_minutes), 0).label("total_minutes")
        )
        .outerjoin(
            StudySession,
            (StudySession.class_id == Class.class_id)
            & (StudySession.is_completed == True)
        )
        .filter(Class.user_id == current_user.user_id)
        .group_by(Class.class_id)
        .all()
    )

    def importance_to_radius(importance):
        if importance == "high":
            return 14
        if importance == "medium":
            return 10
        return 6

    data_points = []

    for row in results:
        # Skip classes without grades (scatter needs Y value)
        if row.grade is None:
            continue

        data_points.append({
            "x": row.total_minutes,
            "y": row.grade,
            "r": importance_to_radius(row.importance),
            "label": row.class_name,
            "backgroundColor": row.color,
            "importance": row.importance
        })

    return jsonify({"data": data_points})


@charts.route("/classes/list")
@login_required
def classes_list():
    classes = db.session.query(Class).filter(Class.user_id == current_user.user_id).all()
    return jsonify([{"class_id": c.class_id, "class_name": c.class_name} for c in classes])




from app.models.assignment import Assignment


@charts.route("/classes/class_health")
@login_required
def class_health_breakdown():
    """
    100% stacked bar or pie per class:
    - Completed %
    - In progress %
    - Not started %
    Supports optional query param `time_window` = all | last_7_days | last_30_days (filters by Assignment.created_at)
    """

    time_window = request.args.get('time_window', 'all')
    since = None
    from datetime import timedelta
    if time_window == 'last_7_days':
        since = datetime.now(timezone.utc) - timedelta(days=7)
    elif time_window == 'last_30_days':
        since = datetime.now(timezone.utc) - timedelta(days=30)

    classes = (
        db.session.query(Class)
        .filter(Class.user_id == current_user.user_id)
        .all()
    )

    payload = []

    for c in classes:
        base_q = db.session.query(Assignment).filter(Assignment.class_id == c.class_id)
        if since is not None:
            base_q = base_q.filter(Assignment.created_at >= since)

        total_assignments = base_q.count()

        if total_assignments == 0:
            continue

        completed = base_q.filter(Assignment.is_completed == True).count()

        in_progress = (
            base_q.join(StudySession, StudySession.assignment_id == Assignment.assignment_id)
            .filter(Assignment.is_completed == False)
            .distinct()
            .count()
        )

        not_started = total_assignments - completed - in_progress

        payload.append({
            "class_id": c.class_id,
            "class_name": c.class_name,
            "color": c.color,
            "completed": round((completed / total_assignments) * 100, 1),
            "in_progress": round((in_progress / total_assignments) * 100, 1),
            "not_started": round((not_started / total_assignments) * 100, 1),
            "total_assignments": total_assignments,
            "completed_count": completed,
            "in_progress_count": in_progress,
            "not_started_count": not_started
        })

    return jsonify(payload)



@charts.route("/classes/class_health_summary")
@login_required
def class_health_summary():
    class_id = request.args.get("class_id", "all")
    time_window = request.args.get('time_window', 'all')

    since = None
    if time_window == 'last_7_days':
        since = datetime.now(timezone.utc) - timedelta(days=7)
    elif time_window == 'last_30_days':
        since = datetime.now(timezone.utc) - timedelta(days=30)

    query = db.session.query(Assignment).join(Class).filter(
        Class.user_id == current_user.user_id
    )

    if class_id != "all":
        query = query.filter(Assignment.class_id == class_id)

    if since is not None:
        query = query.filter(Assignment.created_at >= since)

    total = query.count()
    class_name = "All classes"
    if class_id != "all":
        cl = Class.query.get(class_id)
        if cl:
            class_name = cl.class_name
    if total == 0:
        return jsonify({
            "empty": True,
            "class_name": class_name,
            })

    completed = query.filter(Assignment.is_completed == True).count()

    in_progress = (
        query.join(StudySession, StudySession.assignment_id == Assignment.assignment_id)
        .filter(Assignment.is_completed == False)
        .distinct()
        .count()
    )

    not_started = total - completed - in_progress

    # ✅ percent calculation ALWAYS here
    def pct(n): 
        return round((n / total) * 100, 1)

    class_name = "All classes"
    if class_id != "all":
        cl = Class.query.get(class_id)
        if cl:
            class_name = cl.class_name

    return jsonify({
        "empty": False,
        "class_name": class_name,
        "total": total,

        # percentages
        "completed_pct": pct(completed),
        "in_progress_pct": pct(in_progress),
        "not_started_pct": pct(not_started),

        # raw counts (for tooltip)
        "completed_count": completed,
        "in_progress_count": in_progress,
        "not_started_count": not_started
    })

