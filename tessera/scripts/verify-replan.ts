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
const fujiDay = next.days[1];
fujiDay.activities = fujiDay.activities.filter((activity) => activity.id !== "mount-fuji");
fujiDay.activities.unshift({
  id: "hakone-open-air-museum",
  title: "Hakone Open-Air Museum",
  category: "culture",
  startTime: "11:00",
  durationMin: 120,
  estCostPerPerson: 28,
  rationale: "This later Hakone alternative honors Priya's veto while still giving Ravi and Mei a memorable shared experience.",
  satisfies: ["priya", "ravi", "mei"],
  tension: "Ravi gives up his Mount Fuji sunrise for a lower-intensity group activity.",
});
next.tradeoffs = [
  "Priya vetoed the pre-dawn Mount Fuji start, so the group swaps it for a later Hakone art stop; Ravi gives up the sunrise adventure.",
  "The premium vegetarian dinner remains the single planned splurge, so the revised plan stays within budget.",
];
next.budget = { ceiling: next.constraints.budgetCeiling, ...estimateBudget(next) };

const revised = validateReplannedTrip(previous, validateCommittedTrip(next));
const diff = diffTrips(previous, revised);
const request = createReplanRequest(previous, "Priya vetoes the 5:30am Mount Fuji start.");

assert.equal(request.editCommand, "Priya vetoes the 5:30am Mount Fuji start.");
assert.equal(diff.previousVersion, 1);
assert.equal(diff.nextVersion, 2);
assert.deepEqual(diff.removedActivities, [{ id: "mount-fuji", title: "Mount Fuji 5th Station sunrise" }]);
assert.deepEqual(diff.addedActivities, [{ id: "hakone-open-air-museum", title: "Hakone Open-Air Museum" }]);
assert.equal(diff.changedTradeoffs, true);
assert.equal(diff.budget.delta, 30);
console.log("Veto replan validation and before/after diff passed.");
