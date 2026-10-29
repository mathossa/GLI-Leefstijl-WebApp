// ISO-8601 week numbers for Amsterdam's Monday-based calendar weeks.
// Input is a DATE-only YYYY-MM-DD or UTC-midnight Date; never derive from browser locale.
// ISO week-year can differ from the calendar year around 1 January.
export function isoWeekInfo(input) {
  const date = typeof input === "string" ? new Date(input + "T00:00:00.000Z") : input;
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new RangeError("Invalid week date");
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - (firstThursday.getUTCDay() || 7));
  return { year, week: 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000)) };
}

export function isoWeekLabel(input) {
  const { year, week } = isoWeekInfo(input);
  return `Week ${week} · ${year}`;
}
