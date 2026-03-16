/**
 * static/js/calendar/render/eventRenderer.js
 *
 * Places CalendarEvent chips on the grid for all four views.
 * Month: max 4 chips + overflow modal.
 * Week/Day: max 3 simultaneous columns + overflow badge.
 * Year: density dots.
 */

import { calendarState }                          from "../calendar_state.js";
import { userTimezone }                           from "../domain/time.js";
import { getLocalDateString, formatTime }         from "../utils/timeUtils.js";
import { timeToPixel, durationToPixels,
         MIN_EVENT_HEIGHT }                       from "../utils/pixelUtils.js";
import { computeLayout }                          from "../logic/layoutEngine.js";
import { generateEventDomId, getEventTypeClass }  from "../utils/calendarHelpers.js";
import { toDateString, getWeekBounds }            from "../logic/dateMath.js";

/** Month view: max chips per day cell */
const MAX_MONTH_VISIBLE = 4;
/** Week/day view: max simultaneous event columns (extra go to overflow) */
const MAX_WEEK_COLS = 3;

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

export function renderEvents() {
  const view   = calendarState.getView();
  const events = calendarState.getFilteredEvents();

  switch (view) {
    case "month": _renderMonthEvents(events); break;
    case "week":  _renderWeekEvents(events);  break;
    case "day":   _renderDayEvents(events);   break;
    case "year":  _renderYearDots(events);    break;
    default:      _renderMonthEvents(events); break;
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
    const hidden   = sorted.slice(MAX_MONTH_VISIBLE);

    visible.forEach(event => slot.appendChild(_buildMonthChip(event)));

    if (hidden.length > 0) {
      const more = document.createElement("div");
      more.className   = "cal-event-overflow";
      more.textContent = `+${hidden.length} more`;
      more.addEventListener("click", e => {
        e.stopPropagation();
        _openOverflow(hidden, dateStr);
      });
      slot.appendChild(more);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// WEEK VIEW
// ─────────────────────────────────────────────────────────────

function _renderWeekEvents(events) {
  const { allDay, timed } = _splitAllDay(events);
  _renderAllDayStrip(allDay);

  const byDate = _groupByLocalDate(timed);

  byDate.forEach((dayEvents, dateStr) => {
    const col   = document.querySelector(`.cal-day-col[data-date="${dateStr}"]`);
    if (!col) return;
    const layer = col.querySelector(".cal-events-layer");
    if (!layer) return;

    const layout   = computeLayout(dayEvents);
    const visible  = dayEvents.filter(e => {
      const pos = layout.get(e.id);
      return !pos || pos.columnIndex < MAX_WEEK_COLS;
    });
    const overflow = dayEvents.filter(e => {
      const pos = layout.get(e.id);
      return pos && pos.columnIndex >= MAX_WEEK_COLS;
    });

    visible.forEach(event => _placeTimedChip(event, layer, layout));

    if (overflow.length > 0) {
      _addWeekOverflowBadge(overflow, layer, dateStr);
    }
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
    const col   = document.querySelector(`.cal-day-col[data-date="${dateStr}"]`);
    if (!col) return;
    const layer = col.querySelector(".cal-events-layer");
    if (!layer) return;

    const layout  = computeLayout(dayEvents);
    dayEvents.forEach(event => _placeTimedChip(event, layer, layout));
  });
}

// ─────────────────────────────────────────────────────────────
// YEAR VIEW (density dots)
// ─────────────────────────────────────────────────────────────

function _renderYearDots(events) {
  const byDate = _groupByLocalDate(events);
  byDate.forEach((dateEvents, dateStr) => {
    const cell   = document.querySelector(`.cal-year-day[data-date="${dateStr}"]`);
    if (!cell) return;
    const dotsEl = cell.querySelector(".cal-year-day-dots");
    if (!dotsEl) return;

    dotsEl.innerHTML = "";
    const count      = Math.min(dateEvents.length, 3);
    for (let i = 0; i < count; i++) {
      const dot        = document.createElement("span");
      dot.className    = "cal-year-dot";
      if (i === 0) dot.style.background = dateEvents[0]?.color || "var(--primary)";
      dotsEl.appendChild(dot);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// ALL-DAY STRIP
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

function _placeTimedChip(event, layer, layout) {
  if (!event.start) return;
  const chip = _createBaseChip(event);

  const top    = timeToPixel(event.start, userTimezone);
  const height = durationToPixels(event.start, event.end, userTimezone);
  chip.style.position      = "absolute";
  chip.style.top           = `${top}px`;
  chip.style.height        = `${Math.max(height, MIN_EVENT_HEIGHT)}px`;
  chip.style.pointerEvents = "auto";

  const pos = layout.get(event.id);
  if (pos) {
    chip.style.width = `calc(${pos.widthPercent}% - 3px)`;
    chip.style.left  = `${pos.leftPercent}%`;
  }

  const timeEl       = document.createElement("span");
  timeEl.className   = "cal-event-time";
  timeEl.textContent = event.end
    ? `${formatTime(event.start, userTimezone)} – ${formatTime(event.end, userTimezone)}`
    : formatTime(event.start, userTimezone);
  chip.appendChild(timeEl);

  layer.appendChild(chip);
}

function _createBaseChip(event) {
  const chip             = document.createElement("div");
  chip.id                = generateEventDomId(event.id);
  chip.dataset.eventId   = event.id;
  chip.dataset.draggable = event.draggable ? "true" : "false";
  chip.className         = `cal-event-chip ${getEventTypeClass(event.type)}`;

  const color = event.color || "#6366f1";
  chip.style.setProperty("--event-color", color);
  chip.style.backgroundColor = color;

  if (event.metadata?.is_completed)       chip.classList.add("is-completed");
  if (event.metadata?.is_cancelled)       chip.classList.add("is-cancelled");
  if (event.lifecycle_type === "active")  chip.classList.add("is-active");

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

// ─────────────────────────────────────────────────────────────
// WEEK OVERFLOW BADGE
// ─────────────────────────────────────────────────────────────

function _addWeekOverflowBadge(overflowEvents, layer, dateStr) {
  const badge        = document.createElement("div");
  badge.className    = "cal-week-overflow-badge";
  badge.textContent  = `+${overflowEvents.length} more`;
  badge.style.cssText = "position:absolute;top:4px;right:4px;z-index:20;";

  badge.addEventListener("click", e => {
    e.stopPropagation();
    _openOverflow(overflowEvents, dateStr);
  });
  layer.appendChild(badge);
}

// ─────────────────────────────────────────────────────────────
// OVERFLOW MODAL TRIGGER
// ─────────────────────────────────────────────────────────────

async function _openOverflow(hiddenEvents, label) {
  const { openOverflowModal } = await import("../modals/calendar_overflow_modal.js");
  openOverflowModal(hiddenEvents, label);
}

async function _openDetailsModal(eventId) {
  const { openEventDetailsModal } = await import("../modals/calendar_event_details.js");
  openEventDetailsModal(eventId);
}

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

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

function _splitAllDay(events) {
  const allDay = [], timed = [];
  events.forEach(e => (e.all_day ? allDay : timed).push(e));
  return { allDay, timed };
}

function _sortComparator(a, b) {
  const P = { due:0, scheduled:1, active:2, completed:3, cancelled:4, created:5, finished:6 };
  const pa = P[a.lifecycle_type] ?? 99;
  const pb = P[b.lifecycle_type] ?? 99;
  if (pa !== pb) return pa - pb;
  return (a.start || "").localeCompare(b.start || "");
}