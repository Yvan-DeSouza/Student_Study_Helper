/**
 * static/js/calendar/calendar.js
 *
 * Entry point and controller for the calendar system.
 * Fixed:
 *   - Loading spinner (uses inline style, not class toggle)
 *   - Create request opens choice modal instead of navigating
 *   - Add-assignment form wired for calendar context
 *   - Add-session form wired for calendar context
 *   - Overflow modal initialised
 */

import { calendarState }           from "./calendar_state.js";
import { loadEvents }              from "./calendar_service.js";
import { render }                  from "./render/calendarRenderer.js";
import { initNavigationListeners } from "./interaction/navigation.js";
import { initEventDetailsModal }   from "./modals/calendar_event_details.js";
import { init, init as initMiniPicker }  from "./components/miniMonthPicker.js";
import { initOverflowModal }       from "./modals/calendar_overflow_modal.js";
import { initModalEvents } from "../core/modalManager.js";
import { initEditAssignmentModal } from "../assignments/modals/edit_assignment_init.js";
import { initAddAssignmentSubmit } from "../assignments/modals/add_assignment_submit.js";
import { initEditAssignmentSubmit } from "../assignments/modals/assignment_editor_submit.js";
import { initEditAssignmentGradedToggle } from "../assignments/modals/assignment_editor.js";
// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initModalEvents();
  initNavigationListeners();
  initEventDetailsModal();
  initMiniPicker();
  initOverflowModal();

  _initFilterPanel();
  _initCreateChoiceModal();
  _initAddAssignmentForm();
  _initAddSessionForm();

  // State subscriptions
  calendarState.subscribe("viewChanged",    _onStateChange);
  calendarState.subscribe("dateChanged",    _onStateChange);
  calendarState.subscribe("filtersChanged", () => render());

  // FIX: use inline style so CSS specificity can't fight us
  calendarState.subscribe("loadingChanged", ({ loading }) => {
    const loader = document.getElementById("calendar-loading");
    if (loader) loader.style.display = loading ? "flex" : "none";
  });
  _closeModal("editAssignmentModal");
  _closeModal("addAssignmentModal");

  // ESC closes any open calendar modal
  document.addEventListener("keydown", e => {
    console.log("Keydown:", e.key)
    if (e.key !== "Escape") return;
    ["calendarEventDetailsModal", "calendarConfirmChangeModal",
     "calendarCreateChoiceModal", "calendarAddSessionModal",
     "calendarEditSessionModal",  "calendarEventsOverflowModal", 
     "addAssignmentModal", "editAssignmentModal"]
      .forEach(_closeModal);
    document.getElementById("calendar-filter-panel")?.classList.add("hidden");
  });

  // Click on empty slot / day cell
  document.addEventListener("calendar:createRequest", ({ detail }) => {
    _handleCreateRequest(detail.date, detail.time);
  });

  // Re-fetch after any entity changes
  document.addEventListener("assignment:changed",  _onEntityChanged);
  document.addEventListener("assignment:updated",  _onEntityChanged);
  document.addEventListener("session:updated",     _onEntityChanged);
  document.addEventListener("session:created",     _onEntityChanged);

  // Initial render then load
  render();
  _onStateChange();
});

// ─────────────────────────────────────────────────────────────
// STATE CHANGE
// ─────────────────────────────────────────────────────────────

async function _onStateChange() {
  await loadEvents();
  render();
}

async function _onEntityChanged() {
  await loadEvents();
  render();
}

// ─────────────────────────────────────────────────────────────
// FILTER PANEL
// ─────────────────────────────────────────────────────────────

function _initFilterPanel() {
  const toggleBtn = document.getElementById("btn-filter-toggle");
  const panel     = document.getElementById("calendar-filter-panel");
  if (!toggleBtn || !panel) return;

  toggleBtn.addEventListener("click", () => {
    const isOpen = !panel.classList.contains("hidden");
    panel.classList.toggle("hidden", isOpen);
    toggleBtn.setAttribute("aria-expanded", String(!isOpen));
  });

  document.getElementById("btn-filter-apply")?.addEventListener("click", () => {
    calendarState.setFilters(_readFilterState());
    panel.classList.add("hidden");
  });

  document.getElementById("btn-filter-reset")?.addEventListener("click", () => {
    document.querySelectorAll("#calendar-filter-panel input[type='checkbox']")
      .forEach(cb => { cb.checked = true; });
    calendarState.setFilters(null);
    panel.classList.add("hidden");
  });
}

function _readFilterState() {
  const get = id => document.getElementById(id);
  return {
    showAssignments:     get("filter-show-assignments")?.checked ?? true,
    showSessions:        get("filter-show-sessions")?.checked    ?? true,
    showClasses:         get("filter-show-classes")?.checked     ?? true,
    assignmentLifecycle: _checkedValues("filter-assignment-lifecycle") || null,
    sessionStates:       _checkedValues("filter-session-state")       || null,
    assignmentTypes:     _checkedValues("filter-assignment-type")      || null,
  };
}

function _checkedValues(name) {
  const vals = [...document.querySelectorAll(`input[name="${name}"]:checked`)]
    .map(cb => cb.value);
  return vals.length ? vals : null;
}

// ─────────────────────────────────────────────────────────────
// CREATE CHOICE MODAL
// ─────────────────────────────────────────────────────────────

/**
 * Open the "Create" choice modal with the clicked date/time pre-stored.
 * The actual assignment / session modal opens when the user picks one.
 */
function _handleCreateRequest(dateStr, time) {
  const modal = document.getElementById("calendarCreateChoiceModal");
  if (!modal) return;

  // Store context so button handlers can use it
  modal.dataset.prefillDate = dateStr || "";
  modal.dataset.prefillTime = time    || "";

  // Show the chosen date in the modal header
  _setText("cal-create-choice-date", dateStr || "");

  // Disable "Add Session" if a session is already active
  const hasActive  = !!document.getElementById("active-session-bar");
  const sessionBtn = document.getElementById("btn-create-session");
  if (sessionBtn) {
    sessionBtn.disabled = hasActive;
    sessionBtn.title    = hasActive ? "Cannot add a session while one is active" : "";
  }

  modal.classList.remove("hidden");
  modal.classList.add("visible", "modal-top");
}

function _initCreateChoiceModal() {
  const modal = document.getElementById("calendarCreateChoiceModal");
  if (!modal) return;

  // Close on overlay click or close button
  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.closest("[data-close-modal]")) {
      _closeModal("calendarCreateChoiceModal");
    }
  });

  // "Add Assignment" button
  document.getElementById("btn-create-assignment")?.addEventListener("click", () => {
    _closeModal("calendarCreateChoiceModal");
    _openAddAssignmentPrefilled(modal.dataset.prefillDate, modal.dataset.prefillTime);
  });

  // "Add Study Session" button
  document.getElementById("btn-create-session")?.addEventListener("click", () => {
    _closeModal("calendarCreateChoiceModal");
    _openAddSessionPrefilled(modal.dataset.prefillDate, modal.dataset.prefillTime);
  });
}

// ─────────────────────────────────────────────────────────────
// ADD ASSIGNMENT  (open existing global modal, pre-fill due date)
// ─────────────────────────────────────────────────────────────

function _openAddAssignmentPrefilled(dateStr, time) {
  // Pre-fill due_at input if we have a date
  const dueAtInput = document.getElementById("due_at");
  if (dueAtInput && dateStr) {
    // datetime-local format: YYYY-MM-DDTHH:MM
    const timeStr = time || "23:59";
    // Ensure HH:MM format
    const safeTime = timeStr.length === 5 ? timeStr : timeStr.substring(0, 5);
    dueAtInput.value = `${dateStr}T${safeTime}`;
  }

  const modal = document.getElementById("addAssignmentModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("visible", "modal-top");
  }
}

// Wire the add-assignment form for calendar context
// (add_assignment_submit.js is not loaded on this page)
function _initAddAssignmentForm() {
  const form = document.querySelector('form[action="/assignment"]');
  if (!form || form.dataset.calendarInit) return;
  form.dataset.calendarInit = "1";

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";
      const resp      = await fetch("/assignment", {
        method:  "POST",
        headers: { Accept: "application/json", "X-CSRFToken": csrfToken },
        body:    new FormData(form),
      });
      if (!resp.ok) throw new Error("Failed to create assignment");

      form.reset();
      _closeModal("addAssignmentModal");
      document.dispatchEvent(new CustomEvent("assignment:changed"));
    } catch (err) {
      console.error(err);
      alert("Failed to create assignment. Please try again.");
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// ADD SESSION
// ─────────────────────────────────────────────────────────────

function _openAddSessionPrefilled(dateStr, time) {
  // Pre-fill scheduled start
  const schedStart = document.getElementById("cal-add-session-sched-start");
  if (schedStart && dateStr) {
    const safeTime = (time || "09:00").substring(0, 5);
    schedStart.value = `${dateStr}T${safeTime}`;
  }

  // Populate class dropdown from /classes/json if empty
  const classSelect = document.getElementById("cal-add-session-class");
  if (classSelect && classSelect.options.length === 0) {
    fetch("/classes/json")
      .then(r => r.json())
      .then(classes => {
        classes.forEach(c => {
          const opt = document.createElement("option");
          opt.value       = c.class_id;
          opt.textContent = c.class_name;
          classSelect.appendChild(opt);
        });
        _refreshSessionAssignments(classSelect.value);
      })
      .catch(() => {});
  } else {
    _refreshSessionAssignments(classSelect?.value);
  }

  const modal = document.getElementById("calendarAddSessionModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("visible", "modal-top");
  }
}

function _initAddSessionForm() {
  const form = document.getElementById("calendarAddSessionForm");
  if (!form || form.dataset.calendarInit) return;
  form.dataset.calendarInit = "1";

  // Refresh assignments when class changes
  const classSelect = document.getElementById("cal-add-session-class");
  classSelect?.addEventListener("change", () => _refreshSessionAssignments(classSelect.value));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";
      const resp = await fetch("/study/new", {
        method: "POST",
        headers: { "X-CSRFToken": csrfToken },
        body:   new FormData(form),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || "Failed");

      form.reset();
      _closeModal("calendarAddSessionModal");
      document.dispatchEvent(new CustomEvent("session:created"));
    } catch (err) {
      console.error(err);
      alert("Failed to create study session. " + (err.message || ""));
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Close on overlay click
  const modal = document.getElementById("calendarAddSessionModal");
  modal?.addEventListener("click", e => {
    if (e.target === modal || e.target.closest("[data-close-modal]")) {
      _closeModal("calendarAddSessionModal");
    }
  });
}

async function _refreshSessionAssignments(classId) {
  const assignSelect = document.getElementById("cal-add-session-assignment");
  if (!assignSelect) return;

  assignSelect.innerHTML = '<option value="">None</option>';
  if (!classId) return;

  try {
    const resp = await fetch("/assignments/json");
    if (!resp.ok) return;
    const assignments = await resp.json();
    assignments
      .filter(a => String(a.class_id) === String(classId))
      .forEach(a => {
        const opt = document.createElement("option");
        opt.value       = a.assignment_id;
        opt.textContent = a.title;
        assignSelect.appendChild(opt);
      });
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function _closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.remove("visible", "modal-top");
  modal.classList.add("hidden");
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}