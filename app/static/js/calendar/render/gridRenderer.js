/**
 * static/js/calendar/render/gridRenderer.js
 *
 * Builds the DOM skeleton for all four calendar views.
 * Does NOT place events (that's eventRenderer.js).
 *
 * Views:
 *   month — 7-column date grid with full Mon–Sun rows
 *   week  — 7 time-columns with 24 hourly rows (scrollable)
 *   day   — single time-column
 *   year  — 4×3 mini-month grid (navigation only)
 */

import { calendarState }                                              from "../calendar_state.js";
import { getMonthGridDays, getWeekBounds, toDateString, isBeforeAccountCreation } from "../logic/dateMath.js";
import { PIXELS_PER_HOUR, TOTAL_DAY_HEIGHT, nowToPixel }             from "../utils/pixelUtils.js";
import { userTimezone }                                               from "../domain/time.js";
import { navigateToDate, switchView }                                 from "../interaction/navigation.js";

const DAY_HEADERS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

export function renderGrid(container) {
  container.innerHTML = "";
  switch (calendarState.getView()) {
    case "month": _renderMonthGrid(container); break;
    case "week":  _renderWeekGrid(container);  break;
    case "day":   _renderDayGrid(container);   break;
    case "year":  _renderYearGrid(container);  break;
    default:      _renderMonthGrid(container); break;
  }
}

// ─────────────────────────────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────────────────────────────

function _renderMonthGrid(container) {
  const selectedDate = calendarState.getSelectedDate();
  const currentMonth = selectedDate.getMonth();
  const today        = toDateString(new Date());
  const selectedStr  = toDateString(selectedDate);

  const wrapper = document.createElement("div");
  wrapper.className = "cal-month-wrapper";

  // Day-of-week headers
  const headerRow = document.createElement("div");
  headerRow.className = "cal-day-headers";
  DAY_HEADERS.forEach(name => {
    const cell = document.createElement("div");
    cell.className   = "cal-day-header-cell";
    cell.textContent = name;
    headerRow.appendChild(cell);
  });
  wrapper.appendChild(headerRow);

  // Day cells
  const grid = document.createElement("div");
  grid.className = "cal-month-cells";

  getMonthGridDays(selectedDate).forEach(day => {
    const dateStr         = toDateString(day);
    const isCurrentMonth  = day.getMonth() === currentMonth;
    const isToday         = dateStr === today;
    const isSelected      = dateStr === selectedStr;
    const isDisabled      = isBeforeAccountCreation(day);

    const cell = document.createElement("div");
    cell.className      = "cal-day-cell";
    cell.dataset.date   = dateStr;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", dateStr);

    if (!isCurrentMonth) cell.classList.add("other-month");
    if (isToday)          cell.classList.add("today");
    if (isSelected)       cell.classList.add("selected");
    if (isDisabled)       { cell.classList.add("disabled"); cell.dataset.disabled = "true"; }

    const num = document.createElement("span");
    num.className   = "cal-date-number";
    num.textContent = day.getDate();
    cell.appendChild(num);

    const eventsSlot = document.createElement("div");
    eventsSlot.className = "cal-day-events";
    cell.appendChild(eventsSlot);

    grid.appendChild(cell);
  });

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}

// ─────────────────────────────────────────────────────────────
// WEEK VIEW
// ─────────────────────────────────────────────────────────────

function _renderWeekGrid(container) {
  const selectedDate = calendarState.getSelectedDate();
  const bounds       = getWeekBounds(selectedDate);
  const selectedStr  = toDateString(selectedDate);
  const today        = toDateString(new Date());

  const wrapper = document.createElement("div");
  wrapper.className = "cal-week-wrapper";

  // Build list of 7 dates (Mon–Sun)
  const weekDays = _buildWeekDays(bounds.start, 7);

  // Column headers
  const colHeaders = document.createElement("div");
  colHeaders.className = "cal-week-col-headers";

  // Gutter spacer
  const gutterSpacer = document.createElement("div");
  gutterSpacer.className = "cal-time-gutter-header";
  colHeaders.appendChild(gutterSpacer);

  weekDays.forEach(dateStr => {
    const d        = new Date(dateStr + "T00:00:00");
    const isToday  = dateStr === today;
    const isSel    = dateStr === selectedStr;

    const hdr = document.createElement("div");
    hdr.className    = "cal-week-col-header";
    hdr.dataset.date = dateStr;
    if (isToday) hdr.classList.add("today");
    if (isSel)   hdr.classList.add("selected-col");

    const dow  = document.createElement("span");
    dow.className   = "cal-week-dow";
    dow.textContent = DAY_HEADERS[d.getDay() === 0 ? 6 : d.getDay() - 1];

    const dayNum = document.createElement("span");
    dayNum.className   = "cal-week-day-num";
    dayNum.textContent = d.getDate();

    hdr.appendChild(dow);
    hdr.appendChild(dayNum);
    colHeaders.appendChild(hdr);
  });
  wrapper.appendChild(colHeaders);

  // All-day strip
  const allDayStrip = document.createElement("div");
  allDayStrip.className  = "cal-allday-strip";
  allDayStrip.id         = "cal-allday-strip";

  const allDayGutter = document.createElement("div");
  allDayGutter.className = "cal-allday-gutter";
  allDayGutter.textContent = "All Day";
  allDayStrip.appendChild(allDayGutter);

  weekDays.forEach(dateStr => {
    const col = document.createElement("div");
    col.className    = "cal-allday-col";
    col.dataset.date = dateStr;
    allDayStrip.appendChild(col);
  });
  wrapper.appendChild(allDayStrip);

  // Scrollable time area
  const scrollArea = document.createElement("div");
  scrollArea.className = "cal-time-scroll";

  // Time gutter
  const gutter = _buildTimeGutter();
  scrollArea.appendChild(gutter);

  // Day columns
  const colsContainer = document.createElement("div");
  colsContainer.className = "cal-week-cols";

  weekDays.forEach(dateStr => {
    const col = _buildTimeColumn(dateStr, selectedStr, today, false);
    colsContainer.appendChild(col);
  });

  scrollArea.appendChild(colsContainer);
  wrapper.appendChild(scrollArea);
  container.appendChild(wrapper);

  // Scroll to current time minus 2 hours
  requestAnimationFrame(() => {
    const nowPx = nowToPixel(userTimezone, PIXELS_PER_HOUR);
    const offset = Math.max(0, nowPx - PIXELS_PER_HOUR * 2);
    scrollArea.scrollTop = offset;
  });
}

// ─────────────────────────────────────────────────────────────
// DAY VIEW
// ─────────────────────────────────────────────────────────────

function _renderDayGrid(container) {
  const selectedDate = calendarState.getSelectedDate();
  const dateStr      = toDateString(selectedDate);
  const today        = toDateString(new Date());

  const wrapper = document.createElement("div");
  wrapper.className = "cal-day-wrapper";

  // Single column header
  const colHeaders = document.createElement("div");
  colHeaders.className = "cal-week-col-headers cal-day-headers-row";

  const gutterSpacer = document.createElement("div");
  gutterSpacer.className = "cal-time-gutter-header";
  colHeaders.appendChild(gutterSpacer);

  const hdr = document.createElement("div");
  hdr.className    = "cal-week-col-header";
  hdr.dataset.date = dateStr;
  if (dateStr === today) hdr.classList.add("today");

  const d      = selectedDate;
  const dow    = document.createElement("span");
  dow.className   = "cal-week-dow";
  dow.textContent = DAY_HEADERS[d.getDay() === 0 ? 6 : d.getDay() - 1];

  const dayNum = document.createElement("span");
  dayNum.className   = "cal-week-day-num";
  dayNum.textContent = d.getDate();

  hdr.appendChild(dow);
  hdr.appendChild(dayNum);
  colHeaders.appendChild(hdr);
  wrapper.appendChild(colHeaders);

  // All-day strip
  const allDayStrip = document.createElement("div");
  allDayStrip.className = "cal-allday-strip";
  allDayStrip.id        = "cal-allday-strip";

  const allDayGutter = document.createElement("div");
  allDayGutter.className  = "cal-allday-gutter";
  allDayGutter.textContent = "All Day";
  allDayStrip.appendChild(allDayGutter);

  const allDayCol = document.createElement("div");
  allDayCol.className    = "cal-allday-col";
  allDayCol.dataset.date = dateStr;
  allDayStrip.appendChild(allDayCol);
  wrapper.appendChild(allDayStrip);

  // Scrollable time area
  const scrollArea = document.createElement("div");
  scrollArea.className = "cal-time-scroll cal-day-scroll";

  const gutter = _buildTimeGutter();
  scrollArea.appendChild(gutter);

  const colsContainer = document.createElement("div");
  colsContainer.className = "cal-week-cols cal-day-cols";
  colsContainer.appendChild(_buildTimeColumn(dateStr, dateStr, today, false));
  scrollArea.appendChild(colsContainer);

  wrapper.appendChild(scrollArea);
  container.appendChild(wrapper);

  requestAnimationFrame(() => {
    const nowPx = nowToPixel(userTimezone, PIXELS_PER_HOUR);
    const offset = Math.max(0, nowPx - PIXELS_PER_HOUR * 2);
    scrollArea.scrollTop = offset;
  });
}

// ─────────────────────────────────────────────────────────────
// YEAR VIEW
// ─────────────────────────────────────────────────────────────

function _renderYearGrid(container) {
  const selectedDate = calendarState.getSelectedDate();
  const year         = selectedDate.getFullYear();
  const todayStr     = toDateString(new Date());
  const selectedStr  = toDateString(selectedDate);

  const wrapper = document.createElement("div");
  wrapper.className = "cal-year-wrapper";

  for (let month = 0; month < 12; month++) {
    wrapper.appendChild(_buildMiniMonth(year, month, todayStr, selectedStr));
  }

  container.appendChild(wrapper);
}

// ─────────────────────────────────────────────────────────────
// HELPERS — TIME GRID
// ─────────────────────────────────────────────────────────────

function _buildTimeGutter() {
  const gutter = document.createElement("div");
  gutter.className = "cal-time-gutter";

  for (let h = 0; h < 24; h++) {
    const label = document.createElement("div");
    label.className  = "cal-time-label";
    label.style.height = `${PIXELS_PER_HOUR}px`;

    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm   = h < 12 ? "AM" : "PM";
    label.textContent = h === 0 ? "12 AM" : `${hour12} ${ampm}`;

    gutter.appendChild(label);
  }

  return gutter;
}

function _buildTimeColumn(dateStr, selectedStr, today, isDisabled) {
  const col = document.createElement("div");
  col.className    = "cal-day-col";
  col.dataset.date = dateStr;
  col.style.height = `${TOTAL_DAY_HEIGHT}px`;
  col.style.position = "relative";

  if (dateStr === today)       col.classList.add("today");
  if (dateStr === selectedStr) col.classList.add("selected-col");
  if (isDisabled)              { col.classList.add("disabled"); col.dataset.disabled = "true"; }

  // Hour grid lines + time slots
  for (let h = 0; h < 24; h++) {
    const slot = document.createElement("div");
    slot.className    = "cal-time-slot";
    slot.dataset.time = `${String(h).padStart(2,"0")}:00`;
    slot.style.height = `${PIXELS_PER_HOUR}px`;
    col.appendChild(slot);
  }

  // Events layer (events positioned absolutely on top)
  const eventsLayer = document.createElement("div");
  eventsLayer.className = "cal-events-layer";
  eventsLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;";
  col.appendChild(eventsLayer);

  // Now-indicator line
  if (dateStr === today) {
    const nowLine = document.createElement("div");
    nowLine.className  = "cal-now-indicator";
    nowLine.style.top  = `${nowToPixel(userTimezone)}px`;
    eventsLayer.appendChild(nowLine);
  }

  return col;
}

// ─────────────────────────────────────────────────────────────
// HELPERS — MINI MONTH (year view)
// ─────────────────────────────────────────────────────────────

function _buildMiniMonth(year, month, todayStr, selectedStr) {
  const firstOfMonth = new Date(year, month, 1);
  const days         = getMonthGridDays(firstOfMonth);

  const wrapper = document.createElement("div");
  wrapper.className = "cal-year-month";

  // Month label header
  const monthHeader = document.createElement("div");
  monthHeader.className   = "cal-year-month-header";
  monthHeader.textContent = MONTH_NAMES[month];
  monthHeader.style.cursor = "pointer";
  monthHeader.addEventListener("click", () => {
    navigateToDate(new Date(year, month, 1));
    switchView("month");
  });
  wrapper.appendChild(monthHeader);

  // Day-of-week mini headers
  const dowRow = document.createElement("div");
  dowRow.className = "cal-year-dow-row";
  ["M","T","W","T","F","S","S"].forEach(d => {
    const cell = document.createElement("span");
    cell.textContent = d;
    dowRow.appendChild(cell);
  });
  wrapper.appendChild(dowRow);

  // Day cells
  const grid = document.createElement("div");
  grid.className = "cal-year-month-grid";

  days.forEach(day => {
    const dateStr    = toDateString(day);
    const isOther    = day.getMonth() !== month;
    const isToday    = dateStr === todayStr;
    const isSelected = dateStr === selectedStr;
    const isDisabled = isBeforeAccountCreation(day);

    const cell = document.createElement("div");
    cell.className    = "cal-year-day";
    cell.dataset.date = dateStr;
    cell.textContent  = day.getDate();

    if (isOther)    cell.classList.add("other-month");
    if (isToday)    cell.classList.add("today");
    if (isSelected) cell.classList.add("selected");
    if (isDisabled) { cell.classList.add("disabled"); cell.dataset.disabled = "true"; }

    // Event density slot (dots will be inserted by eventRenderer)
    const dots = document.createElement("div");
    dots.className = "cal-year-day-dots";
    cell.appendChild(dots);

    if (!isDisabled) {
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

// ─────────────────────────────────────────────────────────────
// HELPERS — DATE LIST
// ─────────────────────────────────────────────────────────────

function _buildWeekDays(startDateStr, count) {
  const days = [];
  const d    = new Date(startDateStr + "T00:00:00");
  for (let i = 0; i < count; i++) {
    days.push(toDateString(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}