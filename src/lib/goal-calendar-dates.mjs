// Pure, DST-safe calendar helpers for the compact mobile goal date picker.
// Date strings are calendar days, never local instants.
const iso = (date) => date.toISOString().slice(0, 10);

export function amsterdamToday(instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const get = (key) => parts.find((part) => part.type === key)?.value;
  return [get("year"), get("month"), get("day")].join("-");
}

export function monthFromIso(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new RangeError("Invalid calendar date");
  const date = new Date(dateText + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || iso(date) !== dateText) throw new RangeError("Invalid calendar date");
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function shiftMonth(year, month, offset) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(offset) ||
      month < 1 || month > 12 || year < 1900 || year > 2200) throw new RangeError("Invalid calendar month");
  const next = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

export function addCalendarDays(dateText, offset) {
  if (!Number.isInteger(offset)) throw new RangeError("Invalid day offset");
  const {year, month} = monthFromIso(dateText);
  const day = Number(dateText.slice(8, 10));
  return iso(new Date(Date.UTC(year, month - 1, day + offset)));
}

export function calendarCells(year, month) {
  if (!Number.isInteger(year) || !Number.isInteger(month) ||
      month < 1 || month > 12 || year < 1900 || year > 2200) throw new RangeError("Invalid calendar month");
  const first = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const monthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const length = Math.ceil((mondayOffset + monthDays) / 7) * 7;
  return Array.from({ length }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index - mondayOffset + 1));
    return { iso: iso(date), day: date.getUTCDate(), inMonth: date.getUTCMonth() === month - 1 };
  });
}
