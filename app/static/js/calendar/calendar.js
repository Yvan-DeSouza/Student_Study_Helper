/**
 * static/js/calendar/calendar.js
 *
 * The entry point and controller for the entire calendar system.
 * This is the ONLY file loaded via <script type="module"> in calendar.html.
 *
 * What it does:
 *   1. Reads timezone / created_at from DOM (via domain/time.js)
 *   2. Attaches navigation listeners
 *   3. Subscribes to state events for re-rendering
 *   4. Triggers the initial data load
 *
 * What it must NEVER do:
 *   - Make HTTP requests directly (that's calendar_api.js)
 *   - Manipulate the DOM directly (that's the render layer)
 *   - Store state (that's calendar_state.js)
 */

import { calendarState }          from "./calendar_state.js";
import { loadEvents }             from "./calendar_service.js";
import { render }                 from "./render/calendarRenderer.js";
import { initNavigationListeners } from "./interaction/navigation.js";
import { initEventDetailsModal }  from "./modals/calendar_event_details.js";

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // 1. Wire navigation button click → state change
  initNavigationListeners();

  // 2. Wire event details modal close buttons
  initEventDetailsModal();

  // 3. Subscribe: when view changes → reload + re-render
  calendarState.subscribe("viewChanged", _onStateChange);

  // 4. Subscribe: when selected date changes → reload + re-render
  calendarState.subscribe("dateChanged", _onStateChange);

  // 5. Subscribe: show/hide loading spinner
  calendarState.subscribe("loadingChanged", ({ loading }) => {
    const loader = document.getElementById("calendar-loading");
    if (loader) loader.style.display = loading ? "flex" : "none";
  });

  // 6. ESC closes the event details modal
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const modal = document.getElementById("calendarEventDetailsModal");
    if (modal && !modal.classList.contains("hidden")) {
      modal.classList.remove("visible", "modal-top");
      modal.classList.add("hidden");
      calendarState.setSelectedEventId(null);
    }
  });

  // 7. Initial render (empty grid while data loads)
  render();

  // 8. Initial data load → will call render() again once events arrive
  _onStateChange();
});

// ─────────────────────────────────────────────────────────────
// STATE CHANGE HANDLER
// Called when view or date changes.
// Fetches new events and re-renders.
// ─────────────────────────────────────────────────────────────

async function _onStateChange() {
  await loadEvents();
  render();
}