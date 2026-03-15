/**
 * static/js/calendar/components/miniMonthPicker.js
 *
 * Phase 7: Mini Month Picker.
 *
 * A small, standalone month grid displayed in the calendar sidebar.
 * Lets users jump to any date without switching calendar views.
 *
 * Architecture invariant:
 *   This component has NO independent date state for "the selected day".
 *   The only authoritative selected day is calendar_state.selectedDate.
 *   The component has ONE piece of local state: miniVisibleMonth (which
 *   month to currently show in the mini grid), so users can browse months
 *   in the mini picker without moving the main calendar.
 *
 * Data flow:
 *   User clicks day → navigation.navigateToDate(date)
 *                   → calendarState.setSelectedDate(date)
 *                   → "dateChanged" event → syncWithSelectedDate()
 *
 * The mini picker NEVER fetches events.
 */

import { calendarState }      from "../calendar_state.js";
import { navigateToDate }     from "../interaction/navigation.js";
import {
  getMonthGridDays,
  toDateString,
  isBeforeAccountCreation,
  formatMonthLabel,
} from "../logic/dateMath.js";

// ─────────────────────────────────────────────────────────────
// MODULE-LEVEL LOCAL STATE
// ─────────────────────────────────────────────────────────────

// The month currently displayed in the mini picker.
// Initialised to the selectedDate's month in init().
let _miniVisibleMonth = new Date(); // local Date, first of month

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Initialize the mini month picker.
 * Call once from calendar.js on DOMContentLoaded.
 */
export function init() {
  const container = document.getElementById("mini-month-container");
  if (!container) return;

  // Sync local month to selected date
  const selected = calendarState.getSelectedDate();
  _miniVisibleMonth = _firstOfMonth(selected);

  // Subscribe to main calendar state changes
  calendarState.subscribe("dateChanged", ({ date }) => syncWithSelectedDate(date));
  calendarState.subscribe("viewChanged",  ()          => render()); // re-render to keep dots

  // Initial render
  render();
}

/**
 * Sync the mini picker when the main calendar's selectedDate changes.
 * If the new date is outside the currently visible mini month, advance the mini month.
 *
 * @param {Date} newDate
 */
export function syncWithSelectedDate(newDate) {
  const selectedMonth = _firstOfMonth(newDate);
  const visibleMonth  = _firstOfMonth(_miniVisibleMonth);

  // If selectedDate moved outside the visible mini month → follow it
  if (selectedMonth.getTime() !== visibleMonth.getTime()) {
    _miniVisibleMonth = selectedMonth;
  }

  render();
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION (mini picker only — never touches calendarState)
// ─────────────────────────────────────────────────────────────

function goToPrevMonth() {
  const d = new Date(_miniVisibleMonth);
  d.setMonth(d.getMonth() - 1);
  _miniVisibleMonth = _firstOfMonth(d);
  render();
}

function goToNextMonth() {
  const d = new Date(_miniVisibleMonth);
  d.setMonth(d.getMonth() + 1);
  _miniVisibleMonth = _firstOfMonth(d);
  render();
}

// ─────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────

/**
 * Full re-render of the mini picker into #mini-month-container.
 * Called on init, mini navigation, and main calendar state changes.
 */
export function render() {
  const container = document.getElementById("mini-month-container");
  if (!container) return;

  container.innerHTML = "";
  container.appendChild(_buildPicker());
}

function _buildPicker() {
  const wrapper = document.createElement("div");
  wrapper.className = "mini-picker";

  wrapper.appendChild(_buildHeader());
  wrapper.appendChild(_buildDayHeaders());
  wrapper.appendChild(_buildGrid());

  return wrapper;
}

// ── Header: [ < ]  March 2026  [ > ] ──────────────────────

function _buildHeader() {
  const header = document.createElement("div");
  header.className = "mini-picker-header";

  const prevBtn = document.createElement("button");
  prevBtn.className   = "mini-picker-nav";
  prevBtn.type        = "button";
  prevBtn.textContent = "‹";
  prevBtn.setAttribute("aria-label", "Previous month");
  prevBtn.addEventListener("click", goToPrevMonth);

  const label = document.createElement("span");
  label.className  = "mini-picker-month-label";
  label.textContent = formatMonthLabel(_miniVisibleMonth);

  const nextBtn = document.createElement("button");
  nextBtn.className   = "mini-picker-nav";
  nextBtn.type        = "button";
  nextBtn.textContent = "›";
  nextBtn.setAttribute("aria-label", "Next month");
  nextBtn.addEventListener("click", goToNextMonth);

  header.appendChild(prevBtn);
  header.appendChild(label);
  header.appendChild(nextBtn);
  return header;
}

// ── Day-of-week headers: Mo Tu We Th Fr Sa Su ──────────────

function _buildDayHeaders() {
  const row    = document.createElement("div");
  row.className = "mini-picker-day-headers";
  ["Mo","Tu","We","Th","Fr","Sa","Su"].forEach(d => {
    const cell = document.createElement("span");
    cell.className  = "mini-picker-dow";
    cell.textContent = d;
    row.appendChild(cell);
  });
  return row;
}

// ── Day grid ────────────────────────────────────────────────

function _buildGrid() {
  const grid          = document.createElement("div");
  grid.className      = "mini-picker-grid";

  const days         = getMonthGridDays(_miniVisibleMonth);
  const currentMonth = _miniVisibleMonth.getMonth();
  const todayStr     = toDateString(new Date());
  const selectedStr  = toDateString(calendarState.getSelectedDate());

  days.forEach(day => {
    const dateStr   = toDateString(day);
    const isOther   = day.getMonth() !== currentMonth;
    const isToday   = dateStr === todayStr;
    const isSel     = dateStr === selectedStr;
    const isDisabled = isBeforeAccountCreation(day);

    const cell = document.createElement("button");
    cell.type        = "button";
    cell.className   = "mini-picker-day";
    cell.textContent = day.getDate();
    cell.dataset.date = dateStr;
    cell.setAttribute("aria-label", dateStr);

    if (isOther)    cell.classList.add("other-month");
    if (isToday)    cell.classList.add("today");
    if (isSel)      cell.classList.add("selected");
    if (isDisabled) { cell.classList.add("disabled"); cell.disabled = true; }

    if (!isDisabled) {
      cell.addEventListener("click", () => _handleDayClick(day));
    }

    grid.appendChild(cell);
  });

  return grid;
}

// ─────────────────────────────────────────────────────────────
// CLICK HANDLER
// ─────────────────────────────────────────────────────────────

function _handleDayClick(date) {
  // The only action: update the main calendar's selectedDate.
  // Everything else follows automatically from state subscriptions.
  navigateToDate(date);
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function _firstOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}