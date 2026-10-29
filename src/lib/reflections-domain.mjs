// Small pure input/date helpers shared by forms and Node's built-in tests.
// Reuses issue #4's timezone calculations and validation error.
import { amsterdamMonday, FormInputError } from "./goals-domain.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
export const REFLECTION_HISTORY_WEEKS = 52;

function textField(form, name, max, required = false) {
  const raw = form.get(name);
  if (raw !== null && typeof raw !== "string") throw new FormInputError();
  const value = (raw ?? "").trim();
  if (value.length > max || (required && !value)) throw new FormInputError();
  return value;
}

export function parseDate(raw) {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new FormInputError();
  const date = new Date(raw + "T00:00:00.000Z");
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== raw) throw new FormInputError();
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) throw new FormInputError();
  return date;
}

export function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

/** Get the date part in Europe/Amsterdam, not a UTC date with a local offset. */
export function amsterdamDate(instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const value = (key) => parts.find((p) => p.type === key)?.value;
  return value("year") + "-" + value("month") + "-" + value("day");
}

export function parseReflectionWeek(raw, now = new Date()) {
  const date = parseDate(raw);
  if (date.getUTCDay() !== 1) throw new FormInputError();
  const current = amsterdamMonday(now);
  const diff = Math.round((current.getTime() - date.getTime()) / DAY_MS / 7);
  if (diff < 0 || diff >= REFLECTION_HISTORY_WEEKS) throw new FormInputError();
  return date;
}

export function parseReflection(form) {
  const wentWell = textField(form, "wentWell", 1500);
  const difficult = textField(form, "difficult", 1500);
  const nextStep = textField(form, "nextStep", 1500);
  if (!(wentWell || difficult || nextStep)) throw new FormInputError();
  return { wentWell, difficult, nextStep };
}

export function parseMeeting(form) {
  return {
    meetingDate: parseDate(textField(form, "meetingDate", 10, true)),
    title: textField(form, "title", 120, true),
    notes: textField(form, "notes", 4000),
    actionPoints: textField(form, "actionPoints", 2000) || null,
  };
}

export function parseOwnedId(form) {
  return textField(form, "id", 128, true);
}

// Only registered weeks are included: an empty week means "no data", NOT "0%".
export function summarizeCompletion(progressRows) {
  let completed = 0;
  let target = 0;
  for (const row of progressRows) {
    if (!Number.isInteger(row.completedCount) || !Number.isInteger(row.targetCount)
        || row.targetCount <= 0 || row.completedCount < 0 || row.completedCount > row.targetCount) {
      throw new FormInputError();
    }
    completed += row.completedCount;
    target += row.targetCount;
  }
  return { completed, target, percentage: target ? Math.round(100 * completed / target) : null };
}
