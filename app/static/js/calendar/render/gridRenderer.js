/**
 * static/js/calendar/render/gridRenderer.js
 *
 * FIX 1: Month view now uses ONE grid for both header cells and day cells.
 *        This guarantees column alignment — no more DOW headers narrower
 *        than the day cells beneath them.
 * FIX 2: .cal-view-scroll-outer properly constrained so horizontal scroll
 *        actually appears when the grid is wider than the viewport.
 */

import { calendarState }
  from "../calendar_state.js";
import { getMonthGridDays, getWeekBounds, toDateString, isBeforeAccountCreation }
  from "../logic/dateMath.js";
import { PIXELS_PER_HOUR, TOTAL_DAY_HEIGHT, nowToPixel }
  from "../utils/pixelUtils.js";
import { userTimezone }
  from "../domain/time.js";
import { navigateToDate, switchView }
  from "../interaction/navigation.js";

const DAY_HEADERS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

export function renderGrid(container) {
  container.innerHTML = "";

  const view = calendarState.getView();
  if (view === "year") {
    _renderYearGrid(container);
    return;
  }

  // Horizontal-scroll wrapper for month / week / day
  const outer = document.createElement("div");
  outer.className = "cal-view-scroll-outer";

  switch (view) {
    case "month": _renderMonthGrid(outer); break;
    case "week":  _renderWeekGrid(outer);  break;
    case "day":   _renderDayGrid(outer);   break;
    default:      _renderMonthGrid(outer); break;
  }

  container.appendChild(outer);
}

// ─────────────────────────────────────────────────────────────
// MONTH VIEW — single grid (header + cells together)
// ─────────────────────────────────────────────────────────────

function _renderMonthGrid(container) {
  const sel          = calendarState.getSelectedDate();
  const currentMonth = sel.getMonth();
  const today        = toDateString(new Date());
  const selStr       = toDateString(sel);

  const wrapper = document.createElement("div");
  wrapper.className = "cal-month-wrapper";

  /**
   * FIX: One CSS grid contains BOTH the 7 header cells and all day cells.
   * Because they share the same grid, column widths are always identical —
   * the header cells can never be narrower than the day cells.
   */
  const grid = document.createElement("div");
  grid.className = "cal-month-grid";

  // ── Row 0: day-of-week headers ──────────────────────────
  DAY_HEADERS.forEach(name => {
    const hdr       = document.createElement("div");
    hdr.className   = "cal-day-header-cell";
    hdr.textContent = name;
    grid.appendChild(hdr);
  });

  // ── Rows 1-6: day cells ──────────────────────────────────
  getMonthGridDays(sel).forEach(day => {
    const ds       = toDateString(day);
    const isCur    = day.getMonth() === currentMonth;
    const isToday  = ds === today;
    const isSel    = ds === selStr;
    const isDis    = isBeforeAccountCreation(day);

    const cell = document.createElement("div");
    cell.className     = "cal-day-cell";
    cell.dataset.date  = ds;
    cell.setAttribute("role",       "gridcell");
    cell.setAttribute("aria-label", ds);

    if (!isCur)  cell.classList.add("other-month");
    if (isToday) cell.classList.add("today");
    if (isSel)   cell.classList.add("selected");
    if (isDis) {
      cell.classList.add("disabled");
      cell.dataset.disabled = "true";
    }

    const num       = document.createElement("span");
    num.className   = "cal-date-number";
    num.textContent = day.getDate();
    cell.appendChild(num);

    const slot      = document.createElement("div");
    slot.className  = "cal-day-events";
    cell.appendChild(slot);

    grid.appendChild(cell);
  });

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}

// ─────────────────────────────────────────────────────────────
// WEEK VIEW
// ─────────────────────────────────────────────────────────────

function _renderWeekGrid(container) {
  const sel      = calendarState.getSelectedDate();
  const bounds   = getWeekBounds(sel);
  const selStr   = toDateString(sel);
  const today    = toDateString(new Date());
  const weekDays = _buildWeekDays(bounds.start, 7);

  const wrapper      = document.createElement("div");
  wrapper.className  = "cal-week-wrapper";

  // Column headers
  const headers    = document.createElement("div");
  headers.className = "cal-week-col-headers";
  headers.id        = "cal-week-col-headers";
  headers.appendChild(_gutterSpacer());

  weekDays.forEach(ds => {
    const d     = new Date(ds + "T00:00:00");
    const hdr   = document.createElement("div");
    hdr.className     = "cal-week-col-header";
    hdr.dataset.date  = ds;
    if (ds === today)  hdr.classList.add("today");
    if (ds === selStr) hdr.classList.add("selected-col");

    const dow       = document.createElement("span");
    dow.className   = "cal-week-dow";
    dow.textContent = DAY_HEADERS[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const num       = document.createElement("span");
    num.className   = "cal-week-day-num";
    num.textContent = d.getDate();
    hdr.appendChild(dow);
    hdr.appendChild(num);
    headers.appendChild(hdr);
  });
  wrapper.appendChild(headers);

  // All-day strip
  const allDay      = _buildAllDayStrip(weekDays, 7);
  allDay.id         = "cal-allday-strip-headers";
  wrapper.appendChild(allDay);

  // Scrollable time area
  const scroll      = document.createElement("div");
  scroll.className  = "cal-time-scroll";
  scroll.appendChild(_buildTimeGutter());

  const cols        = document.createElement("div");
  cols.className    = "cal-week-cols";
  weekDays.forEach(ds => cols.appendChild(_buildTimeColumn(ds, selStr, today)));
  scroll.appendChild(cols);
  wrapper.appendChild(scroll);
  container.appendChild(wrapper);

  // Scroll to "now – 2 h" and fix header alignment
  requestAnimationFrame(() => {
    scroll.scrollTop = Math.max(0, nowToPixel(userTimezone, PIXELS_PER_HOUR) - PIXELS_PER_HOUR * 2);
    _compensateScrollbarWidth(headers, allDay, scroll);
  });
}

// ─────────────────────────────────────────────────────────────
// DAY VIEW
// ─────────────────────────────────────────────────────────────

function _renderDayGrid(container) {
  const sel     = calendarState.getSelectedDate();
  const ds      = toDateString(sel);
  const today   = toDateString(new Date());

  const wrapper     = document.createElement("div");
  wrapper.className = "cal-day-wrapper";

  const headers      = document.createElement("div");
  headers.className  = "cal-week-col-headers cal-day-headers-row";
  headers.appendChild(_gutterSpacer());

  const hdr      = document.createElement("div");
  hdr.className  = "cal-week-col-header";
  hdr.dataset.date = ds;
  if (ds === today) hdr.classList.add("today");

  const dow       = document.createElement("span");
  dow.className   = "cal-week-dow";
  dow.textContent = DAY_HEADERS[sel.getDay() === 0 ? 6 : sel.getDay() - 1];
  const num       = document.createElement("span");
  num.className   = "cal-week-day-num";
  num.textContent = sel.getDate();
  hdr.appendChild(dow);
  hdr.appendChild(num);
  headers.appendChild(hdr);
  wrapper.appendChild(headers);

  const allDay      = _buildAllDayStrip([ds], 1);
  wrapper.appendChild(allDay);

  const scroll      = document.createElement("div");
  scroll.className  = "cal-time-scroll cal-day-scroll";
  scroll.appendChild(_buildTimeGutter());

  const cols        = document.createElement("div");
  cols.className    = "cal-week-cols cal-day-cols";
  cols.appendChild(_buildTimeColumn(ds, ds, today));
  scroll.appendChild(cols);
  wrapper.appendChild(scroll);
  container.appendChild(wrapper);

  requestAnimationFrame(() => {
    scroll.scrollTop = Math.max(0, nowToPixel(userTimezone, PIXELS_PER_HOUR) - PIXELS_PER_HOUR * 2);
    _compensateScrollbarWidth(headers, allDay, scroll);
  });
}

// ─────────────────────────────────────────────────────────────
// YEAR VIEW
// ─────────────────────────────────────────────────────────────

function _renderYearGrid(container) {
  const sel      = calendarState.getSelectedDate();
  const year     = sel.getFullYear();
  const todayStr = toDateString(new Date());
  const selStr   = toDateString(sel);

  const wrapper     = document.createElement("div");
  wrapper.className = "cal-year-wrapper";
  for (let m = 0; m < 12; m++) {
    wrapper.appendChild(_buildMiniMonth(year, m, todayStr, selStr));
  }
  container.appendChild(wrapper);
}

// ─────────────────────────────────────────────────────────────
// HELPERS — TIME GRID
// ─────────────────────────────────────────────────────────────

function _buildAllDayStrip(days, colCount) {
  const strip      = document.createElement("div");
  strip.className  = colCount > 1
    ? "cal-allday-strip"
    : "cal-allday-strip cal-allday-strip-day";
  strip.id         = "cal-allday-strip";

  const gutter       = document.createElement("div");
  gutter.className   = "cal-allday-gutter";
  gutter.textContent = "All Day";
  strip.appendChild(gutter);

  days.forEach(ds => {
    const col = document.createElement("div");
    col.className    = "cal-allday-col";
    col.dataset.date = ds;
    strip.appendChild(col);
  });
  return strip;
}

function _gutterSpacer() {
  const d       = document.createElement("div");
  d.className   = "cal-time-gutter-header";
  return d;
}

function _buildTimeGutter() {
  const gutter   = document.createElement("div");
  gutter.className = "cal-time-gutter";
  for (let h = 0; h < 24; h++) {
    const lbl       = document.createElement("div");
    lbl.className   = "cal-time-label";
    lbl.style.height = `${PIXELS_PER_HOUR}px`;
    const h12       = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ap        = h < 12 ? "AM" : "PM";
    lbl.textContent = h === 0 ? "12 AM" : `${h12} ${ap}`;
    gutter.appendChild(lbl);
  }
  return gutter;
}

function _buildTimeColumn(ds, selStr, today) {
  const col = document.createElement("div");
  col.className    = "cal-day-col";
  col.dataset.date = ds;
  col.style.height   = `${TOTAL_DAY_HEIGHT}px`;
  col.style.position = "relative";

  if (ds === today)  col.classList.add("today");
  if (ds === selStr) col.classList.add("selected-col");

  for (let h = 0; h < 24; h++) {
    const slot        = document.createElement("div");
    slot.className    = "cal-time-slot";
    slot.dataset.time = `${String(h).padStart(2,"0")}:00`;
    slot.style.height = `${PIXELS_PER_HOUR}px`;
    col.appendChild(slot);
  }

  const layer           = document.createElement("div");
  layer.className       = "cal-events-layer";
  layer.style.cssText   = "position:absolute;inset:0;pointer-events:none;";
  col.appendChild(layer);

  if (ds === today) {
    const line     = document.createElement("div");
    line.className = "cal-now-indicator";
    line.style.top = `${nowToPixel(userTimezone)}px`;
    layer.appendChild(line);
  }
  return col;
}

/**
 * FIX: Header alignment for week/day view.
 * The scrollable area loses some width to the scrollbar track.
 * Add matching padding-right to the header and allday strip so
 * their columns line up with the day columns below.
 */
function _compensateScrollbarWidth(headersEl, allDayEl, scrollEl) {
  const barWidth = scrollEl.offsetWidth - scrollEl.clientWidth;
  if (barWidth > 0) {
    headersEl.style.paddingRight = `${barWidth}px`;
    allDayEl.style.paddingRight  = `${barWidth}px`;
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS — MINI MONTH (year view)
// ─────────────────────────────────────────────────────────────

function _buildMiniMonth(year, month, todayStr, selStr) {
  const first = new Date(year, month, 1);
  const days  = getMonthGridDays(first);

  const wrapper = document.createElement("div");
  wrapper.className = "cal-year-month";

  const mhdr       = document.createElement("div");
  mhdr.className   = "cal-year-month-header";
  mhdr.textContent = MONTH_NAMES[month];
  mhdr.style.cursor = "pointer";
  mhdr.addEventListener("click", () => {
    navigateToDate(new Date(year, month, 1));
    switchView("month");
  });
  wrapper.appendChild(mhdr);

  const dowRow = document.createElement("div");
  dowRow.className = "cal-year-dow-row";
  ["M","T","W","T","F","S","S"].forEach(d => {
    const s = document.createElement("span");
    s.textContent = d;
    dowRow.appendChild(s);
  });
  wrapper.appendChild(dowRow);

  const grid = document.createElement("div");
  grid.className = "cal-year-month-grid";

  days.forEach(day => {
    const ds     = toDateString(day);
    const cell   = document.createElement("div");
    cell.className    = "cal-year-day";
    cell.dataset.date = ds;
    cell.textContent  = day.getDate();

    if (day.getMonth() !== month) cell.classList.add("other-month");
    if (ds === todayStr)          cell.classList.add("today");
    if (ds === selStr)            cell.classList.add("selected");
    if (isBeforeAccountCreation(day)) {
      cell.classList.add("disabled");
      cell.dataset.disabled = "true";
    }

    const dots     = document.createElement("div");
    dots.className = "cal-year-day-dots";
    cell.appendChild(dots);

    if (!cell.dataset.disabled) {
      cell.addEventListener("click", () => {
        navigateToDate(day);
        switchView("day");
      });
    }
    grid.appendChild(cell);
  });

  wrapper.appendChild(grid);
  return wrapper;
}

function _buildWeekDays(startStr, count) {
  const out = [];
  const d   = new Date(startStr + "T00:00:00");
  for (let i = 0; i < count; i++) {
    out.push(toDateString(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}