/**
 *
 * Handles clicks on empty time slots (week/day view) and empty day cells (month view).
 * Opens the creation flow with the date/time pre-filled.
 *
 * This module emits the custom event "calendar:createRequest" with { date, time }
 * so the page can open whichever modal makes sense. It never saves anything.
 */

import { calendarState }    from "../calendar_state.js";
import { navigateToDate }   from "./navigation.js";

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Attach click listeners for "click to create" behaviour.
 * Must be called after calendarRenderer renders each view (call it inside
 * calendarRenderer.render() at the end, or after DOM is built).
 */
export function initSelectionListeners() {
  const view = calendarState.getView();

  if (view === "month") {
    _attachMonthSelectionListeners();
  } else if (view === "week" || view === "day") {
    _attachTimeGridSelectionListeners();
  }
  // Year view: clicking a day navigates to that day — handled by gridRenderer.
}

// ─────────────────────────────────────────────────────────────
// MONTH VIEW — click on empty day cell
// ─────────────────────────────────────────────────────────────

function _attachMonthSelectionListeners() {
  document.querySelectorAll(".cal-day-cell").forEach(cell => {
    if (cell.dataset.disabled === "true") return;

    cell.addEventListener("click", e => {
      // Only react to clicks directly on the cell, not on event chips
      if (e.target.closest(".cal-event-chip") || e.target.closest(".cal-event-overflow")) return;

      const dateStr = cell.dataset.date;
      if (!dateStr) return;

      // Update selectedDate so the highlight moves
      navigateToDate(new Date(dateStr + "T00:00:00"));

      // Emit creation request
      _emitCreateRequest(dateStr, null);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// WEEK / DAY VIEW — click on time slot
// ─────────────────────────────────────────────────────────────

function _attachTimeGridSelectionListeners() {
  document.querySelectorAll(".cal-time-slot").forEach(slot => {
    slot.addEventListener("click", e => {
      if (e.target.closest(".cal-event-chip")) return;

      const colEl = slot.closest(".cal-day-col");
      if (!colEl) return;

      const dateStr = colEl.dataset.date;
      const time    = slot.dataset.time || "09:00";
      if (!dateStr) return;

      _emitCreateRequest(dateStr, time);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// EMIT
// ─────────────────────────────────────────────────────────────

/**
 * Dispatch a "calendar:createRequest" custom event on the document.
 * Pages listen for this to open their creation modal with prefilled values.
 *
 * @param {string}      dateStr  "YYYY-MM-DD"
 * @param {string|null} time     "HH:MM" or null
 */
function _emitCreateRequest(dateStr, time) {
  document.dispatchEvent(new CustomEvent("calendar:createRequest", {
    detail: { date: dateStr, time }
  }));
}