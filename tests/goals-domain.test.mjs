import test from "node:test";
import assert from "node:assert/strict";
import {
  amsterdamMonday, FormInputError, MAX_ACTIVE_ACTIONS, MAX_ACTIVE_GOALS,
  ownedWhere, parseActionForm, parseGoalForm, parseProgressForm, parseEntryFeedback,
} from "../src/lib/goals-domain.mjs";

const form = (values) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, String(value));
  return data;
};

test("malformed optional fields cannot silently erase stored answers", () => {
  for (const field of ["motivation", "progressIndicator", "startDate"]) {
    const data = new FormData();
    data.set("title", "Fictief doel");
    data.set("area", "SLAAP");
    data.set(field, new Blob(["not text"]), "invalid.txt");
    assert.throws(() => parseGoalForm(data), FormInputError);
  }
  for (const value of [null, 12, {}, []]) {
    assert.throws(() => ownedWhere("user-a", value), FormInputError);
  }
});
const goal = (overrides = {}) => form({
  title: "Een rustig ochtendritme", motivation: "Meer ruimte voor mezelf",
  area: "SLAAP", startDate: "", endDate: "", ...overrides,
});
const week = (date) => amsterdamMonday(new Date(date)).toISOString().slice(0, 10);

test("Amsterdam calendar weeks reset on Monday, never on UTC midnight", () => {
  assert.equal(week("2026-10-25T22:30:00Z"), "2026-10-19"); // Sunday in Amsterdam
  assert.equal(week("2026-10-25T23:30:00Z"), "2026-10-26"); // Monday 00:30 CET
  assert.equal(week("2026-03-29T21:30:00Z"), "2026-03-23"); // Sunday during DST
  assert.equal(week("2026-03-29T22:30:00Z"), "2026-03-30"); // Monday 00:30 CEST
  assert.equal(week("2027-01-03T12:00:00Z"), "2026-12-28"); // Cross-year
});

test("goal validation: title, motivation, area and optional dates", () => {
  const valid = parseGoalForm(goal({ startDate: "2026-10-28", endDate: "2026-12-01" }));
  assert.equal(valid.area, "SLAAP");
  assert.equal(parseGoalForm(goal({ motivation: "" })).motivation, "");
  assert.equal(valid.startDate.toISOString(), "2026-10-28T00:00:00.000Z");
  assert.throws(() => parseGoalForm(goal({ title: "" })), FormInputError);
  assert.throws(() => parseGoalForm(goal({ motivation: "x".repeat(1001) })), FormInputError);
  assert.throws(() => parseGoalForm(goal({ area: "ONGELDIG" })), FormInputError);
  assert.throws(() => parseGoalForm(goal({ startDate: "2026-02-30" })), FormInputError);
  assert.throws(() => parseGoalForm(goal({ startDate: "2026-11-03", endDate: "2026-11-02" })), FormInputError);
});

test("action and progress limits cannot be bypassed by invalid form values", () => {
  assert.equal(MAX_ACTIVE_GOALS, 20);
  assert.equal(MAX_ACTIVE_ACTIONS, 12);
  assert.equal(parseActionForm(form({ title: "Wandelen", targetPerWeek: 7 })).targetPerWeek, 7);
  for (const bad of ["0", "8", "2.5", "-1", "NaN"]) {
    assert.throws(() => parseActionForm(form({ title: "Wandelen", targetPerWeek: bad })), FormInputError);
  }
  assert.deepEqual(parseProgressForm(form({ completedCount: 2, note: " Het ging prettig " }), 3),
    { completedCount: 2, note: "Het ging prettig" });
  assert.throws(() => parseProgressForm(form({ completedCount: 4, note: "" }), 3), FormInputError);
  assert.throws(() => parseProgressForm(form({ completedCount: 1, note: "x".repeat(501) }), 3), FormInputError);
});

test("ownership predicates always include authenticated userId", () => {
  assert.deepEqual(ownedWhere("user-A", "goal-1"), { id: "goal-1", userId: "user-A" });
  assert.notDeepEqual(ownedWhere("user-A", "goal-1"), ownedWhere("user-B", "goal-1"));
  assert.throws(() => ownedWhere("", "goal-1"), FormInputError);
  assert.throws(() => ownedWhere("user-A", ""), FormInputError);
});

test("individual completion feedback is optional, bounded and validated", () => {
  assert.deepEqual(parseEntryFeedback(form({ rating: "", note: "" })), { rating: null, note: null });
  assert.deepEqual(parseEntryFeedback(form({ rating: "GOED", note: "Rustig verlopen" })), { rating: "GOED", note: "Rustig verlopen" });
  assert.throws(() => parseEntryFeedback(form({ rating: "ONBEKEND" })), FormInputError);
  assert.throws(() => parseEntryFeedback(form({ note: "x".repeat(501) })), FormInputError);
});

test("optional goal outcome and action plan parse safely for quick and guided forms", () => {
  assert.equal(parseGoalForm(goal()).progressIndicator, null);
  assert.equal(parseGoalForm(goal({ progressIndicator: "  Ik slaap beter  " })).progressIndicator, "Ik slaap beter");
  assert.throws(() => parseGoalForm(goal({ progressIndicator: "x".repeat(501) })), FormInputError);
  const quick = parseActionForm(form({title:"Wandelen", targetPerWeek: 3}));
  assert.deepEqual([quick.confidenceScore, quick.whenContext, quick.fallbackPlan], [null, null, null]);
  const guided = parseActionForm(form({
    title: "Wandelen", targetPerWeek: 3, whenContext: " Na het eten ",
    confidenceScore: "6", existingStrength: "Ik wandel graag", confidenceBooster: "Met een vriend",
    obstacle: "Regen", fallbackPlan: "Even binnen bewegen",
  }));
  assert.equal(guided.confidenceScore, 6);
  assert.equal(guided.whenContext, "Na het eten");
  assert.equal(guided.fallbackPlan, "Even binnen bewegen");
  for (const bad of ["0","11","3.5","NaN","-2","6x"]) {
    assert.throws(() => parseActionForm(form({title:"Wandelen",targetPerWeek:3,confidenceScore:bad})), FormInputError);
  }
  for (const score of ["1", "10", ""]) {
    assert.equal(parseActionForm(form({title:"Wandelen",targetPerWeek:3,confidenceScore:score})).confidenceScore, score ? Number(score) : null);
  }
  assert.throws(() => parseActionForm(form({title:"Wandelen",targetPerWeek:3,fallbackPlan:"x".repeat(501)})), FormInputError);
});
