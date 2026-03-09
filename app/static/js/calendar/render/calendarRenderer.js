/**
 * static/js/calendar/render/calendarRenderer.js
 *
 * Top-level render coordinator. Reads current view from state, clears old
 * content, then delegates in order: header → grid → events.
 *
 * This is the ONLY file that should be called from calendar.js to trigger
 * a full re-render. It orchestrates the sequence so grid is always built
 * before events are placed on it.
 */

import { renderHeader } from "./headerRenderer.js";
import { renderGrid   } from "./gridRenderer.js";
import { renderEvents } from "./eventRenderer.js";

/**
 * Full re-render of the calendar.
 * Safe to call on any state change.
 */
export function render() {
  const container = document.getElementById("calendar-body");
  if (!container) {
    console.warn("[CalendarRenderer] #calendar-body not found");
    return;
  }

  renderHeader();      // update toolbar label + active view button
  renderGrid(container); // rebuild empty grid skeleton
  renderEvents();      // place event chips on the grid
}