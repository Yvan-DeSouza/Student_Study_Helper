/**
 * static/js/calendar/utils/calendarHelpers.js
 *
 * Small, stateless utility functions used across calendar modules.
 */

/**
 * Generate a safe DOM ID string from a CalendarEvent ID.
 * e.g. "assignment_42_due" → "cal-event-assignment-42-due"
 */
export function generateEventDomId(eventId) {
  return `cal-event-${eventId.replace(/_/g, "-")}`;
}

/**
 * Parse a CalendarEvent ID string back into its components.
 * Format: {entity_type}_{source_id}_{lifecycle_type}
 *
 * Handles the study_session prefix which contains an underscore:
 *   "study_session_7_scheduled" → { entity_type: "study_session", source_id: 7, ... }
 */
export function parseEventId(eventId) {
  if (!eventId) return null;

  const parts = eventId.split("_");
  if (parts.length < 3) return null;

  // study_session has underscore in entity type
  if (parts[0] === "study" && parts[1] === "session") {
    return {
      entity_type:    "study_session",
      source_id:      parseInt(parts[2], 10),
      lifecycle_type: parts[3],
    };
  }

  return {
    entity_type:    parts[0],
    source_id:      parseInt(parts[1], 10),
    lifecycle_type: parts[2],
  };
}

/**
 * Return true if the event's start falls within the given range.
 *
 * @param {Object} event     CalendarEvent object
 * @param {string} rangeStart ISO date string "YYYY-MM-DD"
 * @param {string} rangeEnd   ISO date string "YYYY-MM-DD"
 */
export function isEventInRange(event, rangeStart, rangeEnd) {
  if (!event?.start) return false;
  // Compare ISO strings directly (lexicographic comparison works for ISO dates)
  return event.start >= rangeStart && event.start <= rangeEnd + "T23:59:59Z";
}

/**
 * Get the CSS class suffix for an event type chip.
 * Used to apply type-specific styles.
 */
export function getEventTypeClass(eventType) {
  const classMap = {
    assignment_due:       "type-due",
    assignment_created:   "type-created",
    assignment_finished:  "type-finished",
    session_scheduled:    "type-scheduled",
    session_active:       "type-active",
    session_completed:    "type-completed",
    session_cancelled:    "type-cancelled",
    class_created:        "type-class-created",
    class_finished:       "type-class-finished",
  };
  return classMap[eventType] || "type-other";
}