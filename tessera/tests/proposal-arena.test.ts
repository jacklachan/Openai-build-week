import assert from "node:assert/strict";
import test from "node:test";

import seedTrip from "../data/seed-demo-trip.json";
import { getProposalOptions } from "../lib/proposal-arena";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("creates three genuinely different, deterministic negotiation proposals", () => {
  const proposals = getProposalOptions(trip);
  const fairness = proposals.find((proposal) => proposal.id === "fairness");
  const pace = proposals.find((proposal) => proposal.id === "pace");
  const budget = proposals.find((proposal) => proposal.id === "budget");

  assert.equal(proposals.length, 3);
  assert.ok(fairness && pace && budget);
  assert.ok(fairness.trip.days.flatMap((day) => day.activities).some((activity) => activity.id === "mount-takao"));
  assert.ok(pace.trip.days.flatMap((day) => day.activities).some((activity) => activity.title === "teamLab Planets"));
  assert.ok(!pace.trip.days.flatMap((day) => day.activities).some((activity) => activity.id === "mount-takao"));
  assert.ok(budget.trip.days.flatMap((day) => day.activities).some((activity) => activity.title === "Local vegetarian set dinner"));
  assert.ok(budget.trip.budget.total < fairness.trip.budget.total);
  assert.ok(pace.scores.pace > fairness.scores.pace);
  assert.ok(budget.scores.budget > fairness.scores.budget);
});
