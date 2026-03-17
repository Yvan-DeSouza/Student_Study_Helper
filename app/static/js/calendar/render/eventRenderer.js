/**
 * static/js/calendar/render/eventRenderer.js
 *
 * Places CalendarEvent chips on the grid skeleton.
 * Month:  up to MAX_MONTH_VISIBLE chips + "+N more" that opens overflow modal.
 * Week:   absolute-positioned chips capped at MAX_WEEK_COLS; extra → overflow badge.
 * Day:    same as week, single column.
 * Year:   density dots only.
 */

import { calendarState }                         from "../calendar_state.js";
import { userTimezone }                          from "../domain/time.js";
import { getLocalDateString, formatTime }        from "../utils/timeUtils.js";
import { timeToPixel, durationToPixels,
         MIN_EVENT_HEIGHT }                      from "../utils/pixelUtils.js";
import { computeLayout }                         from "../logic/layoutEngine.js";
import { generateEventDomId, getEventTypeClass } from "../utils/calendarHelpers.js";
import { toDateString, getWeekBounds }           from "../logic/dateMath.js";

/** Max event chips per month cell before "+N more" */
const MAX_MONTH_VISIBLE = 4;
/** Max simultaneous overlapping columns in week/day before overflow */
const MAX_WEEK_COLS = 3;

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

export function renderEvents() {
  const view   = calendarState.getView();
  const events = calendarState.getFilteredEvents();

  switch (view) {
    case "month": _renderMonth(events); break;
    case "week":  _renderWeek(events);  break;
    case "day":   _renderDay(events);   break;
    case "year":  _renderYear(events);  break;
  }
}

// ─────────────────────────────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────────────────────────────

function _renderMonth(events) {
  _groupByDate(events).forEach((dayEvents, dateStr) => {
    const cell = document.querySelector(`.cal-day-cell[data-date="${dateStr}"]`);
    if (!cell || cell.dataset.disabled === "true") return;

    const slot = cell.querySelector(".cal-day-events");
    if (!slot) return;

    slot.innerHTML = "";
    const sorted  = [...dayEvents].sort(_sort);
    const visible = sorted.slice(0, MAX_MONTH_VISIBLE);
    const hidden  = sorted.slice(MAX_MONTH_VISIBLE);

    visible.forEach(ev => slot.appendChild(_monthChip(ev)));

    if (hidden.length > 0) {
      const more       = document.createElement("div");
      more.className   = "cal-event-overflow";
      more.textContent = `+${hidden.length} more`;
      // Format label as the date string ("March 22")
      const d     = new Date(dateStr + "T00:00:00");
      const label = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      more.addEventListener("click", e => {
        e.stopPropagation();
        _openOverflow(hidden, label);
      });
      slot.appendChild(more);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// WEEK VIEW
// ─────────────────────────────────────────────────────────────

function _renderWeek(events) {
  const { allDay, timed } = _splitAllDay(events);
  _renderAllDay(allDay);

  _groupByDate(timed).forEach((dayEvents, dateStr) => {
    const col   = document.querySelector(`.cal-day-col[data-date="${dateStr}"]`);
    if (!col) return;
    const layer = col.querySelector(".cal-events-layer");
    if (!layer) return;

    const layout   = computeLayout(dayEvents);
    const visible  = dayEvents.filter(e => (layout.get(e.id)?.columnIndex ?? 0) < MAX_WEEK_COLS);
    const overflow = dayEvents.filter(e => (layout.get(e.id)?.columnIndex ?? 0) >= MAX_WEEK_COLS);

    visible.forEach(ev => _timedChip(ev, layer, layout));

    if (overflow.length > 0) {
      const badge = document.createElement("div");
      badge.className  = "cal-week-overflow-badge";
      badge.textContent = `+${overflow.length} more`;
      badge.style.cssText = "position:absolute;top:4px;right:4px;z-index:20;cursor:pointer;";
      const d     = new Date(dateStr + "T00:00:00");
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      badge.addEventListener("click", e => {
        e.stopPropagation();
        _openOverflow(overflow, label);
      });
      layer.appendChild(badge);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// DAY VIEW
// ─────────────────────────────────────────────────────────────

function _renderDay(events) {
  const { allDay, timed } = _splitAllDay(events);
  _renderAllDay(allDay);

  _groupByDate(timed).forEach((dayEvents, dateStr) => {
    const col   = document.querySelector(`.cal-day-col[data-date="${dateStr}"]`);
    if (!col) return;
    const layer = col.querySelector(".cal-events-layer");
    if (!layer) return;

    const layout = computeLayout(dayEvents);
    dayEvents.forEach(ev => _timedChip(ev, layer, layout));
  });
}

// ─────────────────────────────────────────────────────────────
// YEAR VIEW
// ─────────────────────────────────────────────────────────────

function _renderYear(events) {
  _groupByDate(events).forEach((dayEvents, dateStr) => {
    const cell   = document.querySelector(`.cal-year-day[data-date="${dateStr}"]`);
    if (!cell) return;
    const dots   = cell.querySelector(".cal-year-day-dots");
    if (!dots) return;

    dots.innerHTML = "";
    const n = Math.min(dayEvents.length, 3);
    for (let i = 0; i < n; i++) {
      const dot       = document.createElement("span");
      dot.className   = "cal-year-dot";
      if (i === 0) dot.style.background = dayEvents[0]?.color || "var(--primary)";
      dots.appendChild(dot);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// ALL-DAY STRIP (week/day)
// ─────────────────────────────────────────────────────────────

function _renderAllDay(events) {
  if (!events.length) return;
  _groupByDate(events).forEach((dayEvents, dateStr) => {
    const col = document.querySelector(`.cal-allday-col[data-date="${dateStr}"]`);
    if (!col) return;
    col.innerHTML = "";
    dayEvents.forEach(ev => col.appendChild(_monthChip(ev)));
  });
}

// ─────────────────────────────────────────────────────────────
// CHIP BUILDERS
// ─────────────────────────────────────────────────────────────

function _monthChip(ev) {
  const chip = _baseChip(ev);
  if (!ev.all_day && ev.start) {
    const t       = document.createElement("span");
    t.className   = "cal-event-time";
    t.textContent = formatTime(ev.start, userTimezone);
    chip.appendChild(t);
  }
  return chip;
}

function _timedChip(ev, layer, layout) {
  if (!ev.start) return;
  const chip = _baseChip(ev);

  const top    = timeToPixel(ev.start, userTimezone);
  const height = durationToPixels(ev.start, ev.end, userTimezone);

  chip.style.position      = "absolute";
  chip.style.top           = `${top}px`;
  chip.style.height        = `${Math.max(height, MIN_EVENT_HEIGHT)}px`;
  chip.style.pointerEvents = "auto";

  const pos = layout.get(ev.id);
  if (pos) {
    chip.style.width = `calc(${pos.widthPercent}% - 3px)`;
    chip.style.left  = `${pos.leftPercent}%`;
  }

  const t       = document.createElement("span");
  t.className   = "cal-event-time";
  t.textContent = ev.end
    ? `${formatTime(ev.start, userTimezone)} – ${formatTime(ev.end, userTimezone)}`
    : formatTime(ev.start, userTimezone);
  chip.appendChild(t);

  layer.appendChild(chip);
}

function _baseChip(ev) {
  const chip = document.createElement("div");
  chip.id               = generateEventDomId(ev.id);
  chip.dataset.eventId  = ev.id;
  chip.dataset.draggable = ev.draggable ? "true" : "false";
  chip.className        = `cal-event-chip ${getEventTypeClass(ev.type)}`;

  const color = ev.color || "#6366f1";
  chip.style.setProperty("--event-color", color);
  chip.style.backgroundColor = color;

  if (ev.metadata?.is_completed)      chip.classList.add("is-completed");
  if (ev.metadata?.is_cancelled)      chip.classList.add("is-cancelled");
  if (ev.lifecycle_type === "active") chip.classList.add("is-active");

  const title       = document.createElement("span");
  title.className   = "cal-event-title";
  title.textContent = ev.title;
  chip.appendChild(title);

  chip.addEventListener("click", e => {
    e.stopPropagation();
    _openDetails(ev.id);
  });

  return chip;
}

// ─────────────────────────────────────────────────────────────
// MODAL OPENERS (dynamic imports keep the bundle lean)
// ─────────────────────────────────────────────────────────────

async function _openDetails(eventId) {
  const { openEventDetailsModal } = await import("../modals/calendar_event_details.js");
  openEventDetailsModal(eventId);
}

async function _openOverflow(events, label) {
  const { openOverflowModal } = await import("../modals/calendar_overflow_modal.js");
  openOverflowModal(events, label);
}

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function _groupByDate(events) {
  const map = new Map();
  events.forEach(ev => {
    if (!ev.start) return;
    const d = getLocalDateString(ev.start, userTimezone);
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(ev);
  });
  return map;
}

function _splitAllDay(events) {
  const allDay = [], timed = [];
  events.forEach(e => (e.all_day ? allDay : timed).push(e));
  return { allDay, timed };
}

function _sort(a, b) {
  const P = { due:0, scheduled:1, active:2, completed:3, cancelled:4, created:5, finished:6 };
  const pa = P[a.lifecycle_type] ?? 99, pb = P[b.lifecycle_type] ?? 99;
  if (pa !== pb) return pa - pb;
  return (a.start || "").localeCompare(b.start || "");
}