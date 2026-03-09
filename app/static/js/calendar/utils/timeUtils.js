/**
 * static/js/calendar/utils/timeUtils.js
 *
 * Frontend time utilities for display purposes.
 * All functions are timezone-aware: they always accept a UTC ISO string
 * and convert to the user's local timezone for display.
 *
 * Nothing in the calendar renders a time without going through these helpers.
 * This mirrors time_service.py's role on the backend.
 */

/**
 * Format a UTC ISO string as a local time string.
 * e.g. "2026-01-22T16:59:00Z" + "America/New_York" → "11:59 AM"
 */
export function formatTime(isoString, timezone) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

/**
 * Format a UTC ISO string as a full local date.
 * e.g. "January 22, 2026"
 */
export function formatDate(isoString, timezone) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });
}

/**
 * Format as "Jan 22" (short, no year)
 */
export function formatShortDate(isoString, timezone) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
}

/**
 * Format a full date + time together.
 * e.g. "January 22, 2026 at 11:59 AM"
 */
export function formatDateTime(isoString, timezone) {
  if (!isoString) return "";
  return `${formatDate(isoString, timezone)} at ${formatTime(isoString, timezone)}`;
}

/**
 * Format a start–end range on the same day.
 * e.g. "January 22, 2026, 2:00 PM – 3:30 PM"
 */
export function formatDateRange(startIso, endIso, timezone) {
  if (!startIso) return "";
  const dateStr = formatDate(startIso, timezone);
  const startTime = formatTime(startIso, timezone);
  if (!endIso) return `${dateStr}, ${startTime}`;
  const endTime = formatTime(endIso, timezone);
  return `${dateStr}, ${startTime} – ${endTime}`;
}

/**
 * Return minutes elapsed since local midnight.
 * Used by pixelUtils to position events on the time grid (Phase 3).
 *
 * e.g. 2:30 PM → 870 minutes
 */
export function minutesFromMidnight(isoString, timezone) {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: timezone,
  }).formatToParts(date);

  const hours   = parseInt(parts.find(p => p.type === "hour")?.value   || "0", 10);
  const minutes = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
  return hours * 60 + minutes;
}

/**
 * Return "YYYY-MM-DD" in the user's LOCAL timezone.
 *
 * CRITICAL: Not UTC date. A UTC timestamp of "2026-01-23T02:00:00Z" for a
 * UTC-5 user is still January 22nd locally. This must use the user's timezone.
 */
export function getLocalDateString(isoString, timezone) {
  const date = new Date(isoString);
  // en-CA locale formats as YYYY-MM-DD naturally
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  });
}

/**
 * Round minutes to the nearest interval (e.g. 15-minute grid snapping).
 * Used by dragDrop.js in Phase 6.
 */
export function roundToNearestInterval(minutes, interval = 15) {
  return Math.round(minutes / interval) * interval;
}