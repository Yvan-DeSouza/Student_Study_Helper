/**
 *
 * Pure functions for date arithmetic.
 * NO DOM access. NO state. NO side effects.
 * All functions accept and return plain JavaScript Date objects or date strings.
 *
 * These mirror the range logic in time_service.py on the backend.
 */

import { userCreatedAt } from "../domain/time.js";

// ─────────────────────────────────────────────────────────────
// VISIBLE RANGE COMPUTATION
// Used by calendar_service.js to know what date range to fetch.
// ─────────────────────────────────────────────────────────────

/**
 * Return { start, end } as "YYYY-MM-DD" strings for the visible range
 * of the given view centered on selectedDate.
 *
 * Month view: full calendar grid (may include days from adjacent months)
 * Week view:  Mon–Sun of the containing week
 * Day view:   single day
 * Year view:  Jan 1 – Dec 31
 */
export function getVisibleRange(selectedDate, view) {
  switch (view) {
    case "month": return getMonthGridRange(selectedDate);
    case "week":  return getWeekBounds(selectedDate);
    case "day":   return { start: toDateString(selectedDate), end: toDateString(selectedDate) };
    case "year":  return getYearBounds(selectedDate);
    default:      return getMonthGridRange(selectedDate);
  }
}

/**
 * Month view grid range.
 * Extends to full Mon–Sun week rows (grid may show days from adjacent months).
 * e.g. March 2026: grid starts Feb 23 (Monday) and ends April 5 (Sunday)
 */
export function getMonthGridRange(selectedDate) {
  const year  = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);

  // Extend backward to the nearest Monday
  const startDow = firstOfMonth.getDay(); // 0=Sun, 1=Mon…
  const daysBack  = startDow === 0 ? 6 : startDow - 1;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - daysBack);

  // Extend forward to the nearest Sunday
  const endDow     = lastOfMonth.getDay();
  const daysForward = endDow === 0 ? 0 : 7 - endDow;
  const gridEnd   = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + daysForward);

  return { start: toDateString(gridStart), end: toDateString(gridEnd) };
}

/**
 * Week view: Monday–Sunday of the week containing selectedDate.
 */
export function getWeekBounds(selectedDate) {
  const d    = new Date(selectedDate);
  const dow  = d.getDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  const start = toDateString(d);
  d.setDate(d.getDate() + 6);
  return { start, end: toDateString(d) };
}

/**
 * Year view: Jan 1 – Dec 31
 */
export function getYearBounds(selectedDate) {
  const y = selectedDate.getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────

/**
 * Shift a date forward or backward by one unit of the given view.
 * Month view → shift by one month
 * Week view  → shift by 7 days
 * Day view   → shift by 1 day
 * Year view  → shift by 1 year
 *
 * Returns a new Date (does not mutate input).
 */
export function shiftDate(date, direction, view) {
  const d     = new Date(date);
  const delta = direction === "forward" ? 1 : -1;

  switch (view) {
    case "month":
      d.setDate(1); // prevents month overflow (e.g. Jan 31 + 1 month = Mar 3)
      d.setMonth(d.getMonth() + delta);
      break;
    case "week":
      d.setDate(d.getDate() + delta * 7);
      break;
    case "day":
      d.setDate(d.getDate() + delta);
      break;
    case "year":
      d.setFullYear(d.getFullYear() + delta);
      break;
  }

  return d;
}

// ─────────────────────────────────────────────────────────────
// GRID DAY ARRAY
// ─────────────────────────────────────────────────────────────

/**
 * Return an ordered array of Date objects for every cell in the month grid.
 * This includes padding days from adjacent months.
 */
export function getMonthGridDays(selectedDate) {
  const range = getMonthGridRange(selectedDate);
  const days  = [];
  // Parse as local date (no time zone shift): append T00:00:00 to prevent UTC offset issues
  const current = new Date(range.start + "T00:00:00");
  const end     = new Date(range.end   + "T00:00:00");

  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

// ─────────────────────────────────────────────────────────────
// PREDICATES
// ─────────────────────────────────────────────────────────────

/**
 * True if the date is before the user's account creation date.
 * Used to disable cells before account creation.
 */
export function isBeforeAccountCreation(date) {
  if (!userCreatedAt) return false;
  const created = new Date(userCreatedAt);
  created.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < created;
}

/**
 * True if two dates fall on the same calendar day.
 */
export function isSameDay(dateA, dateB) {
  return toDateString(dateA) === toDateString(dateB);
}

// ─────────────────────────────────────────────────────────────
// LABEL FORMATTERS
// ─────────────────────────────────────────────────────────────

/**
 * "March 2026"
 */
export function formatMonthLabel(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * "Mar 2 – Mar 8, 2026"
 */
export function formatWeekLabel(selectedDate) {
  const bounds = getWeekBounds(selectedDate);
  const start  = new Date(bounds.start + "T00:00:00");
  const end    = new Date(bounds.end   + "T00:00:00");
  const opts   = { month: "short", day: "numeric" };
  return (
    start.toLocaleDateString("en-US", opts) +
    " – " +
    end.toLocaleDateString("en-US", opts) +
    ", " +
    selectedDate.getFullYear()
  );
}

/**
 * "Wednesday, January 22, 2026"
 */
export function formatDayLabel(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Return "YYYY-MM-DD" from a Date object.
 * Uses local date parts (not UTC) to avoid off-by-one errors.
 */
export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}