/**
 * static/js/calendar/interaction/navigation.js
 *
 * Handles all navigation actions.
 * Connects UI events (clicks on prev/next/today/view buttons)
 * to state changes via calendarState.
 *
 * This file only calls state setters.
 * The controller (calendar.js) subscribes to state events and re-renders.
 * This file never touches the DOM beyond reading button targets.
 */

import { calendarState } from "../calendar_state.js";
import { shiftDate }     from "../logic/dateMath.js";
// ─────────────────────────────────────────────────────────────
// NAVIGATION ACTIONS
// ─────────────────────────────────────────────────────────────

export function navigatePrevious() {
  const date = calendarState.getSelectedDate();
  const view = calendarState.getView();
  calendarState.setSelectedDate(shiftDate(date, "back", view));
  console.log(`[Navigation] Navigated previous from ${date} on view ${view} to ${calendarState.getSelectedDate()}`);
}

export function navigateNext() {
  const date = calendarState.getSelectedDate();
  const view = calendarState.getView();
  calendarState.setSelectedDate(shiftDate(date, "forward", view));
}

export function navigateToToday() {
  calendarState.setSelectedDate(new Date());
}

export function switchView(viewName) {
  calendarState.setView(viewName);
}

/**
 * Jump directly to a specific date (used by year view cell clicks in Phase 3).
 * @param {string|Date} date
 */
export function navigateToDate(date) {
  calendarState.setSelectedDate(new Date(date));
}

// ─────────────────────────────────────────────────────────────
// LISTENER SETUP
// Called once by calendar.js on page initialization.
// ─────────────────────────────────────────────────────────────

export function initNavigationListeners() {
  document.getElementById("btn-prev")?.addEventListener("click", navigatePrevious);
  document.getElementById("btn-next")?.addEventListener("click", navigateNext);
  document.getElementById("btn-today")?.addEventListener("click", navigateToToday);

  // View selector buttons (data-view="month" | "week" | "day" | "year")
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}