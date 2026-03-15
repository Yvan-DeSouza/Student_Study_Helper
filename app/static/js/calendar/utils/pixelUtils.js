/**
 * static/js/calendar/utils/pixelUtils.js
 *
 * Converts between pixel positions and time values for the day/week grid.
 * 1 hour = PIXELS_PER_HOUR px  →  1 minute = 1 px (clean math).
 *
 * Nothing in the calendar may compute time-grid positions without these helpers.
 */

import { minutesFromMidnight } from "./timeUtils.js";

/** 60 px per hour → 1 px per minute. Change here to resize the time grid. */
export const PIXELS_PER_HOUR = 60;

/** Total scrollable height of a 24-hour day column. */
export const TOTAL_DAY_HEIGHT = PIXELS_PER_HOUR * 24; // 1440 px

/** Minimum visible height for a time-based event chip (ensures clickability). */
export const MIN_EVENT_HEIGHT = 24; // px

// ─────────────────────────────────────────────────────────────
// CONVERSIONS
// ─────────────────────────────────────────────────────────────

/**
 * Convert a UTC ISO timestamp to a top-offset in pixels inside the day column.
 *
 * @param {string} isoString  UTC ISO datetime, e.g. "2026-01-22T16:30:00Z"
 * @param {string} timezone   IANA timezone, e.g. "America/New_York"
 * @param {number} pph        pixels per hour (defaults to PIXELS_PER_HOUR)
 * @returns {number} px offset from the top of the time grid
 */
export function timeToPixel(isoString, timezone, pph = PIXELS_PER_HOUR) {
  if (!isoString) return 0;
  const mins = minutesFromMidnight(isoString, timezone);
  return (mins / 60) * pph;
}

/**
 * Convert a pixel offset back to a local ISO datetime string on the given date.
 * Snaps to 15-minute intervals by default.
 *
 * @param {number} pixelOffset  px from top of time grid
 * @param {string} dateStr      "YYYY-MM-DD" in user's local timezone
 * @param {number} pph          pixels per hour
 * @param {number} snapMinutes  snapping interval (default 15)
 * @returns {string} local ISO datetime, e.g. "2026-01-22T14:30:00"
 */
export function pixelToTime(pixelOffset, dateStr, pph = PIXELS_PER_HOUR, snapMinutes = 15) {
  const rawMinutes = (pixelOffset / pph) * 60;
  const snapped    = Math.round(rawMinutes / snapMinutes) * snapMinutes;
  const clamped    = Math.max(0, Math.min(snapped, 24 * 60 - 1));

  const hours = Math.floor(clamped / 60);
  const mins  = clamped % 60;
  const pad   = n => String(n).padStart(2, "0");

  return `${dateStr}T${pad(hours)}:${pad(mins)}:00`;
}

/**
 * Calculate the pixel height for an event spanning start → end.
 * Returns at least MIN_EVENT_HEIGHT so even brief events are clickable.
 *
 * @param {string} startIso  UTC ISO datetime
 * @param {string} endIso    UTC ISO datetime (or null)
 * @param {string} timezone  IANA timezone
 * @param {number} pph       pixels per hour
 * @returns {number} height in px
 */
export function durationToPixels(startIso, endIso, timezone, pph = PIXELS_PER_HOUR) {
  if (!endIso) return MIN_EVENT_HEIGHT;
  const startMins = minutesFromMidnight(startIso, timezone);
  const endMins   = minutesFromMidnight(endIso, timezone);
  const durationMins = Math.max(endMins - startMins, MIN_EVENT_HEIGHT);
  const px = (durationMins / 60) * pph;
  return Math.max(px, MIN_EVENT_HEIGHT);
}

/**
 * Return the pixel offset of "now" within today's column.
 * Used to scroll the week/day grid to the current time.
 *
 * @param {string} timezone  IANA timezone
 * @param {number} pph       pixels per hour
 * @returns {number} px offset
 */
export function nowToPixel(timezone, pph = PIXELS_PER_HOUR) {
  return timeToPixel(new Date().toISOString(), timezone, pph);
}