import type { Activity, Trip } from "@/lib/types";

export interface PlanDiff {
  previousVersion: number;
  nextVersion: number;
  removedActivities: Pick<Activity, "id" | "title">[];
  addedActivities: Pick<Activity, "id" | "title">[];
  budget: { before: number; after: number; delta: number };
  changedTradeoffs: boolean;
}

export function createReplanRequest(trip: Trip, command: string) {
  if (!command.trim()) throw new Error("An edit command is required.");
  return {
    travelers: trip.travelers,
    constraints: trip.constraints,
    priorTrip: trip,
    editCommand: command.trim(),
  };
}

export function validateReplannedTrip(previous: Trip, next: Trip): Trip {
  if (next.version !== previous.version + 1) {
    throw new Error("A revised plan must increment the version by exactly one.");
  }
  if (next.tradeoffs.length === 0) {
    throw new Error("A revised plan must explain its updated tradeoffs.");
  }
  return next;
}

export function diffTrips(previous: Trip, next: Trip): PlanDiff {
  const previousActivities = new Map(
    previous.days.flatMap((day) => day.activities).map((activity) => [activity.id, activity]),
  );
  const nextActivities = new Map(
    next.days.flatMap((day) => day.activities).map((activity) => [activity.id, activity]),
  );

  return {
    previousVersion: previous.version,
    nextVersion: next.version,
    removedActivities: [...previousActivities.values()]
      .filter((activity) => !nextActivities.has(activity.id))
      .map(({ id, title }) => ({ id, title })),
    addedActivities: [...nextActivities.values()]
      .filter((activity) => !previousActivities.has(activity.id))
      .map(({ id, title }) => ({ id, title })),
    budget: {
      before: previous.budget.total,
      after: next.budget.total,
      delta: next.budget.total - previous.budget.total,
    },
    changedTradeoffs: JSON.stringify(previous.tradeoffs) !== JSON.stringify(next.tradeoffs),
  };
}
