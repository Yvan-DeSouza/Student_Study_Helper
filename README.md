

Student Study Analytics & Planning Platform
Overview
This project is a backend-first data analytics platform for modeling, aggregating, and exposing academic workload and study behavior.
Rather than focusing on UI-first dashboards, the system is designed as a production-style analytics backend that ingests raw, messy student activity data and transforms it into explainable, decision-ready signals such as workload, difficulty, effort, and risk.
The project emphasizes data engineering principles:
schema design and normalization
deterministic transformations
explicit aggregation layers
backend-owned eligibility and correctness
clean, chart-ready APIs
The frontend acts strictly as a consumer of backend analytics, not a decision-maker.

Core Objectives
Design a robust backend analytics system for academic workload modeling
Apply data engineering and backend engineering practices to real-world user data
Build explainable, decomposable metrics (effort, difficulty, risk)
Serve API-driven, visualization-ready datasets
Create a strong foundation for future ML augmentation without dependency
The project intentionally prioritizes correctness, transparency, and backend quality over visual complexity.

Key Features (Current)
📊 Study & Assignment Analytics
Track raw study sessions (timestamps, duration, completion state)
Normalize and aggregate actual time spent vs expected effort
Compute workload at multiple granularities:
per assignment
per class
over time
Expose backend-prepared datasets optimized for analytical charts
This layer mirrors real analytics pipelines: ingestion → transformation → aggregation → exposure.

⏱️ Effort & Difficulty Estimation
Assignments are enriched with estimated effort and difficulty using:
Assignment-type baselines
Class-type similarity
Historical student behavior
Estimation is performed via weighted similarity scoring, ensuring outputs are:
stable over time
explainable
bounded and interpretable
No black-box models are used; all estimations can be traced to concrete inputs.

⚠️ Risk Analytics
Compute normalized risk scores (0–1) per assignment
Risk is derived from multiple independent signals:
Historical grades
Time pressure
Workload overlap
Estimated difficulty
Each component is retained and exposed for explanation
Risk is treated as a composed analytical feature, not a monolithic score.

📈 Dashboard-Ready Analytics
Backend endpoints are explicitly designed for analytics consumption, not raw CRUD access:
Time spent vs expected effort
Study distribution across classes
Performance and risk indicators
Trend and comparative views
Chart Eligibility & Data Sufficiency Gating
To prevent misleading or statistically weak analytics, the platform implements a backend-driven chart eligibility system located in:
app/services/analytics/chart_eligibility

Each dashboard defines explicit, versioned data requirements (e.g. minimum number of assignments, graded items, or distinct deadlines). Eligibility services evaluate user data against these thresholds and return:
whether a chart may be shown
why it cannot be shown
what data is missing
concrete progress toward eligibility
When requirements are not met, the backend returns structured explanations and representative exclusions (e.g. assignments missing due dates).
The frontend never decides eligibility — it renders either the chart or a clear, actionable explanation.
This treats insufficient data as a first-class analytical state, ensuring analytics are only displayed when they are meaningful and trustworthy.

🧱 Backend-Driven Column System (Assignments Table)
The assignments table is powered by a column-oriented analytics system inspired by BI and data platform design rather than traditional UI tables.
Columns are treated as first-class analytical entities, not frontend decorations.
The backend is the single source of truth for:
Which columns exist
When a column may appear
Whether a column is visible, hidden, or locked
Whether a column is sortable, filterable, or interactive
The frontend renders only what the backend authoritatively returns.

Column Registry (Foundational Metadata)
All columns are defined centrally in a Column Registry:
app/services/columns/

This registry defines column existence independently of UI or user state.
Each column declares:
Stable column_key
Display label
Category (core / simple / computed / advanced)
Capabilities (sortable, filterable, selectable)
Eligibility requirements
Default visibility and hideability
If a column is not registered, it does not exist anywhere in the system.
This prevents:
stringly-typed logic
UI-defined analytics
accidental metric exposure

Column Eligibility Engine (Data Sufficiency & Gating)
Computed and advanced columns are gated by a backend eligibility engine.
Eligibility checks:
Operate purely on backend data
Are independent of UI state
Return structured explanations describing:
why a column is locked
what data is missing
how close the user is to unlocking it
Each column owns its own eligibility rules, making the system modular and extensible.
Eligibility is evaluated globally, not per-table filter, ensuring consistency and fairness.

Analytics Computation (Pure & Stateless)
All analytical values (effort, risk, volatility, confidence, deadline sensitivity) are computed in dedicated services:
app/services/analytics/computation/

These modules are:
Pure
Deterministic
Stateless
Independently testable
They:
Never check eligibility
Never handle visibility
Never reference UI concerns
This enforces clean separation between feature computation and feature exposure.

Column Orchestration (Core Engine)
The orchestration layer assembles the final column state.
Located in:
app/services/analytics/column_orchestration/

It:
Merges registry metadata
Applies user preferences
Enforces eligibility
Produces authoritative column states:
visible
hidden
locked
The assignment_row_builder constructs rows end-to-end:
Executes analytics only when permitted
Injects placeholders for locked columns
Attaches explanations and metadata
HTTP routes only orchestrate services and return JSON — no business logic lives in controllers.

Minimal, Intent-Only Database Role
The database stores user intent only, not derived analytics state.
Relevant tables:
shown_assignment_columns
assignment_view_preferences
All eligibility and analytics are recomputed, ensuring correctness as data evolves.

Frontend as a Renderer, Not a Decision Maker
The frontend functions strictly as a renderer.
It:
Requests assignment IDs and ordering
Fetches column metadata and rows
Renders cells and explanations
It never:
Computes analytics
Determines eligibility
Hardcodes column behavior
Infers metric meaning
This allows the same backend to support tables, dashboards, or future consumers without duplication.

End-to-End Flow
User interaction triggers reload
Backend:
Loads column registry
Computes eligibility
Resolves column states
Builds rows
Frontend:
Renders backend output verbatim
The result is a predictable, explainable analytics surface.

Architecture Overview
student-study-dashboard/
├── app/
│   ├── models/        # SQLAlchemy ORM models
│   ├── routes/        # Thin Flask API routes
│   ├── services/      # Analytics & business logic
│   │   ├── analytics/
│   │   │  ├── chart_eligibility/
│   │   │  ├── column_eligibility/
│   │   │  ├── column_orchestration/
│   │   │  ├── computation/
│   │   ├── columns/
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   └── templates/
└── extensions.py

Design Principles
Business logic isolated from HTTP
Analytics centralized and reusable
Explicit separation between:
data access
eligibility
transformation
aggregation
presentation
This mirrors real backend service architectures.

Tech Stack
Backend
Python
Flask
Flask-Login
SQLAlchemy
PostgreSQL
Data & Analytics
Relational schema design
SQL and Python aggregation
Weighted similarity scoring
Normalization and bounded metrics
Pandas / NumPy for analytics
Frontend (Lightweight)
HTML / Jinja
Vanilla JavaScript
Chart.js
CSS

Data Engineering Focus
This project emphasizes data engineering fundamentals:
Schema design and normalization
Feature construction
Historical aggregation
Deterministic transformations
Backend-owned analytics
Examples:
Aggregating raw study sessions into effort metrics
Estimating missing metadata from historical behavior
Composing risk from multiple independent signals
Preparing chart-ready datasets in backend services

Current Development Status
✅ Implemented
Core data models
Study session ingestion and aggregation
Effort, difficulty, and risk computation
Analytics service layer
Dashboard APIs
Backend-driven charts
🚧 In Progress
Calendar integration
Planning views
Scheduling interfaces
Time-based workload forecasting

Planned Enhancements
Near-Term
Calendar workload visualization
Planning suggestions
Deeper trend analytics
Finer-grained performance metrics
Long-Term
Classical ML (regression, clustering)
ML used only to enhance estimation accuracy
User-specific training only
Fully modular and optional ML layer

Why This Project Exists
This project was built to demonstrate:
Backend system design
Data engineering fundamentals
Analytical reasoning under uncertainty
Explainable, defensible logic
Production-style architecture
It is intentionally structured to resemble real backend and analytics work, not a UI-heavy student project.

Status
🚀 Active development
The system is evolving incrementally, with a strong focus on backend correctness, clarity, and maintainability.





