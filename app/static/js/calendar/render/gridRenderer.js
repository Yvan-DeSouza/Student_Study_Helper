/**
 * static/js/calendar/render/gridRenderer.js
 *
 * Builds the DOM skeleton of the calendar — empty cells, headers, day labels.
 * Does NOT place events (that's eventRenderer.js).
 *
 * MVP: Month view only.
 * Phase 3: Add week, day, and year view rendering below the month section.
 */

import { calendarState }                                    from "../calendar_state.js";
import { getMonthGridDays, toDateString, isBeforeAccountCreation } from "../logic/dateMath.js";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Clear the container and render the grid skeleton for the current view.
 * @param {HTMLElement} container  the #calendar-body element
 */
export function renderGrid(container) {
  container.innerHTML = "";

  const view = calendarState.getView();

  switch (view) {
    case "month":
      _renderMonthGrid(container);
      break;
    // Phase 3: uncomment and implement
    // case "week": _renderWeekGrid(container); break;
    // case "day":  _renderDayGrid(container);  break;
    // case "year": _renderYearGrid(container); break;
    default:
      _renderMonthGrid(container);
  }
}

// ─────────────────────────────────────────────────────────────
// MONTH GRID
// ─────────────────────────────────────────────────────────────

function _renderMonthGrid(container) {
  const selectedDate = calendarState.getSelectedDate();
  const currentMonth = selectedDate.getMonth();
  const today        = toDateString(new Date());
  const selectedStr  = toDateString(selectedDate);

  const wrapper = document.createElement("div");
  wrapper.className = "cal-month-wrapper";

  // ── Day-of-week header row ─────────────────────────────────
  const headerRow = document.createElement("div");
  headerRow.className = "cal-day-headers";
  DAY_HEADERS.forEach(name => {
    const cell = document.createElement("div");
    cell.className = "cal-day-header-cell";
    cell.textContent = name;
    headerRow.appendChild(cell);
  });
  wrapper.appendChild(headerRow);

  // ── Day cells grid ─────────────────────────────────────────
  const grid = document.createElement("div");
  grid.className = "cal-month-cells";

  const days = getMonthGridDays(selectedDate);

  days.forEach(day => {
    const dateStr = toDateString(day);
    const isCurrentMonth = day.getMonth() === currentMonth;
    const isToday        = dateStr === today;
    const isSelected     = dateStr === selectedStr;
    const isDisabled     = isBeforeAccountCreation(day);

    const cell = document.createElement("div");
    cell.className = "cal-day-cell";
    cell.dataset.date = dateStr;

    if (!isCurrentMonth) cell.classList.add("other-month");
    if (isToday)         cell.classList.add("today");
    if (isSelected)      cell.classList.add("selected");
    if (isDisabled)      { cell.classList.add("disabled"); cell.dataset.disabled = "true"; }

    // Date number
    const num = document.createElement("span");
    num.className = "cal-date-number";
    num.textContent = day.getDate();
    cell.appendChild(num);

    // Events container — filled by eventRenderer
    const eventsSlot = document.createElement("div");
    eventsSlot.className = "cal-day-events";
    cell.appendChild(eventsSlot);

    grid.appendChild(cell);
  });

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}


// ─────────────────────────────────────────────────────────────
// PHASE 3 SCAFFOLDS — not implemented yet
// ─────────────────────────────────────────────────────────────

// function _renderWeekGrid(container) { ... }
// function _renderDayGrid(container)  { ... }
// function _renderYearGrid(container) { ... }