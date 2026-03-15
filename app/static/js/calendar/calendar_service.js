/**
 * static/js/calendar/calendar_service.js
 *
 * Frontend business logic layer.
 * Coordinates: range computation → API call → state updates.
 * Phase 6: moveEvent with optimistic update and revert on failure.
 */

import { calendarState }   from "./calendar_state.js";
import { fetchEvents,
         moveEvent as apiMove } from "./calendar_api.js";
import { getVisibleRange } from "./logic/dateMath.js";

// ─────────────────────────────────────────────────────────────
// LOAD EVENTS
// ─────────────────────────────────────────────────────────────

export async function loadEvents() {
  const view         = calendarState.getView();
  const selectedDate = calendarState.getSelectedDate();
  const range        = getVisibleRange(selectedDate, view);

  calendarState.setVisibleRange(range);
  calendarState.setLoading(true);

  const filters = calendarState.getFilters();
  // Pass server-side filters only when non-default (optional optimisation)
  const result  = await fetchEvents(range.start, range.end, null);

  calendarState.setLoading(false);

  if (result.success) {
    calendarState.setEvents(result.data);
  } else {
    console.error("[CalendarService] Failed to load events:", result.error);
    calendarState.setEvents([]);
  }
}

// ─────────────────────────────────────────────────────────────
// MOVE EVENT (Phase 6)
// ─────────────────────────────────────────────────────────────

/**
 * Optimistic update → API call → confirm or revert.
 *
 * @param {string}      eventId       CalendarEvent ID
 * @param {string}      newStart      local ISO datetime "YYYY-MM-DDTHH:MM:SS"
 * @param {string|null} newEnd        local ISO datetime or null
 * @param {string}      timezone      IANA timezone string
 */
export async function moveEvent(eventId, newStart, newEnd, timezone) {
  const original = calendarState.getEventById(eventId);
  if (!original) throw new Error(`Event ${eventId} not found in state`);

  // 1. Optimistic update: move event immediately in state
  const optimistic = { ...original, start: newStart, end: newEnd };
  calendarState.setEvents(
    calendarState.getEvents().map(e => e.id === eventId ? optimistic : e)
  );

  // Trigger re-render of the optimistic position
  const { render } = await import("./render/calendarRenderer.js");
  render();

  // 2. Call API
  const result = await apiMove(eventId, newStart, newEnd, timezone);

  if (result.success && result.data) {
    // 3a. Confirm: replace with server-confirmed event
    calendarState.setEvents(
      calendarState.getEvents().map(e => e.id === eventId ? result.data : e)
    );
  } else {
    // 3b. Revert: restore the original event
    calendarState.setEvents(
      calendarState.getEvents().map(e => e.id === eventId ? original : e)
    );
    render();
    throw new Error(result.error || "Move failed");
  }
}