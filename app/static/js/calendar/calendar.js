/**
 * static/js/calendar/calendar.js
 *
 * Entry point and controller for the calendar system.
 *
 * Changes:
 *   - All modal open/close uses modalManager.showModal / closeModal
 *   - All calendar reloads use refreshBus.emitRefresh("calendar:reload")
 *   - Filter "Apply" persists preferences via POST /api/calendar/filters/save
 */

import { calendarState }                         from "./calendar_state.js";
import { loadEvents }                            from "./calendar_service.js";
import { render }                                from "./render/calendarRenderer.js";
import { initNavigationListeners }               from "./interaction/navigation.js";
import { initEventDetailsModal }                 from "./modals/calendar_event_details.js";
import { init as initMiniPicker }                from "./components/miniMonthPicker.js";
import { initOverflowModal }                     from "./modals/calendar_overflow_modal.js";
import { showModal, closeModal, initModalEvents } from "../core/modalManager.js";
import { registerRefresh, emitRefresh }          from "../core/refreshBus.js";
import { saveFilters }                           from "./calendar_api.js";

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  // Global modal delegation (data-close-modal, overlay click)
  initModalEvents();

  // Calendar-specific module init
  initNavigationListeners();
  initEventDetailsModal();
  initMiniPicker();
  initOverflowModal();

  // Register the calendar reload function with refreshBus.
  // Any module can now call emitRefresh("calendar:reload") to refresh.
  registerRefresh("calendar:reload", async () => {
    await loadEvents();
    render();
  });

  // Filter panel
  _initFilterPanel();

  // Create-choice flow
  _initCreateChoiceModal();
  _initAddAssignmentForm();
  _initAddSessionForm();

  // ── State subscriptions ────────────────────────────────────

  calendarState.subscribe("viewChanged",    _onStateChange);
  calendarState.subscribe("dateChanged",    _onStateChange);

  // Filters: in-memory re-render (no API call)
  calendarState.subscribe("filtersChanged", () => render());

  // Loading spinner — use inline style (CSS specificity-safe)
  calendarState.subscribe("loadingChanged", ({ loading }) => {
    const el = document.getElementById("calendar-loading");
    if (el) el.style.display = loading ? "flex" : "none";
  });

  // ESC closes any open calendar overlay
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    [
      "calendarEventDetailsModal",
      "calendarConfirmChangeModal",
      "calendarCreateChoiceModal",
      "calendarAddSessionModal",
      "calendarEditSessionModal",
      "calendarEventsOverflowModal",
      "addAssignmentModal",
      "editAssignmentModal",
    ].forEach(id => closeModal(id));
    document.getElementById("calendar-filter-panel")?.classList.add("hidden");
  });

  // Empty cell/slot click → create-choice modal
  document.addEventListener("calendar:createRequest", ({ detail }) => {
    _handleCreateRequest(detail.date, detail.time);
  });

  // Domain entity changes → calendar reload via refreshBus
  document.addEventListener("assignment:changed",  () => emitRefresh("calendar:reload"));
  document.addEventListener("assignment:updated",  () => emitRefresh("calendar:reload"));
  document.addEventListener("session:updated",     () => emitRefresh("calendar:reload"));
  document.addEventListener("session:created",     () => emitRefresh("calendar:reload"));

  // Start hidden
  closeModal("addAssignmentModal");
  closeModal("editAssignmentModal");

  // Initial render + load
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

  document.getElementById("btn-filter-apply")?.addEventListener("click", async () => {
    const filterState = _readFilterState();

    // 1. Apply immediately (client-side, no round-trip)
    calendarState.setFilters(filterState);
    panel.classList.add("hidden");
    toggleBtn.setAttribute("aria-expanded", "false");

    // 2. Persist to backend (fire-and-forget, table wired later)
    try {
      await saveFilters(filterState);
    } catch (err) {
      console.warn("[Calendar] Could not save filter preferences:", err);
    }
  });

  document.getElementById("btn-filter-reset")?.addEventListener("click", () => {
    document.querySelectorAll("#calendar-filter-panel input[type='checkbox']")
      .forEach(cb => { cb.checked = true; });
    calendarState.setFilters(null);
    panel.classList.add("hidden");
    toggleBtn.setAttribute("aria-expanded", "false");
  });
}

function _readFilterState() {
  const get = id => document.getElementById(id);
  return {
    showAssignments:     get("filter-show-assignments")?.checked ?? true,
    showSessions:        get("filter-show-sessions")?.checked    ?? true,
    showClasses:         get("filter-show-classes")?.checked     ?? true,
    assignmentLifecycle: _checkedVals("filter-assignment-lifecycle") || null,
    sessionStates:       _checkedVals("filter-session-state")        || null,
    assignmentTypes:     _checkedVals("filter-assignment-type")       || null,
  };
}

function _checkedVals(name) {
  const vals = [...document.querySelectorAll(`input[name="${name}"]:checked`)]
    .map(cb => cb.value);
  return vals.length ? vals : null;
}

// ─────────────────────────────────────────────────────────────
// CREATE CHOICE MODAL
// ─────────────────────────────────────────────────────────────

function _handleCreateRequest(dateStr, time) {
  const modal = document.getElementById("calendarCreateChoiceModal");
  if (!modal) return;

  modal.dataset.prefillDate = dateStr || "";
  modal.dataset.prefillTime = time    || "";

  if (dateStr) {
    const d   = new Date(dateStr + "T00:00:00");
    const lbl = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    _setText("cal-create-choice-date", lbl);
  } else {
    _setText("cal-create-choice-date", "");
  }

  const sessionBtn = document.getElementById("btn-create-session");
  if (sessionBtn) {
    const hasActive     = !!document.getElementById("active-session-bar");
    sessionBtn.disabled = hasActive;
    sessionBtn.title    = hasActive ? "End your current session first." : "";
  }

  showModal("calendarCreateChoiceModal");
}

function _initCreateChoiceModal() {
  document.getElementById("btn-create-assignment")?.addEventListener("click", () => {
    const modal = document.getElementById("calendarCreateChoiceModal");
    closeModal("calendarCreateChoiceModal");
    _openAddAssignment(modal?.dataset.prefillDate, modal?.dataset.prefillTime);
  });

  document.getElementById("btn-create-session")?.addEventListener("click", () => {
    const modal = document.getElementById("calendarCreateChoiceModal");
    if (document.getElementById("btn-create-session")?.disabled) return;
    closeModal("calendarCreateChoiceModal");
    _openAddSession(modal?.dataset.prefillDate, modal?.dataset.prefillTime);
  });
}

// ─────────────────────────────────────────────────────────────
// ADD ASSIGNMENT
// ─────────────────────────────────────────────────────────────

function _openAddAssignment(dateStr, time) {
  const dueInput = document.getElementById("due_at");
  if (dueInput && dateStr) {
    const t     = (time || "23:59").substring(0, 5);
    dueInput.value = `${dateStr}T${t}`;
  }
  showModal("addAssignmentModal");
}

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
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
      const resp = await fetch("/assignment", {
        method:  "POST",
        headers: { Accept: "application/json", "X-CSRFToken": csrf },
        body:    new FormData(form),
      });
      if (!resp.ok) throw new Error("Failed to create assignment");

      form.reset();
      closeModal("addAssignmentModal");

      // Reload calendar via refreshBus
      await emitRefresh("calendar:reload");
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

function _openAddSession(dateStr, time) {
  const startInput = document.getElementById("cal-add-session-sched-start");
  if (startInput && dateStr) {
    const t = (time || "09:00").substring(0, 5);
    startInput.value = `${dateStr}T${t}`;
  }

  // Populate class dropdown if empty
  const classEl = document.getElementById("cal-add-session-class");
  if (classEl && classEl.options.length === 0) {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
    fetch("/classes/json", { headers: { Accept: "application/json", "X-CSRFToken": csrf } })
      .then(r => r.json())
      .then(classes => {
        classes.forEach(c => classEl.appendChild(new Option(c.class_name, c.class_id)));
        _refreshSessionAssignments(classEl.value);
      })
      .catch(() => {});
  } else {
    _refreshSessionAssignments(classEl?.value);
  }

  showModal("calendarAddSessionModal");
}

function _initAddSessionForm() {
  const form = document.getElementById("calendarAddSessionForm");
  if (!form || form.dataset.calendarInit) return;
  form.dataset.calendarInit = "1";

  document.getElementById("cal-add-session-class")
    ?.addEventListener("change", e => _refreshSessionAssignments(e.target.value));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;

    try {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
      const resp = await fetch("/study/new", {
        method:  "POST",
        headers: { "X-CSRFToken": csrf },
        body:    new FormData(form),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || "Failed");

      form.reset();
      closeModal("calendarAddSessionModal");

      // Reload calendar via refreshBus
      await emitRefresh("calendar:reload");
    } catch (err) {
      const msg = err.message === "ACTIVE_SESSION_EXISTS"
        ? "You already have an active session running."
        : `Failed to schedule session. ${err.message || ""}`;
      alert(msg);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

async function _refreshSessionAssignments(classId) {
  const sel = document.getElementById("cal-add-session-assignment");
  if (!sel) return;
  sel.innerHTML = '<option value="">None</option>';
  if (!classId) return;

  try {
    const r = await fetch("/assignments/json");
    if (!r.ok) return;
    const list = await r.json();
    list
      .filter(a => String(a.class_id) === String(classId))
      .forEach(a => sel.appendChild(new Option(a.title, a.assignment_id)));
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}