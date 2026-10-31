import test from "node:test";
import assert from "node:assert/strict";
import {
  addCalendarDays, amsterdamToday, calendarCells, monthFromIso, shiftMonth,
} from "../src/lib/goal-calendar-dates.mjs";

test("calendar always emits valid ISO days with a Monday-first grid", () => {
  const october = calendarCells(2026, 10);
  assert.equal(october[0].iso, "2026-09-28");
  assert.equal(october[0].inMonth, false);
  assert.equal(october[3].iso, "2026-10-01");
  assert.equal(october[3].inMonth, true);
  assert.equal(october.at(-1).iso, "2026-11-01");
  assert.equal(october.length % 7, 0);
  const feb = calendarCells(2028, 2);
  assert.equal(feb.find((cell) => cell.iso === "2028-02-29")?.day, 29);
  assert.equal(feb.filter((cell) => cell.inMonth).length, 29);
});

test("calendar navigation handles year boundaries and leap days", () => {
  assert.deepEqual(monthFromIso("2026-10-28"), {year: 2026, month: 10});
  assert.deepEqual(shiftMonth(2026, 12, 1), {year: 2027, month: 1});
  assert.deepEqual(shiftMonth(2026, 1, -1), {year: 2025, month: 12});
  assert.equal(addCalendarDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addCalendarDays("2026-11-01", -1), "2026-10-31");
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.throws(() => monthFromIso("2026-02-30"), RangeError);
  assert.throws(() => calendarCells(2026, 13), RangeError);
});

test("today is based on Europe/Amsterdam during both DST transitions", () => {
  assert.equal(amsterdamToday(new Date("2026-03-29T22:30:00Z")), "2026-03-30");
  assert.equal(amsterdamToday(new Date("2026-10-25T22:30:00Z")), "2026-10-25");
  assert.equal(amsterdamToday(new Date("2026-10-25T23:30:00Z")), "2026-10-26");
});
