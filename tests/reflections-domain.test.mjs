import test from "node:test";
import assert from "node:assert/strict";
import {
  amsterdamDate, dateOnly, parseDate, parseMeeting, MeetingInputError, parseOwnedId,
  parseReflection, parseReflectionWeek, summarizeCompletion,
} from "../src/lib/reflections-domain.mjs";

function form(data) {
  const result = new FormData();
  for (const [key, value] of Object.entries(data)) result.set(key, value);
  return result;
}

test("Amsterdam calendar date around midnight and DST", () => {
  assert.equal(amsterdamDate(new Date("2026-03-29T22:30:00Z")), "2026-03-30");
  assert.equal(amsterdamDate(new Date("2026-10-25T22:30:00Z")), "2026-10-25");
  assert.equal(dateOnly(parseDate("2026-10-26")), "2026-10-26");
  assert.throws(() => parseDate("2026-02-30"));
});

test("reflections accept this and past Mondays, reject future and non-Monday", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  assert.equal(dateOnly(parseReflectionWeek("2026-10-26", now)), "2026-10-26");
  assert.equal(dateOnly(parseReflectionWeek("2026-10-19", now)), "2026-10-19");
  assert.throws(() => parseReflectionWeek("2026-11-02", now));
  assert.throws(() => parseReflectionWeek("2026-10-27", now));
  assert.throws(() => parseReflectionWeek("2025-01-06", now));
});

test("reflections allow one answer, not empty or oversized text", () => {
  assert.equal(parseReflection(form({ wentWell: " Ging goed ", difficult: "", nextStep: "" })).wentWell, "Ging goed");
  assert.throws(() => parseReflection(form({ wentWell: " ", difficult: " ", nextStep: " " })));
  assert.throws(() => parseReflection(form({ wentWell: "x".repeat(1501) })));
});

test("meetings require title but allow photo-only notes, dates validated", () => {
  assert.deepEqual(parseMeeting(form({
    title: " Groep 1 ", notes: " Een goede ontmoeting ", meetingDate: "2026-10-26", actionPoints: " ",
  })), {
    title: "Groep 1", notes: "Een goede ontmoeting", meetingDate: new Date("2026-10-26T00:00:00.000Z"), actionPoints: null,
  });
  assert.equal(parseMeeting(form({ title: "Groep", notes: "", meetingDate: "2026-10-26" })).notes, "");
  // Historical meeting notes must be accepted, independent of the current date.
  assert.equal(dateOnly(parseMeeting(form({
    title: "CooL bijeenkomst 1", notes: "Waardevolle les", meetingDate: "2023-06-15",
  })).meetingDate), "2023-06-15");
  // A missing title, not the historical date, is what makes this invalid.
  assert.throws(() => parseMeeting(form({
    title: "", notes: "Dit wil ik niet kwijt", meetingDate: "2023-06-15",
  })), (error) => error instanceof MeetingInputError && error.field === "title");
  assert.throws(() => parseMeeting(form({ title: "Groep", notes: "x", meetingDate: "2026-02-30" })),
    (error) => error instanceof MeetingInputError && error.field === "meetingDate");
  assert.throws(() => parseMeeting(form({
    title: "CooL", notes: "wat ik heb geleerd", meetingDate: "28 okt 2026",
  })), (error) => error instanceof MeetingInputError && error.field === "meetingDate");
  assert.throws(() => parseMeeting(form({
    title: "CooL", notes: "x".repeat(4001), meetingDate: "2026-10-28",
  })), (error) => error instanceof MeetingInputError && error.field === "notes");
  assert.throws(() => parseMeeting(form({
    title: "CooL", notes: "Test", actionPoints: "x".repeat(2001), meetingDate: "2026-10-28",
  })), (error) => error instanceof MeetingInputError && error.field === "actionPoints");
  assert.throws(() => parseOwnedId(form({ id: "" })));
});

test("completion percentage uses recorded targets, not empty weeks as zero", () => {
  assert.deepEqual(summarizeCompletion([]), { completed: 0, target: 0, percentage: null });
  assert.deepEqual(summarizeCompletion([
    { completedCount: 2, targetCount: 3 }, { completedCount: 2, targetCount: 5 },
  ]), { completed: 4, target: 8, percentage: 50 });
  assert.throws(() => summarizeCompletion([{ completedCount: 8, targetCount: 3 }]));
});
