import { createHash } from "node:crypto";

import seedTrip from "@/data/seed-demo-trip.json";
import { estimateBudget } from "@/lib/budget";
import { validateCommittedTrip } from "@/lib/plan-validation";
import type { Trip } from "@/lib/types";

const planCache = new Map<string, Trip>();
const demoTrip = validateCommittedTrip(seedTrip);

export function cacheKey(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function getCachedPlan(key: string): Trip | undefined {
  const trip = planCache.get(key);
  return trip ? structuredClone(trip) : undefined;
}

export function setCachedPlan(key: string, trip: Trip): void {
  planCache.set(key, structuredClone(trip));
}

export function getDemoTrip(): Trip {
  return structuredClone(demoTrip);
}

export function getDemoReplan(): Trip {
  const trip = getDemoTrip();
  trip.version += 1;
  const day = trip.days[1];
  day.activities = day.activities.filter((activity) => activity.id !== "mount-takao");
  day.activities.unshift({
    id: "teamlab-planets",
    title: "teamLab Planets",
    lat: 35.6491,
    lng: 139.789,
    category: "city",
    startTime: "11:00",
    durationMin: 120,
    estCostPerPerson: 28,
    rationale:
      "This late, mostly indoor alternative honors Priya's veto while preserving a memorable shared experience.",
    satisfies: ["priya", "ravi", "mei"],
    tension: "Ravi gives up his Mount Takao hike for a lower-intensity group activity.",
  });
  trip.tradeoffs = [
    "Priya vetoed the early Mount Takao hike, so the group swaps it for a late teamLab visit; Ravi gives up the adventure day.",
    "The premium vegetarian dinner remains the single planned splurge, so the revised plan stays within budget.",
  ];
  trip.budget = { ceiling: trip.constraints.budgetCeiling, ...estimateBudget(trip) };
  return validateCommittedTrip(trip);
}

export function isDemoOnly(): boolean {
  return process.env.DEMO_ONLY === "true";
}
