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
  day.activities = day.activities.filter((activity) => activity.id !== "mount-fuji");
  day.activities.unshift({
    id: "hakone-open-air-museum",
    title: "Hakone Open-Air Museum",
    lat: 35.2479,
    lng: 139.0492,
    category: "city",
    startTime: "11:00",
    durationMin: 120,
    estCostPerPerson: 28,
    rationale:
      "This later, mostly outdoor-and-indoor Hakone alternative honors Priya's veto while preserving a memorable shared experience.",
    satisfies: ["priya", "ravi", "mei"],
    tension: "Ravi gives up his Mount Fuji sunrise for a lower-intensity shared Hakone activity.",
  });
  trip.tradeoffs = [
    "Priya vetoed the pre-dawn Mount Fuji start, so the group swaps it for a later Hakone art stop; Ravi gives up the sunrise adventure.",
    "The premium vegetarian dinner remains the single planned splurge, so the revised plan stays within budget.",
  ];
  trip.budget = { ceiling: trip.constraints.budgetCeiling, ...estimateBudget(trip) };
  return validateCommittedTrip(trip);
}

export function isDemoOnly(): boolean {
  return process.env.DEMO_ONLY === "true";
}
