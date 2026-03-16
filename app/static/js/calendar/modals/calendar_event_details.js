/**
 * static/js/calendar/modals/calendar_event_details.js
 *
 * Read-only event details modal.
 * Edit button now wired for both assignments and study sessions.
 */

import { calendarState }                         from "../calendar_state.js";
import { formatDate, formatTime, formatDateTime } from "../utils/timeUtils.js";
import { userTimezone }                          from "../domain/time.js";

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

export function openEventDetailsModal(eventId) {
  const event = calendarState.getEventById(eventId);
  if (!event) {
    console.warn("[EventDetails] Event not found in state:", eventId);
    return;
  }
  calendarState.setSelectedEventId(eventId);
  _populate(event);
  _showModal();
}

export function initEventDetailsModal() {
  const modal = document.getElementById("calendarEventDetailsModal");
  if (!modal) return;

  modal.addEventListener("click", e => {
    if (e.target.closest("[data-close-modal]") || e.target === modal) {
      _hideModal(modal);
      calendarState.setSelectedEventId(null);
    }
  });

  // Wire edit-assignment form submit (calendar context)
  _initAssignmentEditForm();

  // Wire edit-session form submit (calendar context)
  _initSessionEditForm();
}

// ─────────────────────────────────────────────────────────────
// PRIVATE — POPULATE
// ─────────────────────────────────────────────────────────────

function _populate(event) {
  const colorBar = document.getElementById("cal-modal-color-bar");
  if (colorBar) colorBar.style.backgroundColor = event.color || "#6366f1";

  _setText("cal-modal-title", event.title);
  _setText("cal-modal-type", _formatType(event.type));

  const statusEl = document.getElementById("cal-modal-status");
  if (statusEl) {
    statusEl.textContent = _getStatusLabel(event);
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

  const entityBadge = document.getElementById("cal-modal-entity-type");
  if (entityBadge) entityBadge.textContent = _formatEntityType(event.entity_type);

  const editBtn = document.getElementById("cal-modal-edit-btn");
  if (editBtn) {
    editBtn.style.display = event.editable ? "" : "none";
    editBtn.onclick       = () => _handleEdit(event);
  }
}

function _showModal() {
  const modal = document.getElementById("calendarEventDetailsModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("visible", "modal-top");
}

function _hideModal(modal) {
  modal.classList.remove("visible", "modal-top");
  modal.classList.add("hidden");
}

// ─────────────────────────────────────────────────────────────
// PRIVATE — EDIT DISPATCH
// ─────────────────────────────────────────────────────────────

async function _handleEdit(event) {
  // Close the details modal first
  const detailsModal = document.getElementById("calendarEventDetailsModal");
  if (detailsModal) _hideModal(detailsModal);
  calendarState.setSelectedEventId(null);

  if (event.entity_type === "assignment") {
    await _openAssignmentEdit(event.source_id);
  } else if (event.entity_type === "study_session") {
    await _openSessionEdit(event.source_id);
  }
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENT EDIT
// ─────────────────────────────────────────────────────────────

async function _openAssignmentEdit(assignmentId) {
  try {
    const resp = await fetch(`/assignments/${assignmentId}/detail`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) throw new Error("Failed to fetch assignment");
    const a = await resp.json();
    await _populateAndShowAssignmentModal(a);
  } catch (err) {
    console.error("[EventDetails] Assignment edit failed:", err);
    alert("Could not load assignment data for editing.");
  }
}

async function _populateAndShowAssignmentModal(a) {
  // Ensure type dropdown is populated
  const typeSelect = document.getElementById("edit-type");
  if (typeSelect && typeSelect.options.length === 0) {
    ["homework","project","quiz","writing","test","exam","lab_report","presentation","reading","other"]
      .forEach(t => {
        const opt = document.createElement("option");
        opt.value       = t;
        opt.textContent = t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        typeSelect.appendChild(opt);
      });
  }

  // Ensure class dropdown is populated
  const classSelect = document.getElementById("edit-class");
  if (classSelect && classSelect.options.length === 0) {
    try {
      const cr = await fetch("/classes/json");
      if (cr.ok) {
        const classes = await cr.json();
        classes.forEach(c => {
          const opt = document.createElement("option");
          opt.value       = c.class_id;
          opt.textContent = c.class_name;
          classSelect.appendChild(opt);
        });
      }
    } catch (_) { /* class dropdown stays empty */ }
  }

  // Set values
  _setVal("edit-assignment-id", a.id);
  _setVal("edit-title",         a.title);
  if (classSelect) classSelect.value = a.class_id;
  if (typeSelect)  typeSelect.value  = a.assignment_type;
  _setVal("edit-due-at",          _toDatetimeLocal(a.due_at));
  _setVal("edit-finished-at",     _toDatetimeLocal(a.finished_at));

  const gradedCb = document.getElementById("edit-is-graded");
  if (gradedCb) {
    gradedCb.checked = !!a.is_graded;
    const gradedOnly = document.getElementById("edit-graded-only");
    if (gradedOnly) gradedOnly.classList.toggle("hidden", !a.is_graded);
  }

  _setVal("edit-expected-grade",   a.expected_grade ?? "");
  _setVal("edit-pass-grade",       a.pass_grade     ?? "");
  _setVal("edit-ponderation",      a.ponderation    ?? "");
  _setVal("edit-difficulty",       a.difficulty     ?? "");
  _setVal("edit-estimated-minutes", a.estimated_minutes ?? "");

  const modal = document.getElementById("editAssignmentModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("visible", "modal-top");
  }
}

// Submit handler — calendar context (no add_assignment_submit.js loaded here)
function _initAssignmentEditForm() {
  const form = document.getElementById("editAssignmentForm");
  if (!form || form.dataset.calendarInit) return;
  form.dataset.calendarInit = "1";

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;

    try {
      const id         = parseInt(document.getElementById("edit-assignment-id")?.value);
      const isGraded   = document.getElementById("edit-is-graded")?.checked;
      const csrfToken  = document.querySelector('meta[name="csrf-token"]')?.content || "";

      const payload = {
        title:             document.getElementById("edit-title")?.value,
        assignment_type:   document.getElementById("edit-type")?.value,
        class_id:          parseInt(document.getElementById("edit-class")?.value) || null,
        due_at:            document.getElementById("edit-due-at")?.value     || null,
        finished_at:       document.getElementById("edit-finished-at")?.value || null,
        is_graded:         isGraded,
        difficulty:        document.getElementById("edit-difficulty")?.value || null,
        estimated_minutes: document.getElementById("edit-estimated-minutes")?.value || null,
      };

      if (isGraded) {
        payload.expected_grade = document.getElementById("edit-expected-grade")?.value || null;
        payload.pass_grade     = document.getElementById("edit-pass-grade")?.value     || null;
        payload.ponderation    = document.getElementById("edit-ponderation")?.value    || null;
      }

      const resp = await fetch(`/assignments/${id}/update`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body:    JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("Update failed");

      const modal = document.getElementById("editAssignmentModal");
      if (modal) _hideModal(modal);

      document.dispatchEvent(new CustomEvent("assignment:updated"));
    } catch (err) {
      console.error(err);
      alert("Failed to update assignment.");
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// SESSION EDIT
// ─────────────────────────────────────────────────────────────

async function _openSessionEdit(sessionId) {
  try {
    const resp = await fetch(`/study/${sessionId}/detail`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) throw new Error("Failed to fetch session");
    const s = await resp.json();
    _populateSessionEditModal(s);

    const modal = document.getElementById("calendarEditSessionModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("visible", "modal-top");
    }
  } catch (err) {
    console.error("[EventDetails] Session edit failed:", err);
    alert("Could not load session data for editing.");
  }
}

function _populateSessionEditModal(s) {
  _setVal("cal-edit-session-id",         s.session_id);
  _setVal("cal-edit-session-title",      s.title);
  _setVal("cal-edit-session-class-name", s.class_name || "");
  _setVal("cal-edit-session-sched-start", _toDatetimeLocal(s.scheduled_start_at));
  _setVal("cal-edit-session-sched-end",   _toDatetimeLocal(s.scheduled_end_at));
  _setVal("cal-edit-session-duration",   s.expected_duration_minutes || "");

  const typeSelect = document.getElementById("cal-edit-session-type");
  if (typeSelect) typeSelect.value = s.session_type || "homework";
}

// Submit handler for the calendar session edit form
function _initSessionEditForm() {
  const form = document.getElementById("calendarEditSessionForm");
  if (!form || form.dataset.calendarInit) return;
  form.dataset.calendarInit = "1";

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;

    try {
      const sessionId = parseInt(document.getElementById("cal-edit-session-id")?.value);
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";

      const payload = {
        title:                     document.getElementById("cal-edit-session-title")?.value,
        session_type:              document.getElementById("cal-edit-session-type")?.value,
        scheduled_start_at:        document.getElementById("cal-edit-session-sched-start")?.value || null,
        scheduled_end_at:          document.getElementById("cal-edit-session-sched-end")?.value   || null,
        expected_duration_minutes: document.getElementById("cal-edit-session-duration")?.value    || null,
      };

      const resp = await fetch(`/study/${sessionId}/update`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body:    JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("Update failed");

      const modal = document.getElementById("calendarEditSessionModal");
      if (modal) _hideModal(modal);

      document.dispatchEvent(new CustomEvent("session:updated"));
    } catch (err) {
      console.error(err);
      alert("Failed to update session.");
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? "";
}

function _toDatetimeLocal(iso) {
  if (!iso) return "";
  const d   = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function _formatType(type) {
  const m = {
    assignment_due:      "Assignment Due",
    assignment_created:  "Assignment Added",
    assignment_finished: "Assignment Completed",
    session_scheduled:   "Study Session",
    session_active:      "Active Session",
    session_completed:   "Session Completed",
    session_cancelled:   "Session Cancelled",
    class_created:       "Class Started",
    class_finished:      "Class Finished",
  };
  return m[type] || type;
}

function _formatEntityType(et) {
  return { assignment: "Assignment", study_session: "Study Session", class: "Class" }[et] || et;
}

function _getStatusLabel(event) {
  if (event.metadata?.is_cancelled)         return "Cancelled";
  if (event.metadata?.is_completed)         return "Completed";
  if (event.lifecycle_type === "active")    return "In Progress";
  if (event.lifecycle_type === "scheduled") return "Scheduled";
  if (event.lifecycle_type === "due")       return "Due";
  if (event.lifecycle_type === "created")   return "Added";
  return "";
}