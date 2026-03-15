/**
 * static/js/calendar/render/selectionRenderer.js
 *
 * Purely visual. Applies CSS classes to reflect the selected date/range
 * across all four views. Must be called AFTER gridRenderer has built the DOM.
 *
 * Month view:  highlights the selected day cell.
 * Week view:   highlights the column for the selected day.
 * Day view:    highlights today marker (the single column is always selected).
 * Year view:   highlights the selected day cell in the mini-month.
 */

import { calendarState }   from "../calendar_state.js";
import { toDateString }    from "../logic/dateMath.js";

/**
 * Apply selection highlights to the current grid.
 * Safe to call after every render.
 */
export function renderSelection() {
  const view         = calendarState.getView();
  const selectedDate = calendarState.getSelectedDate();
  const selectedStr  = toDateString(selectedDate);

  switch (view) {
    case "month":
      _highlightMonthCell(selectedStr);
      break;
    case "week":
    case "day":
      _highlightWeekColumn(selectedStr);
      break;
    case "year":
      _highlightYearCell(selectedStr);
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// PRIVATE
// ─────────────────────────────────────────────────────────────

function _highlightMonthCell(selectedStr) {
  // Remove all previous .selected classes
  document.querySelectorAll(".cal-day-cell.selected").forEach(el => {
    el.classList.remove("selected");
  });
  // Apply to the matching cell
  const cell = document.querySelector(`.cal-day-cell[data-date="${selectedStr}"]`);
  if (cell) cell.classList.add("selected");
}

function _highlightWeekColumn(selectedStr) {
  // Remove all previous .selected-col classes
  document.querySelectorAll(".cal-day-col.selected-col").forEach(el => {
    el.classList.remove("selected-col");
  });
  const col = document.querySelector(`.cal-day-col[data-date="${selectedStr}"]`);
  if (col) col.classList.add("selected-col");
}

function _highlightYearCell(selectedStr) {
  document.querySelectorAll(".cal-year-day.selected").forEach(el => {
    el.classList.remove("selected");
  });
  const cell = document.querySelector(`.cal-year-day[data-date="${selectedStr}"]`);
  if (cell) cell.classList.add("selected");
}