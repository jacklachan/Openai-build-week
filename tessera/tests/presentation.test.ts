import assert from "node:assert/strict";
import test from "node:test";
import seedTrip from "../data/seed-demo-trip.json";
import {
  formatTravelerConflict,
  getActivityTone,
  getBudgetState,
  getTimelineDays,
  getTravelerTone,
} from "../components/presentation";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("tension has precedence over satisfied activity state", () => {
  const activity = trip.days[1]!.activities[0]!;

  assert.equal(getActivityTone(activity), "tension");
  assert.equal(getTravelerTone(trip, "priya"), "tension");
  assert.equal(getTravelerTone(trip, "mei"), "satisfied");
});

test("budget without a ceiling is neutral", () => {
  assert.deepEqual(getBudgetState({ total: 870, lines: [] }), { kind: "neutral" });
});

test("budget states use the supplied ceiling", () => {
  assert.deepEqual(getBudgetState({ ceiling: 100, total: 89, lines: [] }), {
    delta: 11,
    kind: "verify",
    ratio: 89,
  });
  assert.deepEqual(getBudgetState({ ceiling: 100, total: 90, lines: [] }), {
    delta: 10,
    kind: "warn",
    ratio: 90,
  });
  assert.deepEqual(getBudgetState({ ceiling: 100, total: 125, lines: [] }), {
    delta: -25,
    kind: "signal",
    ratio: 100,
  });
});

test("timeline controls derive from every supplied day", () => {
  const fiveDayTrip = { ...trip, days: [...trip.days, { ...trip.days[0]!, day: 5 }] };

  assert.deepEqual(
    getTimelineDays(fiveDayTrip).map((item) => item.label),
    ["D01", "D02", "D03", "D04", "D05"],
  );
});

test("formats Ravi's existing traveler conflict summary", () => {
  assert.equal(
    formatTravelerConflict(trip.travelers[0]!),
    "$1,500 contribution · packed pace · adventure",
  );
});
