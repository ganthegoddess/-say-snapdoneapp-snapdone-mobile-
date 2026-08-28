/**
 * Date-only values (YYYY-MM-DD) represent a calendar day, not midnight UTC.
 *
 * JavaScript parses `new Date("2026-08-31")` as UTC midnight, which renders as
 * August 30 in US time zones west of UTC. Keep date-only values local at noon
 * for display, comparison, notifications, and calendar creation instead.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnly(value?: string | null): value is string {
  return typeof value === "string" && DATE_ONLY.test(value);
}

/**
 * Parse a memory date without moving a YYYY-MM-DD value across a time zone.
 * Noon is deliberate: it is safely inside the intended local calendar day on
 * DST boundaries, unlike a UTC-midnight parse.
 */
export function parseMemoryDate(value: string): Date {
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);

    // Regression guard: never silently normalize an invalid YYYY-MM-DD into a
    // different day/month/year (e.g. 2026-08-32 → September 1).
    if (
      localDate.getFullYear() !== year ||
      localDate.getMonth() !== month - 1 ||
      localDate.getDate() !== day
    ) {
      throw new RangeError(`Invalid calendar date: ${value}`);
    }
    return localDate;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new RangeError(`Invalid memory date: ${value}`);
  }
  return timestamp;
}

export function formatMemoryDate(
  value: string,
  options: Intl.DateTimeFormatOptions
): string {
  return parseMemoryDate(value).toLocaleDateString(undefined, options);
}

/** Date-only values have no user-selected time, so never invent one in UI. */
export function formatMemoryTime(
  value: string,
  options: Intl.DateTimeFormatOptions
): string | null {
  if (isDateOnly(value)) return null;
  return parseMemoryDate(value).toLocaleTimeString(undefined, options);
}

export function isSameLocalCalendarDay(value: string, comparedWith: Date): boolean {
  const date = parseMemoryDate(value);
  return (
    date.getFullYear() === comparedWith.getFullYear() &&
    date.getMonth() === comparedWith.getMonth() &&
    date.getDate() === comparedWith.getDate()
  );
}

/** A date-only memory becomes overdue only after its local calendar day ends. */
export function isMemoryOverdue(value: string, now = new Date()): boolean {
  if (isDateOnly(value)) {
    const due = parseMemoryDate(value);
    return (
      due.getFullYear() < now.getFullYear() ||
      (due.getFullYear() === now.getFullYear() && due.getMonth() < now.getMonth()) ||
      (due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() < now.getDate())
    );
  }
  return parseMemoryDate(value) < now;
}
