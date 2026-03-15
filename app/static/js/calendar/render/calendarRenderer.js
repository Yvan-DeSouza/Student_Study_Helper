/**
 * static/js/calendar/render/calendarRenderer.js
 *
 * Top-level render coordinator.
 * Sequence: header → grid → events → selection → drag listeners
 */

import { renderHeader }    from "./headerRenderer.js";
import { renderGrid }      from "./gridRenderer.js";
import { renderEvents }    from "./eventRenderer.js";
import { renderSelection } from "./selectionRenderer.js";

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

  renderHeader();          // update toolbar label + active view button
  renderGrid(container);   // rebuild empty grid skeleton
  renderEvents();          // place event chips on the grid
  renderSelection();       // highlight selected date

  // Wire drag listeners after DOM is built (Phase 6)
  _initDragAfterRender();

  // Wire selection (click-to-create) listeners (Phase 4)
  _initSelectionAfterRender();
}

// Lazy imports avoid circular deps and keep Phase 4/6 optional.

async function _initDragAfterRender() {
  try {
    const { initDragListeners } = await import("../interaction/dragDrop.js");
    initDragListeners();
  } catch (_) { /* drag module not available */ }
}

async function _initSelectionAfterRender() {
  try {
    const { initSelectionListeners } = await import("../interaction/selection.js");
    initSelectionListeners();
  } catch (_) { /* selection module not available */ }
}