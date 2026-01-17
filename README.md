
# Student Study Analytics & Planning Platform

## Overview

This project is a **backend-first academic workload analytics platform** designed to help students plan, track, and analyze their study effort across multiple classes and assignments.

The system emphasizes **data engineering, backend analytics, and explainable metrics**.
Raw academic activity is ingested, normalized, aggregated, and exposed through **clean API endpoints** that power dashboards and planning tools.

The core goal is to build a **production-oriented analytics backend** that transforms messy, real-world student data into reliable signals such as workload, difficulty, and risk.

---

## Core Objectives

* Design a **robust backend system** for academic workload tracking
* Apply **data engineering principles** to real user data
* Build **explainable analytics** (effort, difficulty, risk)
* Serve **chart-ready, API-driven data** to dashboards
* Create a solid foundation for future (optional) ML enhancements

This project intentionally prioritizes **correctness, clarity, and backend quality** over visual polish.

---

## Key Features (Current)


### 📊 Study & Assignment Analytics

* Track **study sessions** (duration, timestamps, completion state)
* Aggregate **actual time spent vs expected effort**
* Analyze workload **per class and per assignment**
* Prepare backend-driven datasets for visualization

---

### ⏱️ Effort & Difficulty Estimation

Assignments are enriched with expected effort and difficulty using:

* Assignment-type baselines
* Class-type similarity
* Historical student behavior

Estimation uses **weighted similarity scoring** — ensuring results remain **stable, interpretable, and explainable**.

---

### ⚠️ Risk Analytics

* Compute normalized risk scores (0–1)
* Risk derived from:

  * Historical grades
  * Time Pressure
  * Workload Overlap
  * Difficulty
* Risk is **decomposable and explainable**

---

### 📈 Dashboard-Ready Analytics

Backend endpoints are designed specifically for charts:

* Time spent vs expected effort
* Study distribution across classes
* Performance and risk indicators
* Trend and comparison views

Chart Eligibility & Data Sufficiency Gating

To prevent misleading or statistically weak analytics, the platform implements a backend-driven chart eligibility system located in app/services/analytics/chart_eligibility. Each dashboard page defines its own minimum data requirements (e.g. number of assignments, graded items, distinct deadlines) using explicit, versioned requirement definitions. Eligibility services then evaluate a user’s data against these thresholds, determining not only whether a chart can be shown, but also why it cannot. When requirements are not met, the backend returns structured progress metadata, representative examples, and explicit exclusion reasons (such as assignments missing due dates). The frontend never decides eligibility, it simply renders either the chart or a clear, actionable explanation describing what data is missing and why certain classes or assignments were excluded. This design treats insufficient data as a first-class state, ensuring that analytics are only displayed when they are meaningful, explainable, and trustworthy.

The frontend acts purely as a **consumer** of backend analytics.

## Architecture Overview

student-study-dashboard/
├── app/
│   ├── models/        # SQLAlchemy ORM models
│   ├── routes/        # Flask API routes
│   ├── services/      # Analytics & business logic
│   │   ├── chart_eligibility/ # Minimum data requirements to display charts
│   ├── static/
│   │   ├── css/       # Styling
│   │   └── js/        # Chart logic (Chart.js)
│   └── templates/     # HTML / Jinja templates
└── extensions.py      # Database, login manager, etc.


### Design Principles

* Business logic isolated from HTTP concerns
* Analytics logic centralized and reusable
* Clear separation between:

  * Data access
  * Chart eligibility
  * Transformation
  * Aggregation
  * Presentation

This mirrors real backend service architecture rather than frontend-driven analytics.

---

## Tech Stack

### Backend

* **Python**
* **Flask**
* **Flask-Login**
* **SQLAlchemy**
* **PostgreSQL**

### Data & Analytics

* Relational schema design
* SQL- and Python-based aggregation
* Weighted similarity scoring
* Normalization & bounded metrics
* Use of **Pandas / NumPy** for analytics

### Frontend (Lightweight)

* HTML / Jinja
* Vanilla JavaScript
* Chart.js
* CSS for layout and styling

---

## Data Engineering Focus

This project heavily emphasizes backend and data engineering concepts:

* **Schema design & normalization**
* **Derived metrics & feature construction**
* **Historical aggregation**
* **Explainable transformations**
* **Backend-driven analytics**

Examples include:

* Aggregating raw study sessions into per-assignment effort
* Estimating missing assignment metadata from historical behavior
* Computing normalized risk scores from multiple signals
* Preparing chart-ready datasets directly from backend services

---

## Current Development Status

### ✅ Implemented

* User, class, assignment, and study session models
* Study session tracking and aggregation
* Effort, difficulty, and risk computation
* Analytics service layer
* API endpoints for dashboards
* Multiple backend-driven charts (effort, risk, performance, trends)

### 🚧 In Progress

* Calendar integration
* Study session planning views
* Assignment scheduling interface
* Time-based workload forecasting

These represent the **immediate next milestones**.

---

## Planned Enhancements

### Near-Term

* Calendar-based workload visualization
* Smarter planning suggestions
* Improved historical trend analytics
* More granular performance metrics

### Long-Term

* Classical ML models (regression, clustering)
* ML used **only to enhance estimation accuracy**
* Models trained exclusively on user-specific historical data
* ML fully modular and optional

---

## Why This Project Exists

This project was built to demonstrate:

* Backend system design
* Data engineering fundamentals
* Analytical thinking under uncertainty
* Explainable, defensible business logic
* Production-style code organization

It is intentionally designed to resemble **real backend and analytics work**, not a typical student dashboard.

---

## Status

🚀 **Active development**

The system is evolving incrementally, with a strong focus on backend correctness, clarity, and maintainability.

---

