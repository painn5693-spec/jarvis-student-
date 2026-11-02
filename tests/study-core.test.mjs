import test from "node:test";
import assert from "node:assert/strict";
import { nextReviewAt, sumFocusMinutes } from "../public/study-core.js";

test("good review advances through the spaced intervals", () => {
  const from = new Date("2026-11-03T10:00:00.000Z");
  const first = nextReviewAt("good", 0, from);
  assert.equal(first.days, 3);
  assert.equal(first.intervalIndex, 1);
  assert.equal(first.dueAt, "2026-11-06T10:00:00.000Z");

  const second = nextReviewAt("good", first.intervalIndex, from);
  assert.equal(second.days, 7);
  assert.equal(second.intervalIndex, 2);
});

test("again resets the review interval to one day", () => {
  const result = nextReviewAt("again", 4, new Date("2026-11-03T10:00:00.000Z"));
  assert.equal(result.days, 1);
  assert.equal(result.intervalIndex, 0);
  assert.equal(result.dueAt, "2026-11-04T10:00:00.000Z");
});

test("easy advances by two intervals and caps at the maximum", () => {
  const result = nextReviewAt("easy", 0, new Date("2026-11-03T10:00:00.000Z"));
  assert.equal(result.days, 7);
  assert.equal(result.intervalIndex, 2);
  assert.equal(nextReviewAt("easy", 5, new Date("2026-11-03T10:00:00.000Z")).days, 60);
});

test("review scheduler rejects unknown grades and invalid dates", () => {
  assert.throws(() => nextReviewAt("maybe", 0), TypeError);
  assert.throws(() => nextReviewAt("good", 0, new Date("invalid")), TypeError);
});

test("weekly focus aggregation includes only valid focus sessions in range", () => {
  const sessions = [
    { mode: "focus", minutes: 25, completedAt: "2026-11-01T10:00:00.000Z" },
    { mode: "break", minutes: 15, completedAt: "2026-11-02T10:00:00.000Z" },
    { mode: "focus", minutes: 45, completedAt: "2026-11-02T11:00:00.000Z" },
    { mode: "focus", minutes: -4, completedAt: "2026-11-02T12:00:00.000Z" },
    { mode: "focus", minutes: 80, completedAt: "2026-11-04T10:00:00.000Z" },
    { mode: "focus", minutes: 30, completedAt: "not-a-date" },
  ];
  const total = sumFocusMinutes(sessions, new Date("2026-11-02T00:00:00.000Z"), new Date("2026-11-03T00:00:00.000Z"));
  assert.equal(total, 45);
});

test("focus aggregation handles invalid ranges", () => {
  assert.throws(() => sumFocusMinutes([], "bad", new Date()), TypeError);
  assert.throws(() => sumFocusMinutes([], new Date("2026-11-04"), new Date("2026-11-03")), TypeError);
});
