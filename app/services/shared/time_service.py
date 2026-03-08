"""
services/shared/time_service.py

THE single authoritative location for all time-related operations.
Nothing in the calendar may convert, compare, or manipulate datetimes
without going through this file.

Uses zoneinfo (Python 3.9+). Install backports.zoneinfo for older Python.
"""

import calendar as cal_module
from datetime import datetime, timezone, date as date_type
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError



# ─────────────────────────────────────────────────────────────
# CORE CONVERSIONS
# ─────────────────────────────────────────────────────────────

def local_to_utc(dt_string: str, timezone_str: str) -> datetime:
    """
    Convert a local datetime string + IANA timezone to a UTC-aware datetime.
    Handles DST correctly. For ambiguous times (DST fallback), uses post-transition
    interpretation (fold=0 which is standard behavior).

    Args:
        dt_string: ISO 8601 string, e.g. "2026-01-22T09:00:00"
        timezone_str: IANA timezone string, e.g. "America/New_York"

    Returns:
        UTC-aware datetime
    """
    tz = ZoneInfo(timezone_str)

    if isinstance(dt_string, str):
        dt = datetime.fromisoformat(dt_string)
    else:
        dt = dt_string

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    else:
        dt = dt.astimezone(tz)

    return dt.astimezone(timezone.utc)


def utc_to_local(utc_dt: datetime, timezone_str: str) -> datetime:
    """
    Convert a UTC datetime to the user's local timezone.

    Args:
        utc_dt: UTC-aware (or naive, treated as UTC) datetime
        timezone_str: IANA timezone string

    Returns:
        Timezone-aware datetime in the user's local timezone
    """
    tz = ZoneInfo(timezone_str)

    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)

    return utc_dt.astimezone(tz)


# ─────────────────────────────────────────────────────────────
# DAY BOUNDARIES
# Critical: these return TRUE local midnight, not UTC midnight.
# A user in UTC-5: midnight Jan 22 → 05:00 UTC
# ─────────────────────────────────────────────────────────────

def start_of_day(date_input, timezone_str: str) -> datetime:
    """
    Return midnight of the given date in the user's timezone, as UTC.

    Args:
        date_input: date, datetime, or ISO date string (YYYY-MM-DD)
        timezone_str: IANA timezone string

    Returns:
        UTC-aware datetime representing local midnight
    """
    tz = ZoneInfo(timezone_str)
    d = _to_date(date_input)
    local_midnight = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=tz)
    return local_midnight.astimezone(timezone.utc)


def end_of_day(date_input, timezone_str: str) -> datetime:
    """
    Return 23:59:59 of the given date in the user's timezone, as UTC.
    """
    tz = ZoneInfo(timezone_str)
    d = _to_date(date_input)
    local_end = datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=tz)
    return local_end.astimezone(timezone.utc)


# ─────────────────────────────────────────────────────────────
# RANGE HELPERS
# ─────────────────────────────────────────────────────────────

def month_range(year: int, month: int, timezone_str: str):
    """
    Return (start_utc, end_utc) for an entire calendar month in the given timezone.

    Returns:
        Tuple of (start_utc, end_utc) as UTC-aware datetimes
    """
    tz = ZoneInfo(timezone_str)
    last_day = cal_module.monthrange(year, month)[1]

    start = datetime(year, month, 1, 0, 0, 0, tzinfo=tz)
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=tz)

    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def start_of_month(year: int, month: int, timezone_str: str) -> datetime:
    start, _ = month_range(year, month, timezone_str)
    return start


def start_of_week(date_input, timezone_str: str) -> datetime:
    """Return Monday of the week containing the given date, as UTC midnight."""
    d = _to_date(date_input)
    days_back = d.weekday()  # Monday = 0
    monday = d.__class__(d.year, d.month, d.day) - __import__('datetime').timedelta(days=days_back)
    return start_of_day(monday, timezone_str)


# ─────────────────────────────────────────────────────────────
# DISPLAY FORMATTING
# ─────────────────────────────────────────────────────────────

def format_for_display(utc_dt: datetime, timezone_str: str) -> str:
    """Return a human-readable string in the user's local timezone."""
    local_dt = utc_to_local(utc_dt, timezone_str)
    return local_dt.strftime("%B %d, %Y at %I:%M %p")


def is_valid_timezone(timezone_str: str) -> bool:
    """Return True if the timezone string is a valid IANA timezone."""
    try:
        ZoneInfo(timezone_str)
        return True
    except (ZoneInfoNotFoundError, KeyError):
        return False


# ─────────────────────────────────────────────────────────────
# PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────

def _to_date(value):
    """Normalize various inputs to a date object."""
    if isinstance(value, str):
        return datetime.fromisoformat(value).date()
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date_type):
        return value
    raise TypeError(f"Cannot convert {type(value)} to date")