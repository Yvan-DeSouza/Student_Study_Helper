/**
 * static/js/calendar/render/headerRenderer.js
 *
 * Renders the toolbar: updates the date label and active view button state.
 * Click listeners for buttons are attached by interaction/navigation.js — not here.
 * This file only RENDERS, it does not handle events.
 */

import { calendarState }                             from "../calendar_state.js";
import { formatMonthLabel, formatWeekLabel, formatDayLabel } from "../logic/dateMath.js";

export function renderHeader() {
  _updateDateLabel();
  _updateViewButtons();
}

function _updateDateLabel() {
  const label = document.getElementById("calendar-date-label");
  if (!label) return;

  const date = calendarState.getSelectedDate();
  const view = calendarState.getView();

  label.textContent = _getLabel(date, view);
}

function _getLabel(date, view) {
  switch (view) {
    case "month": return formatMonthLabel(date);
    case "week":  return formatWeekLabel(date);
    case "day":   return formatDayLabel(date);
    case "year":  return String(date.getFullYear());
    default:      return formatMonthLabel(date);
  }
}

function _updateViewButtons() {
  const view = calendarState.getView();
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}