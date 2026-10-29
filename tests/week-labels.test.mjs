import test from "node:test";
import assert from "node:assert/strict";
import { isoWeekInfo, isoWeekLabel } from "../src/lib/week-labels.mjs";
import { amsterdamMonday } from "../src/lib/goals-domain.mjs";

test("ISO week labels use ISO week-year around New Year", () => {
  assert.deepEqual(isoWeekInfo("2020-12-28"), {year:2020,week:53});
  assert.deepEqual(isoWeekInfo("2021-01-01"), {year:2020,week:53});
  assert.deepEqual(isoWeekInfo("2021-01-04"), {year:2021,week:1});
  assert.deepEqual(isoWeekInfo("2024-12-30"), {year:2025,week:1});
  assert.deepEqual(isoWeekInfo("2026-10-26"), {year:2026,week:44});
  assert.deepEqual(isoWeekInfo("2026-12-28"), {year:2026,week:53});
  assert.equal(isoWeekLabel("2024-12-30"), "Week 1 · 2025");
});
test("Amsterdam DST boundaries resolve to matching local ISO week", () => {
  assert.equal(isoWeekLabel(amsterdamMonday(new Date("2026-03-29T22:30:00Z"))), "Week 14 · 2026");
  assert.equal(isoWeekLabel(amsterdamMonday(new Date("2026-10-25T22:30:00Z"))), "Week 43 · 2026");
});
