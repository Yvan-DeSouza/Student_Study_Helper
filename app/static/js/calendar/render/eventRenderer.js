/**
 * static/js/calendar/render/eventRenderer.js
 *
 * Places CalendarEvent chips on the grid skeleton for all four views.
 *
 * Month:  groups events by local date, renders chips with overflow indicator.
 * Week:   positions events absolutely using pixelUtils + layoutEngine.
 * Day:    same as week, single column.
 * Year:   density dots only (no chips).
 */

import { calendarState }                        from "../calendar_state.js";
import { userTimezone }                         from "../domain/time.js";
import { getLocalDateString, formatTime }       from "../utils/timeUtils.js";
import { timeToPixel, durationToPixels,
         MIN_EVENT_HEIGHT }                     from "../utils/pixelUtils.js";
import { computeLayout }                        from "../logic/layoutEngine.js";
import { generateEventDomId, getEventTypeClass } from "../utils/calendarHelpers.js";
import { toDateString, getWeekBounds }          from "../logic/dateMath.js";

const MAX_MONTH_VISIBLE = 4; // max chips per cell before "+N more"

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

export function renderEvents() {
  const view   = calendarState.getView();
  const events = calendarState.getFilteredEvents(); // respects Phase 5 filters

  switch (view) {
    case "month": _renderMonthEvents(events);  break;
    case "week":  _renderWeekEvents(events);   break;
    case "day":   _renderDayEvents(events);    break;
    case "year":  _renderYearDots(events);     break;
    default:      _renderMonthEvents(events);  break;
  }
}

// ─────────────────────────────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────────────────────────────

function _renderMonthEvents(events) {
  const byDate = _groupByLocalDate(events);

  byDate.forEach((dateEvents, dateStr) => {
    const cell = document.querySelector(`.cal-day-cell[data-date="${dateStr}"]`);
    if (!cell || cell.dataset.disabled === "true") return;

    const slot = cell.querySelector(".cal-day-events");
    if (!slot) return;

    slot.innerHTML = "";
    const sorted   = [...dateEvents].sort(_sortComparator);
    const visible  = sorted.slice(0, MAX_MONTH_VISIBLE);
    const overflow = sorted.length - MAX_MONTH_VISIBLE;

    visible.forEach(event => slot.appendChild(_buildMonthChip(event)));

    if (overflow > 0) {
      const more       = document.createElement("div");
      more.className   = "cal-event-overflow";
      more.textContent = `+${overflow} more`;
      slot.appendChild(more);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// WEEK VIEW
// ─────────────────────────────────────────────────────────────

function _renderWeekEvents(events) {
  const selectedDate = calendarState.getSelectedDate();
  const bounds       = getWeekBounds(selectedDate);

  // Split events into all-day and timed
  const { allDay, timed } = _splitAllDay(events);

  // All-day events
  _renderAllDayStrip(allDay);

  // Group timed events by date
  const byDate = _groupByLocalDate(timed);

  byDate.forEach((dayEvents, dateStr) => {
    const col = document.querySelector(`.cal-day-col[data-date="${dateStr}"]`);
    if (!col) return;

    const layer = col.querySelector(".cal-events-layer");
    if (!layer) return;

    const layout = computeLayout(dayEvents);
    dayEvents.forEach(event => _placeTimedChip(event, layer, layout));
  });
}

// ─────────────────────────────────────────────────────────────
// DAY VIEW
// ─────────────────────────────────────────────────────────────

function _renderDayEvents(events) {
  const { allDay, timed } = _splitAllDay(events);
  _renderAllDayStrip(allDay);

  const byDate = _groupByLocalDate(timed);
  byDate.forEach((dayEvents, dateStr) => {
    const col = document.querySelector(`.cal-day-col[data-date="${dateStr}"]`);
    if (!col) return;

    const layer = col.querySelector(".cal-events-layer");
    if (!layer) return;

    const layout = computeLayout(dayEvents);
    dayEvents.forEach(event => _placeTimedChip(event, layer, layout));
  });
}

// ─────────────────────────────────────────────────────────────
// YEAR VIEW (density dots only)
// ─────────────────────────────────────────────────────────────

function _renderYearDots(events) {
  const byDate = _groupByLocalDate(events);

  byDate.forEach((dateEvents, dateStr) => {
    const cell = document.querySelector(`.cal-year-day[data-date="${dateStr}"]`);
    if (!cell) return;

    const dotsEl = cell.querySelector(".cal-year-day-dots");
    if (!dotsEl) return;

    dotsEl.innerHTML = "";

    // Show 1–3 dots depending on event count
    const count = Math.min(dateEvents.length, 3);
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "cal-year-dot";
      // Color from first event of this type
      if (i === 0) dot.style.background = dateEvents[0]?.color || "var(--primary)";
      dotsEl.appendChild(dot);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// ALL-DAY STRIP (week/day views)
// ─────────────────────────────────────────────────────────────

function _renderAllDayStrip(allDayEvents) {
  if (!allDayEvents.length) return;

  const byDate = _groupByLocalDate(allDayEvents);

  byDate.forEach((dateEvents, dateStr) => {
    const col = document.querySelector(`.cal-allday-col[data-date="${dateStr}"]`);
    if (!col) return;
    col.innerHTML = "";
    dateEvents.forEach(event => col.appendChild(_buildMonthChip(event)));
  });
}

// ─────────────────────────────────────────────────────────────
// CHIP BUILDERS
// ─────────────────────────────────────────────────────────────

/** Build a chip for month / all-day strip. */
function _buildMonthChip(event) {
  const chip = _createBaseChip(event);

  if (!event.all_day && event.start) {
    const time       = document.createElement("span");
    time.className   = "cal-event-time";
    time.textContent = formatTime(event.start, userTimezone);
    chip.appendChild(time);
  }

  return chip;
}

/** Place a timed chip absolutely in the time column using layoutEngine data. */
function _placeTimedChip(event, layer, layout) {
  if (!event.start) return;

  const chip = _createBaseChip(event);
  chip.style.position = "absolute";
  chip.style.left     = "0";
  chip.style.right    = "0";

  // Pixel positioning
  const top    = timeToPixel(event.start, userTimezone);
  const height = durationToPixels(event.start, event.end, userTimezone);
  chip.style.top    = `${top}px`;
  chip.style.height = `${Math.max(height, MIN_EVENT_HEIGHT)}px`;
  chip.style.pointerEvents = "auto";

  // Layout engine width/offset
  const pos = layout.get(event.id);
  if (pos) {
    chip.style.width = `calc(${pos.widthPercent}% - 3px)`;
    chip.style.left  = `${pos.leftPercent}%`;
  }

  // Time label inside chip
  const timeEl       = document.createElement("span");
  timeEl.className   = "cal-event-time";
  timeEl.textContent = event.end
    ? `${formatTime(event.start, userTimezone)} – ${formatTime(event.end, userTimezone)}`
    : formatTime(event.start, userTimezone);
  chip.appendChild(timeEl);

  layer.appendChild(chip);
}

/** Shared chip factory. */
function _createBaseChip(event) {
  const chip            = document.createElement("div");
  chip.id               = generateEventDomId(event.id);
  chip.dataset.eventId  = event.id;
  chip.dataset.draggable = event.draggable ? "true" : "false";
  chip.className        = `cal-event-chip ${getEventTypeClass(event.type)}`;

  const color = event.color || "#6366f1";
  chip.style.setProperty("--event-color", color);
  chip.style.backgroundColor = color;

  if (event.metadata?.is_completed)        chip.classList.add("is-completed");
  if (event.metadata?.is_cancelled)        chip.classList.add("is-cancelled");
  if (event.lifecycle_type === "active")   chip.classList.add("is-active");

  const title       = document.createElement("span");
  title.className   = "cal-event-title";
  title.textContent = event.title;
  chip.appendChild(title);

  chip.addEventListener("click", e => {
    e.stopPropagation();
    _openDetailsModal(event.id);
  });

  return chip;
}

async function _openDetailsModal(eventId) {
  const { openEventDetailsModal } = await import("../modals/calendar_event_details.js");
  openEventDetailsModal(eventId);
}

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

/** Group events by the local calendar date of their start. */
function _groupByLocalDate(events) {
  const map = new Map();
  events.forEach(event => {
    if (!event.start) return;
    const d = getLocalDateString(event.start, userTimezone);
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(event);
  });
  return map;
}

/** Split events into all-day and timed buckets. */
function _splitAllDay(events) {
  const allDay = [];
  const timed  = [];
  events.forEach(e => (e.all_day ? allDay : timed).push(e));
  return { allDay, timed };
}

/** Sort: due first, then by start time. */
function _sortComparator(a, b) {
  const P = { due:0, scheduled:1, active:2, completed:3, cancelled:4, created:5, finished:6 };
  const pa = P[a.lifecycle_type] ?? 99;
  const pb = P[b.lifecycle_type] ?? 99;
  if (pa !== pb) return pa - pb;
  return (a.start || "").localeCompare(b.start || "");
}