from flask import jsonify
from flask_login import login_required, current_user
from app.routes.charts import charts
from app.models.study_session import StudySession
from app.models.course import Class
from app.extensions import db
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, cast, Date
from app.models.assignment import Assignment


@charts.route("/home/time_per_class")
@login_required
def time_per_class_chart():
    """
    Returns aggregated study time per class for the logged-in user.
    """
    # Query the database
    results = (
        db.session.query(
            Class.class_name,
            Class.color,
            func.coalesce(func.sum(StudySession.duration_minutes), 0).label("total_minutes")
        )
        .join(StudySession, StudySession.class_id == Class.class_id)
        .filter(
            StudySession.user_id == current_user.user_id,
            StudySession.is_completed == True
        )
        .group_by(Class.class_id)
        .all()
    )

    # Transform into arrays for Chart.js
    chart_data = {
        "labels": [row.class_name for row in results],
        "data": [row.total_minutes for row in results],
        "colors": [row.color for row in results]
    }
    

    return jsonify(chart_data)





@charts.route("/home/weekly_study_time")
@login_required
def weekly_study_time_chart():
    """
    Returns total study minutes per day for the last 7 days (including today).
    """

    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=6)

    # Query: sum duration per day
    results = (
        db.session.query(
            cast(StudySession.started_at, Date).label("day"),
            func.coalesce(func.sum(StudySession.duration_minutes), 0).label("total_minutes")
        )
        .filter(
            StudySession.user_id == current_user.user_id,
            StudySession.is_completed == True,
            cast(StudySession.started_at, Date) >= start_date,
            cast(StudySession.started_at, Date) <= today
        )
        .group_by("day")
        .all()
    )

    # Convert query results to dict: {date: minutes}
    minutes_by_day = {
        row.day: int(row.total_minutes) for row in results
    }

    # Build full 7-day range (fill missing with 0)
    labels = []
    data = []

    for i in range(7):
        day = start_date + timedelta(days=i)
        labels.append(day.strftime("%a"))  # Mon, Tue, Wed, ...
        data.append(minutes_by_day.get(day, 0))

    return jsonify({
        "labels": labels,
        "data": data
    })



@charts.route("/home/assignment_load_daily")
@login_required
def assignment_load_daily():
    today = datetime.now(timezone.utc).date()
    end_date = today + timedelta(days=6)

    results = (
        db.session.query(
            cast(Assignment.due_at, Date).label("day"),
            func.count(Assignment.assignment_id).label("count")
        )
        .filter(
            Assignment.user_id == current_user.user_id,
            Assignment.due_at.isnot(None),
            cast(Assignment.due_at, Date) >= today,
            cast(Assignment.due_at, Date) <= end_date
        )
        .group_by("day")
        .all()
    )

    counts_by_day = {row.day: row.count for row in results}

    labels = []
    data = []

    for i in range(7):
        day = today + timedelta(days=i)
        labels.append(day.strftime("%a"))  # Mon, Tue, Wed...
        data.append(counts_by_day.get(day, 0))

    return jsonify({
        "labels": labels,
        "data": data
    })





@charts.route("/home/assignment_load_weekly")
@login_required
def assignment_load_weekly():
    today = datetime.now(timezone.utc).date()

    # Start of this week (Monday)
    start_of_week = today - timedelta(days=today.weekday())

    labels = []
    data = []

    for i in range(4):
        week_start = start_of_week + timedelta(weeks=i)
        week_end = week_start + timedelta(days=6)

        count = (
            db.session.query(func.count(Assignment.assignment_id))
            .filter(
                Assignment.user_id == current_user.user_id,
                Assignment.due_at.isnot(None),
                cast(Assignment.due_at, Date) >= week_start,
                cast(Assignment.due_at, Date) <= week_end
            )
            .scalar()
        )

        labels.append(f"Week {week_start.day}–{week_end.day}")
        data.append(count)

    return jsonify({
        "labels": labels,
        "data": data
    })




@charts.route("/home/study_efficiency_by_class")
@login_required
def study_efficiency_by_class():
    """
    Radar chart data: study efficiency per class.
    """

    classes = (
        db.session.query(Class)
        .filter(Class.user_id == current_user.user_id)
        .all()
    )

    # ---------- Study time per class ----------
    study_times = (
        db.session.query(
            StudySession.class_id,
            func.coalesce(func.sum(StudySession.duration_minutes), 0)
        )
        .filter(
            StudySession.user_id == current_user.user_id,
            StudySession.is_completed == True
        )
        .group_by(StudySession.class_id)
        .all()
    )

    study_time_map = {cid: mins for cid, mins in study_times}
    max_study_time = max(study_time_map.values(), default=0)

    datasets = []

    for cls in classes:
        total_study_minutes = study_time_map.get(cls.class_id, 0)

        # Normalize study time (0–100)
        study_time_score = (
            (total_study_minutes / max_study_time) * 100
            if max_study_time > 0 else 0
        )

        # ---------- Average grade ----------
        avg_grade = (
            db.session.query(func.avg(Assignment.grade))
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.user_id == current_user.user_id,
                Assignment.grade.isnot(None)
            )
            .scalar()
        )
        avg_grade = float(avg_grade) if avg_grade else 0

        # ---------- Completion rate ----------
        total_assignments = (
            db.session.query(func.count(Assignment.assignment_id))
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.user_id == current_user.user_id
            )
            .scalar()
        )

        completed_assignments = (
            db.session.query(func.count(Assignment.assignment_id))
            .filter(
                Assignment.class_id == cls.class_id,
                Assignment.user_id == current_user.user_id,
                Assignment.is_completed == True
            )
            .scalar()
        )

        completion_rate = (
            (completed_assignments / total_assignments) * 100
            if total_assignments > 0 else 0
        )

        # ---------- Importance ----------
        importance_map = {
            "low": 33,
            "medium": 66,
            "high": 100
        }
        importance_score = importance_map.get(
            (cls.importance or "").lower(),
            0
        )

        # ---------- Difficulty ----------
        difficulty_score = (cls.difficulty or 0) * 10

        datasets.append({
            "label": cls.class_name,
            "color": cls.color,
            "values": [
                round(study_time_score, 1),
                round(avg_grade, 1),
                round(completion_rate, 1),
                importance_score,
                difficulty_score
            ],
            "raw": {
                "study_minutes": total_study_minutes,
                "avg_grade": avg_grade,
                "completion_rate": completion_rate,
                "importance": cls.importance,
                "difficulty": cls.difficulty
            }
        })

    return jsonify({
        "axes": [
            "Study Time",
            "Avg Grade",
            "Completion Rate",
            "Importance",
            "Difficulty"
        ],
        "datasets": datasets
    })
