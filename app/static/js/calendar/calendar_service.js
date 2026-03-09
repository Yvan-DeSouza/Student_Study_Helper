/**
 * static/js/calendar/calendar_service.js
 *
 * Frontend business logic. Sits between the controller and the API transport.
 * Handles: range computation, API calls, state updates.
 *
 * What it must NOT do:
 *   - Touch the DOM
 *   - Listen to user interaction events
 *   - Store state locally (that's calendar_state.js)
 */

import { calendarState }  from "./calendar_state.js";
import { fetchEvents }    from "./calendar_api.js";
import { getVisibleRange } from "./logic/dateMath.js";
import { userTimezone }   from "./domain/time.js";

/**
 * Compute the visible range for the current view + date, fetch events
 * from the API, and store them in state.
 *
 * Called by the controller on init and on every view/date change.
 */
export async function loadEvents() {
  const view = calendarState.getView();
  const selectedDate = calendarState.getSelectedDate();

  // Compute which date range to fetch for this view
  const range = getVisibleRange(selectedDate, view);
  calendarState.setVisibleRange(range);

  calendarState.setLoading(true);

  const filters = calendarState.getFilters();
  const result  = await fetchEvents(range.start, range.end, filters);

  calendarState.setLoading(false);

  if (result.success) {
    calendarState.setEvents(result.data);
  } else {
    console.error("[CalendarService] Failed to load events:", result.error);
    calendarState.setEvents([]);
  }
}

// ─────────────────────────────────────────────────────────────
// Phase 6: Optimistic update helpers (uncomment when implementing drag)
// ─────────────────────────────────────────────────────────────

// export async function moveEvent(eventId, newStart, newEnd, timezone) {
//   // 1. Store original event for potential revert
//   const original = calendarState.getEventById(eventId);
//
//   // 2. Optimistic update: update event in state immediately
//   const optimistic = { ...original, start: newStart, end: newEnd };
//   const events = calendarState.getEvents().map(e =>
//     e.id === eventId ? optimistic : e
//   );
//   calendarState.setEvents(events);
//
//   // 3. Call API
//   const { moveEvent: apiMove } = await import("./calendar_api.js");
//   const result = await apiMove(eventId, newStart, newEnd, timezone);
//
//   if (result.success) {
//     // 4a. Confirm: replace optimistic with server-confirmed event
//     const confirmed = calendarState.getEvents().map(e =>
//       e.id === eventId ? result.data : e
//     );
//     calendarState.setEvents(confirmed);
//   } else {
//     // 4b. Revert: restore original event
//     const reverted = calendarState.getEvents().map(e =>
//       e.id === eventId ? original : e
//     );
//     calendarState.setEvents(reverted);
//     throw new Error(result.error);
//   }
// }