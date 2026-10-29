// Pure domain rules, shared by server actions and Node's built-in test runner.
// No health data, auth credentials, or external dependencies.
export const GOAL_AREAS = [
  { value: "BEWEGING", label: "Beweging" },
  { value: "VOEDING", label: "Voeding" },
  { value: "SLAAP", label: "Slaap" },
  { value: "ONTSPANNING", label: "Ontspanning" },
  { value: "SOCIAAL", label: "Sociaal" },
  { value: "ANDERS", label: "Anders" },
];
export const MAX_ACTIVE_GOALS = 20;
export const MAX_ACTIVE_ACTIONS = 12;

export class FormInputError extends Error {
  constructor() { super("Ongeldige invoer of item niet beschikbaar"); this.name = "FormInputError"; }
}

/** @param {FormData} form @param {string} key */
function field(form, key) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** @param {string} value @param {number} max @param {boolean} [required] */
function bounded(value, max, required = true) {
  if (value.length > max || (required && value.length === 0)) throw new FormInputError();
  return value;
}

/** @param {string} value */
function dateInput(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FormInputError();
  const date = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new FormInputError();
  }
  return date;
}

/** @param {FormData} form */
export function parseGoalForm(form) {
  const title = bounded(field(form, "title"), 120);
  const motivation = bounded(field(form, "motivation"), 1000, false);
  const area = field(form, "area");
  if (!GOAL_AREAS.some((item) => item.value === area)) throw new FormInputError();
  const startDate = dateInput(field(form, "startDate"));
  const endDate = dateInput(field(form, "endDate"));
  if (startDate && endDate && endDate < startDate) throw new FormInputError();
  return { title, motivation, area, startDate, endDate };
}

/** @param {FormData} form */
export function parseActionForm(form) {
  const title = bounded(field(form, "title"), 120);
  const raw = field(form, "targetPerWeek");
  if (!/^[1-7]$/.test(raw)) throw new FormInputError();
  return { title, targetPerWeek: Number(raw) };
}

/** @param {FormData} form @param {number} target */
export function parseProgressForm(form, target) {
  const raw = field(form, "completedCount");
  if (!/^(0|[1-7])$/.test(raw)) throw new FormInputError();
  const completedCount = Number(raw);
  if (!Number.isInteger(target) || completedCount > target) throw new FormInputError();
  return { completedCount, note: bounded(field(form, "note"), 500, false) || null };
}

/** Use the local DATE in Amsterdam rather than UTC day/week boundaries.
 *  DATE columns are stored as UTC-midnight values, not as local instants.
 *  @param {Date} [instant]
 */
export function amsterdamMonday(instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const get = (key) => Number(parts.find((part) => part.type === key)?.value);
  const day = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day;
}

/** @param {string} userId @param {string} id */
export function ownedWhere(userId, id) {
  if (!userId || !id || id.length > 128) throw new FormInputError();
  return { id, userId };
}

// Optional reflection on one logged occurrence; recording itself is one tap.
export const ENTRY_RATINGS = [
  { value: "GOED", label: "Ging goed" },
  { value: "REDELIJK", label: "Ging redelijk" },
  { value: "LASTIG", label: "Was lastig" },
];

/** @param {FormData} form */
export function parseEntryFeedback(form) {
  const rating = field(form, "rating");
  if (rating && !ENTRY_RATINGS.some((item) => item.value === rating)) throw new FormInputError();
  return { rating: rating || null, note: bounded(field(form, "note"), 500, false) || null };
}
