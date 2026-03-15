/**
 * static/js/calendar/calendar.js
 *
 * Entry point and controller for the calendar system.
 * Wires all modules together, subscribes to state events.
 *
 * Phases wired here:
 *   Phase 2 — navigation, event details modal, initial load
 *   Phase 4 — selection (click to create)
 *   Phase 5 — filter panel
 *   Phase 6 — drag & drop (via calendarRenderer lazy import)
 *   Phase 7 — mini month picker
 */

import { calendarState }           from "./calendar_state.js";
import { loadEvents }              from "./calendar_service.js";
import { render }                  from "./render/calendarRenderer.js";
import { initNavigationListeners } from "./interaction/navigation.js";
import { initEventDetailsModal }   from "./modals/calendar_event_details.js";
import { init as initMiniPicker }  from "./components/miniMonthPicker.js";

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  // ── Navigation buttons ───────────────────────────────────
  initNavigationListeners();

  // ── Event details modal ──────────────────────────────────
  initEventDetailsModal();

  // ── Mini month picker (Phase 7) ──────────────────────────
  initMiniPicker();

  // ── Filter panel toggle (Phase 5) ───────────────────────
  _initFilterPanel();

  // ── State subscriptions ──────────────────────────────────

  // View or date changed → reload events + re-render
  calendarState.subscribe("viewChanged",   _onStateChange);
  calendarState.subscribe("dateChanged",   _onStateChange);

  // Events loaded (no extra fetch needed) → just re-render
  // (loadEvents already stores events; _onStateChange calls render after loadEvents)

  // Filters changed (Phase 5) → re-render from in-memory events (no API call)
  calendarState.subscribe("filtersChanged", () => render());

  // Loading spinner
  calendarState.subscribe("loadingChanged", ({ loading }) => {
    const loader = document.getElementById("calendar-loading");
    if (loader) loader.classList.toggle("hidden", !loading);
  });

  // ── ESC closes any open calendar modal ───────────────────
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    _closeModal("calendarEventDetailsModal");
    _closeModal("calendarConfirmChangeModal");
    _closeModal("calendar-filter-panel");
  });

  // ── "calendar:createRequest" → open creation flow (Phase 4) ──
  document.addEventListener("calendar:createRequest", ({ detail }) => {
    _handleCreateRequest(detail.date, detail.time);
  });

  // ── Reload events after an edit saves (Phase 4) ──────────
  document.addEventListener("assignment:changed",    _onEntityChanged);
  document.addEventListener("assignment:updated",    _onEntityChanged);
  document.addEventListener("session:updated",       _onEntityChanged);
  document.addEventListener("session:created",       _onEntityChanged);

  // ── Initial render (empty grid while first fetch happens) ─
  render();
  _onStateChange();
});

// ─────────────────────────────────────────────────────────────
// STATE CHANGE HANDLER
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
// FILTER PANEL (Phase 5)
// ─────────────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  showAssignments:     true,
  showSessions:        true,
  showClasses:         true,
  assignmentLifecycle: ["due", "created", "finished"],
  sessionStates:       ["scheduled", "active", "completed", "cancelled"],
  assignmentTypes:     null, // null = all types
};

function _initFilterPanel() {
  const toggleBtn = document.getElementById("btn-filter-toggle");
  const panel     = document.getElementById("calendar-filter-panel");

  if (!toggleBtn || !panel) return;

  toggleBtn.addEventListener("click", () => {
    const isOpen = !panel.classList.contains("hidden");
    panel.classList.toggle("hidden", isOpen);
    toggleBtn.setAttribute("aria-expanded", String(!isOpen));
  });

  // "Apply" button inside the panel
  document.getElementById("btn-filter-apply")?.addEventListener("click", () => {
    const filters = _readFilterState();
    calendarState.setFilters(filters);
    panel.classList.add("hidden");
  });

  // "Reset" button
  document.getElementById("btn-filter-reset")?.addEventListener("click", () => {
    _resetFilterUI();
    calendarState.setFilters(null);
    panel.classList.add("hidden");
  });
}

function _readFilterState() {
  const get = id => document.getElementById(id);

  const showAssignments = get("filter-show-assignments")?.checked ?? true;
  const showSessions    = get("filter-show-sessions")?.checked    ?? true;
  const showClasses     = get("filter-show-classes")?.checked     ?? true;

  const assignmentLifecycle = _getCheckedValues("filter-assignment-lifecycle");
  const sessionStates       = _getCheckedValues("filter-session-state");
  const assignmentTypes     = _getCheckedValues("filter-assignment-type");

  return {
    showAssignments,
    showSessions,
    showClasses,
    assignmentLifecycle: assignmentLifecycle.length ? assignmentLifecycle : null,
    sessionStates:       sessionStates.length       ? sessionStates       : null,
    assignmentTypes:     assignmentTypes.length      ? assignmentTypes     : null,
  };
}

function _getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)]
    .map(cb => cb.value);
}

function _resetFilterUI() {
  // Re-check all checkboxes to defaults
  document.querySelectorAll("#calendar-filter-panel input[type='checkbox']")
    .forEach(cb => { cb.checked = true; });
}

// ─────────────────────────────────────────────────────────────
// CREATE REQUEST (Phase 4)
// ─────────────────────────────────────────────────────────────

function _handleCreateRequest(dateStr, time) {
  // Strategy: navigate to the new_study page with query params.
  // This is the simplest integration with the existing creation flow.
  // Phase 4 enhancement: open an inline modal if one is present on the page.
  const params = new URLSearchParams({ prefill_date: dateStr });
  if (time) params.set("prefill_time", time);
  window.location.href = `/study/new?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function _closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.remove("visible", "modal-top");
  modal.classList.add("hidden");
  calendarState.setSelectedEventId(null);
}