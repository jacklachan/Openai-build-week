/** Pure view-model helpers for the seeded Tessera trip studio. */
import type { DayPlan, TravelerProfile, Trip } from "./types";

/** A traveler's visible promise and the group tradeoff attached to it. */
export interface AgreementEntry {
  concession: string;
  mustDo: string;
  traveler: TravelerProfile;
}

/** The compact before-and-after copy used by the deterministic veto preview. */
export interface VetoPreview {
  afterTime: string;
  beforeTime: string;
  removedActivity: string;
  replacement: string;
}

/** The small, data-derived status summary shown over the Atlas map. */
export interface AtlasSignals {
  agreementCount: number;
  budgetRatio: number;
  nextStop: string;
}

/** Returns the day currently selected in the itinerary rail. */
export function getSelectedDay(trip: Trip, day: number): DayPlan | undefined {
  return trip.days.find((plan) => plan.day === day);
}

/** Turns the frozen trip contract into the visible Group Agreement entries. */
export function getAgreementEntries(trip: Trip): AgreementEntry[] {
  return trip.travelers.map((traveler) => ({
    concession:
      trip.tradeoffs.find((tradeoff) =>
        tradeoff.toLocaleLowerCase().startsWith(traveler.name.toLocaleLowerCase()),
      ) ??
      trip.tradeoffs.find((tradeoff) => tradeoff.includes(traveler.name)) ??
      "Keeps the group plan balanced.",
    mustDo: traveler.mustDo[0] ?? "A shared Tokyo moment",
    traveler,
  }));
}

/** Derives a safe demo-only explanation for Priya's early-hike veto. */
export function getVetoPreview(trip: Trip): VetoPreview {
  const hike = trip.days
    .flatMap((day) => day.activities)
    .find((activity) => activity.id === "mount-takao");

  return {
    afterTime: "10:30",
    beforeTime: hike?.startTime ?? "08:30",
    removedActivity: hike?.title ?? "Early hike",
    replacement: "Yanaka walk + tea",
  };
}

/** Derives display-only status from the existing trip contract without claiming live provider data. */
export function getAtlasSignals(trip: Trip): AtlasSignals {
  const budgetCeiling = trip.budget.ceiling ?? trip.constraints.budgetCeiling ?? trip.budget.total;
  const nextStop = trip.days[0]?.activities[0]?.title ?? "Your first shared stop";

  return {
    agreementCount: trip.travelers.length,
    budgetRatio: Math.min(100, Math.round((trip.budget.total / budgetCeiling) * 100)),
    nextStop,
  };
}
