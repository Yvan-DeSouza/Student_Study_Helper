# Student Study Analytics & Planning Platform

## Overview

This project is a **backend-heavy study tracking and analytics platform** designed to help students plan, track, and analyze their academic workload across multiple classes and assignments.

The system focuses on **data engineering, backend logic, and analytical insights**, including:
- Study session tracking
- Assignment effort estimation
- Risk and performance analytics
- Class-level and assignment-level visualizations

The goal is to build a **production-oriented backend system** that ingests structured academic data, transforms it into meaningful metrics, and exposes it through clean APIs for dashboards and planning tools.

This project is being developed with a strong emphasis on **scalable data modeling, clean service layers, and explainable analytics**, rather than heavy machine learning.

---

## Core Goals

- Build a **robust backend system** for academic workload tracking
- Apply **data engineering principles** to real user data
- Design **explainable analytical metrics** (effort, difficulty, risk)
- Serve clean, structured data to dashboards and charts
- Lay the foundation for future ML-based enhancements (later stage)

---

## Key Features (Current)

### 📊 Study & Assignment Analytics
- Track **study sessions** with duration and completion state
- Aggregate **actual time spent vs expected time**
- Analyze workload **per class and per assignment**
- Generate data for dashboard visualizations

### ⏱️ Effort & Difficulty Estimation
- Estimated time and difficulty for assignments
- Uses:
  - Assignment type baselines
  - Class type similarity
  - Historical performance
- Weighted similarity scoring (no ML, fully explainable)

### ⚠️ Risk Analytics
- Historical performance-based risk scoring
- Normalized risk values (0–1)
- Risk derived from grades, effort mismatch, and consistency
- Explainable math-based logic (averages, weights, normalization)

### 📈 Dashboard Graphs
- Time spent vs expected time (per class)
- Study distribution across classes
- Performance and risk indicators
- Backend endpoints designed specifically for charts

---

## Architecture Overview
student-study-dashboard/
app/
├── models/ # SQLAlchemy ORM models
├── routes/ # Flask API routes
├── services/ # Business logic & analytics
├── static/ # Frontend JS (charts, UI logic)
│ ├── templates/ # HTML templates
│ ├── css/ # Styling
│ ├── js/ # Frontend JS (charts, UI logic)
└── extensions.py # DB, login manager, etc.

### Design Principles
- Business logic isolated from HTTP layer
- Analytics logic centralized and reusable
- Clear separation between:
  - Data access
  - Transformation
  - Aggregation
  - Presentation

---

## Tech Stack

### Backend
- **Python**
- **Flask**
- **Flask-Login**
- **SQLAlchemy**
- **PostgreSQL**

### Data & Analytics
- Relational schema design
- Aggregations with SQL + Python
- Weighted similarity scoring
- Normalization and explainable metrics
- Pandas / NumPy (light usage for analytics)

### Frontend (Lightweight)
- HTML / Jinja
- Vanilla JavaScript
- Chart.js for data visualization
- Csss for styling

---

## Data Engineering Focus

This project heavily emphasizes:
- **Schema design**
- **Data normalization**
- **Derived metrics**
- **Historical aggregation**
- **Explainable transformations**
- **Backend-driven analytics**

Examples:
- Aggregating study sessions into per-assignment effort
- Estimating missing assignment metadata from historical data
- Computing risk scores using normalized and weighted data
- Preparing chart-ready datasets directly from backend services

---

## Current Stage of Development

### ✅ Implemented
- User, class, assignment, and study session models
- Study session tracking and aggregation
- Effort, difficulty, and risk computation
- Backend analytics endpoints
- Dashboard graphs (time, effort, risk, performance, trends)
- Service-oriented backend architecture

### 🚧 In Progress (Next Steps)
- Calendar integration
- Study session planning view
- Assignment scheduling UI
- Time-based workload forecasting

These features are the **immediate next milestones**.

---

## Planned Future Enhancements

### Near-Term
- Calendar-based workload visualization
- Smarter planning suggestions
- Better historical trend analytics
- More granular performance metrics

### Long-Term (Months Out)
- Classical ML models (regression, clustering)
- ML used **only** to enhance estimation accuracy
- Models trained on user’s own historical data
- ML strictly modular and optional



---

## Why This Project

This project was built to demonstrate:
- Backend system design
- Data engineering skills
- Analytical thinking
- Clean, explainable business logic
- Production-style code organization

It is intentionally designed to resemble **real backend work**.

---

## Status

🚀 **Active development**

This project is evolving incrementally, with a strong focus on correctness, clarity, and backend quality.

---


