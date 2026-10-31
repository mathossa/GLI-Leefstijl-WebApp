import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { amsterdamDayKey, pickDailyQuote } from "../src/lib/motivation-quote-domain.mjs";

test("day changes at midnight in Amsterdam, not UTC", () => {
  assert.equal(amsterdamDayKey(new Date("2026-03-28T22:59:59Z")), "2026-03-28");
  assert.equal(amsterdamDayKey(new Date("2026-03-28T23:00:00Z")), "2026-03-29");
  assert.equal(amsterdamDayKey(new Date("2026-10-24T21:59:59Z")), "2026-10-24");
  assert.equal(amsterdamDayKey(new Date("2026-10-24T22:00:00Z")), "2026-10-25");
  assert.equal(amsterdamDayKey(new Date("2026-10-25T01:30:00Z")), "2026-10-25");
  assert.equal(amsterdamDayKey(new Date("2026-10-25T23:00:00Z")), "2026-10-26");
});

test("selection is repeatable, then rotates through 30 before reusing", () => {
  const quotes = Array.from({ length: 30 }, (_, index) => ({ id: `q-${index}`, text: `Tekst ${index}` }));
  const previous = [];
  const choices = [];
  for (let n = 0; n < 65; n++) {
    const dayKey = new Date(Date.UTC(2026, 9, 1 + n)).toISOString().slice(0, 10);
    const recent = previous.slice(-29).reverse();
    const chosen = pickDailyQuote(quotes, recent, dayKey);
    assert.deepEqual(pickDailyQuote(quotes, recent, dayKey), chosen);
    choices.push(chosen.id);
    previous.push(chosen.id);
  }
  for (let n = 0; n <= 35; n++) {
    assert.equal(new Set(choices.slice(n, n + 30)).size, 30);
  }
  assert.equal(pickDailyQuote([], [], "2026-10-31"), null);
});

test("starter SQL contains 30 distinct, short local quotes", () => {
  const sql = readFileSync(new URL("../prisma/migrations/20261031_motivation_quotes_mvp/migration.sql", import.meta.url), "utf8");
  const lines = [...sql.matchAll(/\('starter-\d{3}', '((?:[^']|'')*)', '[A-Z_]+'\)/g)];
  assert.equal(lines.length, 30);
  const copy = lines.map((match) => match[1].replaceAll("''", "'"));
  assert.equal(new Set(copy.map((text) => text.toLowerCase())).size, 30);
  assert.ok(copy.every((text) => text.length <= 150 && text.length >= 20));
});
