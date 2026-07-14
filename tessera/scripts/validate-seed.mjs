import { readFile } from "node:fs/promises";

const trip = JSON.parse(
  await readFile(new URL("../data/seed-demo-trip.json", import.meta.url), "utf8"),
);

const requiredTripKeys = [
  "id",
  "constraints",
  "travelers",
  "days",
  "budget",
  "tradeoffs",
  "version",
];
const validCategories = new Set([
  "nature",
  "city",
  "food",
  "adventure",
  "relaxation",
  "culture",
  "nightlife",
  "shopping",
  "anime",
  "beach",
  "history",
  "transport",
  "meal",
  "lodging",
]);

for (const key of requiredTripKeys) {
  if (!(key in trip)) throw new Error(`Trip is missing required field: ${key}`);
}

if (!Array.isArray(trip.travelers) || !Array.isArray(trip.days)) {
  throw new Error("Trip travelers and days must be arrays.");
}

const calculatedTotal = trip.days.reduce((total, day) => {
  if (!Array.isArray(day.activities) || !Array.isArray(day.transportLegs)) {
    throw new Error(`Day ${day.day} does not match the DayPlan contract.`);
  }

  const activityTotal = day.activities.reduce((sum, activity) => {
    if (!activity.rationale?.trim()) {
      throw new Error(`Activity ${activity.id} needs a rationale.`);
    }
    if (!validCategories.has(activity.category)) {
      throw new Error(`Activity ${activity.id} has an invalid category.`);
    }
    return sum + (activity.estCostPerPerson ?? 0) * trip.travelers.length;
  }, 0);
  const transportTotal = day.transportLegs.reduce(
    (sum, leg) => sum + (leg.estCost ?? 0),
    0,
  );

  return total + activityTotal + transportTotal;
}, 0);

if (trip.budget.total !== calculatedTotal) {
  throw new Error(
    `Seed budget total is ${trip.budget.total}; expected ${calculatedTotal}.`,
  );
}

console.log("Seed demo trip matches the Phase 1 contract.");
