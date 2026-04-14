# StudyMate — Student Study Analytics Platform
 
A backend-first data analytics platform that models and transforms raw student activity data into explainable workload, effort, difficulty, and risk metrics. Built to mirror real production analytics systems: normalized data, stateless computation, backend-owned business logic, and clean chart-ready APIs.
 
---
 
## What This Project Is
 
StudyMate is not a typical student CRUD app. The focus is on **data engineering and backend systems design**, taking messy raw inputs (assignment deadlines, study session logs, grades) and transforming them into defensible, explainable analytical signals. The frontend is deliberately kept thin. It renders what the backend tells it to render, and makes no analytical decisions of its own.
 
The project was built to demonstrate backend system design, feature engineering, and the kind of architectural reasoning that shows up in real analytics and data platform work.
 
---
 
## Core Philosophy
 
**The backend owns all logic.** Eligibility rules, metric computation, column visibility, chart data sufficiency — none of this lives in the frontend. The frontend receives structured JSON and renders it. This separation means the same backend could serve a table, a dashboard, a mobile app, or a future API consumer without any logic duplication.
 
**Correctness over convenience.** Analytics are only shown when they are statistically meaningful. A risk score computed from two graded assignments would be noise. The system tracks whether the user has accumulated enough data for each metric and blocks display until they have, explaining concretely what is missing and how close they are to unlocking it.
 
**Explainability over black boxes.** Every metric is decomposable. Risk is not a single number — it is a weighted combination of time pressure, difficulty, historical performance, and workload overlap, each of which is retained and exposed. The user can always see why a value is what it is.
 
**Intent in the database, derived state in memory.** The database stores only what the user chose: which columns to show, what their filter preferences are, their raw study sessions and grades. All analytical output (risk scores, effort efficiency, volatility) is recomputed on every request from that raw data. There is no stale cache to invalidate.
 
---
 
## System Overview
 
### Assignments Table — Column System
 
The assignments table is driven by a **column registry** , a backend-defined catalog of every column that can possibly exist in the system. Columns are classified into four tiers: core (always visible), simple (user-togglable raw fields), computed (derived from raw data), and advanced (analytically complex, gated by eligibility).
 
The backend resolves the final state of each column on every request by merging three inputs: the registry definition, the user's saved visibility preferences, and the current eligibility evaluation. The frontend receives column metadata and row data as JSON and renders exactly what it receives — it never decides which columns to show or whether a cell should be locked.
 
Advanced columns (risk score, effort efficiency, volatility, deadline sensitivity, predictability confidence) have a two-level lock system. The column itself is locked if the user doesn't have enough historical data globally. Individual cells within an unlocked column can still be locked if that specific assignment doesn't qualify — for example, risk score is meaningless on a completed assignment.
 
### Analytics Computation
 
All metric computation lives in stateless, pure Python functions that take assignment data and return values with structured diagnostics. Computations never touch the database and never check eligibility — they simply perform math.
 
The core analytical primitive is **weighted similarity scoring**: when estimating expected effort, computing historical risk, or measuring volatility, the system weighs past assignments by how similar they are to the current one (same class type, same assignment type, same class) and how recent they are. This produces stable, explainable estimates without any machine learning.
 
Risk is composed from four independent signals: time pressure (exponential urgency curve based on days until deadline), difficulty (normalized from user input or estimated from history), historical performance (similarity-weighted average of past grades), and workload overlap (how many other assignments are active in the same window, normalized against the student's own workload baseline).
 
### Chart Eligibility System
 
Charts follow the same philosophy as columns: they are only shown when the underlying data is sufficient to make them meaningful. Each chart has a formally defined set of minimum requirements (number of graded assignments, number of classes, days of history, etc.) evaluated by the backend before the chart data is computed.
 
When requirements are not met, the backend returns a structured explanation — what is missing, what the current count is, and what threshold needs to be reached. The frontend renders this explanation instead of the chart. The frontend never decides whether a chart should be shown; it only decides how to render the backend's verdict.
 
### Calendar System
 
The calendar is a **projection layer**, not a separate data store. It reads from the existing assignments and study sessions tables and renders their timestamps as calendar events. There are no new database tables. An assignment with a due date, a creation date, and a finish date can produce up to three distinct calendar events from a single database row.
 
Each event goes through a transformation chain: raw ORM data → lifecycle projection → normalized CalendarEvent dict → permission flags → filter application → JSON. The frontend knows nothing about assignments or study sessions — it only knows about CalendarEvents, a fixed shape with an entity type and lifecycle type. This means the rendering layer is completely immune to domain changes; adding a new event type only requires implementing the factory step.
 
Drag-and-drop reschedules use optimistic updates — the event moves immediately in the UI, then the API call confirms it. On failure the event snaps back. All permission validation (whether an event is actually draggable) is enforced server-side on every mutation, independent of what the frontend sends.
 
---
 
## Tech Stack
 
**Backend:** Python, Flask, SQLAlchemy, PostgreSQL
 
**Analytics:** Pure Python computation (NumPy, Pandas for specific aggregations), weighted similarity scoring, normalized risk composition
 
**Frontend:** Vanilla JavaScript (ES modules), Jinja2 templates, Chart.js, CSS
 
---
 
## Project Status
 
Active development. Core systems (column engine, analytics computation, eligibility gating, calendar, chart system) are implemented. Planning and scheduling views are in progress.
