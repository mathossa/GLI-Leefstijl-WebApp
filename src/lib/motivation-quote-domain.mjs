// Pure helpers kept free of Next.js/Prisma so they can be tested with node --test.
const amsterdamFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
});

export function amsterdamDayKey(instant = new Date()) {
  const fields = Object.fromEntries(
    amsterdamFormatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function pickDailyQuote(quotes, recentIds, dayKey) {
  if (!quotes.length) return null;
  // No reuse until every active quote has appeared in the recent rotation.
  const seen = new Set(recentIds.filter(Boolean));
  const unused = quotes.filter((quote) => !seen.has(quote.id));
  const pool = unused.length ? unused : quotes;
  const dayNumber = Date.parse(`${dayKey}T00:00:00.000Z`) / 86400000;
  if (!Number.isInteger(dayNumber)) throw new Error("Invalid Amsterdam calendar date");
  const index = ((dayNumber % pool.length) + pool.length) % pool.length;
  return pool[index];
}
