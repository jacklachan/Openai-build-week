import assert from "node:assert/strict";

import seedTrip from "../data/seed-demo-trip.json";
import { estimateBudget } from "../lib/budget";
import { parseTrip, validateCommittedTrip } from "../lib/plan-validation";
import {
  createReplanRequest,
  diffTrips,
  validateReplannedTrip,
} from "../lib/replan";

const previous = validateCommittedTrip(parseTrip(seedTrip));
const next = structuredClone(previous);
next.version += 1;
const hikeDay = next.days[1];
hikeDay.activities = hikeDay.activities.filter((activity) => activity.id !== "mount-takao");
hikeDay.activities.unshift({
  id: "teamlab-planets",
  title: "teamLab Planets",
  category: "city",
  startTime: "11:00",
  durationMin: 120,
  estCostPerPerson: 28,
  rationale: "This late, mostly indoor alternative honors Priya's veto while still giving Ravi and Mei a memorable shared experience.",
  satisfies: ["priya", "ravi", "mei"],
  tension: "Ravi gives up his Mount Takao hike for a lower-intensity group activity.",
});
next.tradeoffs = [
  "Priya vetoed the early Mount Takao hike, so the group swaps it for a late teamLab visit; Ravi gives up the adventure day.",
  "The premium vegetarian dinner remains the single planned splurge, so the revised plan stays within budget.",
];
next.budget = { ceiling: next.constraints.budgetCeiling, ...estimateBudget(next) };

const revised = validateReplannedTrip(previous, validateCommittedTrip(next));
const diff = diffTrips(previous, revised);
const request = createReplanRequest(previous, "Priya vetoes the 6am Mount Takao hike.");

assert.equal(request.editCommand, "Priya vetoes the 6am Mount Takao hike.");
assert.equal(diff.previousVersion, 1);
assert.equal(diff.nextVersion, 2);
assert.deepEqual(diff.removedActivities, [{ id: "mount-takao", title: "Mount Takao summit trail" }]);
assert.deepEqual(diff.addedActivities, [{ id: "teamlab-planets", title: "teamLab Planets" }]);
assert.equal(diff.changedTradeoffs, true);
assert.equal(diff.budget.delta, 48);
console.log("Veto replan validation and before/after diff passed.");
