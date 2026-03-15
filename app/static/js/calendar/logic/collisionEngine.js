/**
 * static/js/calendar/logic/collisionEngine.js
 *
 * Detects scheduling conflicts between events.
 * Used informally before saving a drag move — shows a warning if
 * the proposed time would overlap another study session.
 *
 * This is INFORMATIONAL only. It does not block the save.
 */

/**
 * Return all events that would overlap with the proposed time range.
 *
 * Only study_session events are checked (assignment due dates are
 * point-in-time and don't "collide" in the scheduling sense).
 *
 * @param {string}          eventId       The event being moved (excluded from results)
 * @param {string}          proposedStart UTC ISO datetime
 * @param {string|null}     proposedEnd   UTC ISO datetime (null = treat as 60-min block)
 * @param {CalendarEvent[]} allEvents     The currently loaded events from state
 * @returns {CalendarEvent[]}             Events that would conflict
 */
export function findConflicts(eventId, proposedStart, proposedEnd, allEvents) {
  if (!proposedStart || !allEvents?.length) return [];

  const pStart = new Date(proposedStart);
  const pEnd   = proposedEnd
    ? new Date(proposedEnd)
    : new Date(pStart.getTime() + 60 * 60_000); // default 60-min block

  return allEvents.filter(event => {
    // Skip the event being moved
    if (event.id === eventId) return false;

    // Only check study session blocks (not point-in-time events)
    if (event.entity_type !== "study_session") return false;
    if (!event.start) return false;

    const eStart = new Date(event.start);
    const eEnd   = event.end
      ? new Date(event.end)
      : new Date(eStart.getTime() + 60 * 60_000);

    // Two intervals overlap if: A.start < B.end AND A.end > B.start
    return pStart < eEnd && pEnd > eStart;
  });
}