import type { Activity, TravelerProfile, Trip } from "../lib/types";

export type ActivityTone = "tension" | "satisfied" | "neutral";

export type BudgetState =
  | { kind: "neutral" }
  | { kind: "verify" | "warn" | "signal"; ratio: number; delta: number };

export function getActivityTone(activity: Pick<Activity, "satisfies" | "tension">): ActivityTone {
  if (activity.tension) return "tension";
  return activity.satisfies.length ? "satisfied" : "neutral";
}

export function getTravelerTone(trip: Trip, travelerId: string): ActivityTone {
  const traveler = trip.travelers.find(({ id }) => id === travelerId);
  const activities = trip.days.flatMap(({ activities }) => activities);

  if (
    traveler &&
    activities.some(({ tension }) => tension?.toLowerCase().includes(traveler.name.toLowerCase()))
  ) {
    return "tension";
  }

  return activities.some(({ satisfies }) => satisfies.includes(travelerId)) ? "satisfied" : "neutral";
}

export function getBudgetState(budget: Trip["budget"]): BudgetState {
  if (budget.ceiling === undefined) return { kind: "neutral" };

  const ratio = (budget.total / budget.ceiling) * 100;
  return {
    delta: budget.ceiling - budget.total,
    kind: ratio > 100 ? "signal" : ratio >= 90 ? "warn" : "verify",
    ratio: Math.min(ratio, 100),
  };
}

export function getTimelineDays(trip: Trip) {
  return trip.days.map((day, index) => ({
    day,
    label: `D${String(index + 1).padStart(2, "0")}`,
  }));
}

export function formatTravelerConflict(traveler: TravelerProfile) {
  return [
    ...(traveler.budgetContribution === undefined
      ? []
      : [`$${traveler.budgetContribution.toLocaleString("en-US")} contribution`]),
    `${traveler.pace} pace`,
    traveler.interests[0] ?? traveler.mustDo[0] ?? "shared plan",
  ].join(" · ");
}
