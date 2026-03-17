/**
 * static/js/calendar/modals/calendar_event_details.js
 *
 * Read-only event details modal.
 * Edit button wired for both assignments and study sessions.
 * Fetches data from /api/calendar/... endpoints.
 */

import { calendarState }                         from "../calendar_state.js";
import { formatDate, formatTime }                from "../utils/timeUtils.js";
import { userTimezone }                          from "../domain/time.js";

// Track whether edit-form submit handlers have been wired (so we don't double-wire)
let _assignmentFormWired = false;
let _sessionFormWired    = false;

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

export function openEventDetailsModal(eventId) {
  const event = calendarState.getEventById(eventId);
  if (!event) {
    console.warn("[EventDetails] Event not found:", eventId);
    return;
  }
  calendarState.setSelectedEventId(eventId);
  _populate(event);
  _showModal("calendarEventDetailsModal");
}

export function initEventDetailsModal() {
  // Close buttons on the details modal
  _initCloseListeners("calendarEventDetailsModal", () => {
    calendarState.setSelectedEventId(null);
  });
}

// ─────────────────────────────────────────────────────────────
// POPULATE DETAILS MODAL
// ─────────────────────────────────────────────────────────────

function _populate(event) {
  const colorBar = document.getElementById("cal-modal-color-bar");
  if (colorBar) colorBar.style.backgroundColor = event.color || "#6366f1";

  _setText("cal-modal-title",       event.title);
  _setText("cal-modal-type",        _formatType(event.type));
  _setText("cal-modal-entity-type", _formatEntity(event.entity_type));

  const statusEl = document.getElementById("cal-modal-status");
  if (statusEl) {
    statusEl.textContent = _statusLabel(event);
    statusEl.className   = `cal-modal-status-badge status-${event.lifecycle_type}`;
  }

  _setText("cal-modal-date", event.start ? formatDate(event.start, userTimezone) : "—");

  const timeEl = document.getElementById("cal-modal-time");
  if (timeEl) {
    if (event.all_day) {
      timeEl.textContent = "All day";
    } else if (event.start) {
      timeEl.textContent = event.end
        ? `${formatTime(event.start, userTimezone)} – ${formatTime(event.end, userTimezone)}`
        : formatTime(event.start, userTimezone);
    } else {
      timeEl.textContent = "—";
    }
  }

  _setText("cal-modal-class", event.metadata?.class_name || "—");
  const dot = document.getElementById("cal-modal-class-color");
  if (dot) dot.style.backgroundColor = event.metadata?.class_color || "#ccc";

  const editBtn = document.getElementById("cal-modal-edit-btn");
  if (editBtn) {
    editBtn.style.display = event.editable ? "" : "none";
    editBtn.onclick       = () => _handleEdit(event);
  }
}

// ─────────────────────────────────────────────────────────────
// EDIT DISPATCH
// ─────────────────────────────────────────────────────────────

async function _handleEdit(event) {
  _hideModal("calendarEventDetailsModal");
  calendarState.setSelectedEventId(null);

  if (event.entity_type === "assignment") {
    await _editAssignment(event.source_id);
  } else if (event.entity_type === "study_session") {
    await _editSession(event.source_id);
  }
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENT EDIT
// ─────────────────────────────────────────────────────────────

async function _editAssignment(id) {
  try {
    const resp = await _apiFetch(`/api/calendar/assignments/${id}`);
    if (!resp.ok) throw new Error("Fetch failed");
    const data = await resp.json();
    await _populateAssignmentForm(data);
    _showModal("editAssignmentModal");
  } catch (err) {
    console.error("[EventDetails] assignment edit:", err);
    alert("Could not load assignment data.");
  }
}

async function _populateAssignmentForm(a) {
  // Ensure type dropdown has options
  const typeEl = document.getElementById("edit-type");
  if (typeEl && typeEl.options.length === 0) {
    ["homework","project","quiz","writing","test","exam","lab_report","presentation","reading","other"]
      .forEach(t => {
        const o = new Option(t.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()), t);
        typeEl.appendChild(o);
      });
  }

  // Ensure class dropdown has options (clone from add_assignment select if available)
  const editClassEl = document.getElementById("edit-class");
  if (editClassEl && editClassEl.options.length === 0) {
    const source = document.getElementById("assignment-class");
    if (source) {
      Array.from(source.options).forEach(o => editClassEl.appendChild(o.cloneNode(true)));
    } else {
      // Fallback: fetch from API
      try {
        const r = await _apiFetch("/api/calendar/classes");
        if (r.ok) {
          const classes = await r.json();
          classes.forEach(c => editClassEl.appendChild(new Option(c.class_name, c.class_id)));
        }
      } catch (_) {}
    }
  }

  _setVal("edit-assignment-id",    a.id);
  _setVal("edit-title",            a.title);
  if (editClassEl) editClassEl.value = a.class_id;
  if (typeEl)      typeEl.value      = a.assignment_type;
  _setVal("edit-due-at",           _toLocal(a.due_at));
  _setVal("edit-finished-at",      _toLocal(a.finished_at));

  const gradedCb   = document.getElementById("edit-is-graded");
  const gradedOnly = document.getElementById("edit-graded-only");
  if (gradedCb) {
    gradedCb.checked = !!a.is_graded;
    if (gradedOnly) gradedOnly.classList.toggle("hidden", !a.is_graded);
    gradedCb.onchange = e => gradedOnly?.classList.toggle("hidden", !e.target.checked);
  }

  _setVal("edit-expected-grade",    a.expected_grade   ?? "");
  _setVal("edit-pass-grade",        a.pass_grade       ?? "");
  _setVal("edit-ponderation",       a.ponderation      ?? "");
  _setVal("edit-difficulty",        a.difficulty       ?? "");
  _setVal("edit-estimated-minutes", a.estimated_minutes ?? "");

  // Wire submit if not already done
  if (!_assignmentFormWired) {
    _assignmentFormWired = true;
    const form = document.getElementById("editAssignmentForm");
    if (form) {
      form.addEventListener("submit", _onAssignmentEditSubmit);
    }
  }
}

async function _onAssignmentEditSubmit(e) {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;

  try {
    const id      = parseInt(_getVal("edit-assignment-id") || "0");
    const graded  = document.getElementById("edit-is-graded")?.checked;
    const csrf    = _getCsrf();

    const payload = {
      title:             _getVal("edit-title"),
      assignment_type:   _getVal("edit-type") || undefined,
      class_id:          parseInt(_getVal("edit-class") || "0") || undefined,
      due_at:            _getVal("edit-due-at")       || null,
      finished_at:       _getVal("edit-finished-at")  || null,
      is_graded:         graded,
      difficulty:        _getVal("edit-difficulty")        || null,
      estimated_minutes: _getVal("edit-estimated-minutes") || null,
    };
    if (graded) {
      payload.expected_grade = _getVal("edit-expected-grade") || null;
      payload.pass_grade     = _getVal("edit-pass-grade")     || null;
      payload.ponderation    = _getVal("edit-ponderation")    || null;
    }

    const resp = await fetch(`/api/calendar/assignments/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
      body:    JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error("Update failed");

    _hideModal("editAssignmentModal");
    document.dispatchEvent(new CustomEvent("assignment:updated"));
  } catch (err) {
    console.error(err);
    alert("Failed to update assignment.");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─────────────────────────────────────────────────────────────
// SESSION EDIT
// ─────────────────────────────────────────────────────────────

async function _editSession(id) {
  try {
    const resp = await _apiFetch(`/api/calendar/sessions/${id}`);
    if (!resp.ok) throw new Error("Fetch failed");
    const data = await resp.json();
    _populateSessionForm(data);
    _showModal("calendarEditSessionModal");
  } catch (err) {
    console.error("[EventDetails] session edit:", err);
    alert("Could not load session data.");
  }
}

function _populateSessionForm(s) {
  _setVal("cal-edit-session-id",     s.session_id);
  _setVal("cal-edit-session-title",  s.title);
  _setText("cal-edit-session-class", s.class_name || "");

  const typeEl = document.getElementById("cal-edit-session-type");
  if (typeEl) typeEl.value = s.session_type || "homework";

  _setVal("cal-edit-session-sched-start", _toLocal(s.scheduled_start_at));
  _setVal("cal-edit-session-sched-end",   _toLocal(s.scheduled_end_at));
  _setVal("cal-edit-session-duration",    s.expected_duration_minutes ?? "");

  if (!_sessionFormWired) {
    _sessionFormWired = true;
    const form = document.getElementById("calendarEditSessionForm");
    if (form) form.addEventListener("submit", _onSessionEditSubmit);
  }
}

async function _onSessionEditSubmit(e) {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;

  try {
    const id   = parseInt(_getVal("cal-edit-session-id") || "0");
    const csrf = _getCsrf();

    const payload = {
      title:                     _getVal("cal-edit-session-title"),
      session_type:              _getVal("cal-edit-session-type"),
      scheduled_start_at:        _getVal("cal-edit-session-sched-start") || null,
      scheduled_end_at:          _getVal("cal-edit-session-sched-end")   || null,
      expected_duration_minutes: _getVal("cal-edit-session-duration")    || null,
    };

    const resp = await fetch(`/api/calendar/sessions/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
      body:    JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error("Update failed");

    _hideModal("calendarEditSessionModal");
    document.dispatchEvent(new CustomEvent("session:updated"));
  } catch (err) {
    console.error(err);
    alert("Failed to update session.");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─────────────────────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────────────────────

function _showModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove("hidden");
  m.classList.add("visible", "modal-top");
}

function _hideModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove("visible", "modal-top");
  m.classList.add("hidden");
}

function _initCloseListeners(id, onClose) {
  const m = document.getElementById(id);
  if (!m) return;
  m.addEventListener("click", e => {
    if (e.target === m || e.target.closest("[data-close-modal]")) {
      _hideModal(id);
      onClose?.();
    }
  });
}

// ─────────────────────────────────────────────────────────────
// DOM / FETCH HELPERS
// ─────────────────────────────────────────────────────────────

function _apiFetch(url, opts = {}) {
  return fetch(url, {
    headers: { Accept: "application/json", "X-CSRFToken": _getCsrf(), ...opts.headers },
    ...opts,
  });
}

function _getCsrf() {
  return document.querySelector('meta[name="csrf-token"]')?.content || "";
}

function _setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text ?? ""; }
function _setVal(id, val)   { const el = document.getElementById(id); if (el) el.value = val  ?? ""; }
function _getVal(id)        { return document.getElementById(id)?.value?.trim() ?? ""; }

function _toLocal(iso) {
  if (!iso) return "";
  const d   = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function _formatType(type) {
  return {
    assignment_due:      "Assignment Due",
    assignment_created:  "Assignment Added",
    assignment_finished: "Assignment Completed",
    session_scheduled:   "Study Session",
    session_active:      "Active Session",
    session_completed:   "Completed Session",
    session_cancelled:   "Cancelled Session",
    class_created:       "Class Started",
    class_finished:      "Class Finished",
  }[type] || type;
}

function _formatEntity(et) {
  return { assignment: "Assignment", study_session: "Study Session", class: "Class" }[et] || et;
}

function _statusLabel(event) {
  if (event.metadata?.is_cancelled)          return "Cancelled";
  if (event.metadata?.is_completed)          return "Completed";
  if (event.lifecycle_type === "active")     return "In Progress";
  if (event.lifecycle_type === "scheduled")  return "Scheduled";
  if (event.lifecycle_type === "due")        return "Due";
  if (event.lifecycle_type === "created")    return "Added";
  return "";
}