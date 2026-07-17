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
  activityId: string;
  day: number;
  afterTime: string;
  beforeTime: string;
  removedActivity: string;
  replacement: string;
}

const DEMO_VETO = {
  activityId: "mount-fuji",
  afterTime: "11:00",
  beforeTime: "05:30",
  day: 2,
  removedActivity: "Mount Fuji 5th Station sunrise",
  replacement: "Hakone Open-Air Museum",
} as const satisfies VetoPreview;

/** Returns the one fixed veto whose result is available from the no-key demo endpoint. */
export function getDemoVetoPreview(trip: Trip): VetoPreview | undefined {
  const activity = trip.days
    .find((day) => day.day === DEMO_VETO.day)
    ?.activities.find((item) => item.id === DEMO_VETO.activityId);

  return activity?.title === DEMO_VETO.removedActivity ? { ...DEMO_VETO } : undefined;
}

/** Returns a preview only while its selected activity remains on its selected day. */
export function getActiveVetoPreview(
  preview: VetoPreview | null | undefined,
  selectedDay: number,
  selectedActivityId: string | null,
): VetoPreview | undefined {
  return preview && preview.day === selectedDay && preview.activityId === selectedActivityId
    ? preview
    : undefined;
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
  const activities = trip.days.flatMap((day) => day.activities);

  return trip.travelers.map((traveler) => ({
    concession:
      trip.tradeoffs.find((tradeoff) =>
        tradeoff.toLocaleLowerCase().startsWith(traveler.name.toLocaleLowerCase()),
      ) ??
      trip.tradeoffs.find((tradeoff) => tradeoff.includes(traveler.name)) ??
      "Keeps the group plan balanced.",
    mustDo:
      traveler.mustDo[0] ??
      activities.find((activity) => activity.satisfies.includes(traveler.id))?.title ??
      `A shared moment for ${traveler.name}`,
    traveler,
  }));
}

/** Derives one selected activity for every Veto display surface. */
export function getVetoPreview(trip: Trip): VetoPreview | undefined {
  const selectedDay =
    trip.days.find((day) => day.activities.some((activity) => activity.tension)) ??
    trip.days.find((day) => day.activities.length > 0);
  const selectedActivity =
    selectedDay?.activities.find((activity) => activity.tension) ?? selectedDay?.activities[0];
  if (!selectedActivity || !selectedDay) return undefined;
  const affectedTraveler =
    trip.travelers.find((traveler) =>
      selectedActivity.tension?.toLocaleLowerCase().includes(traveler.name.toLocaleLowerCase()),
    ) ??
    trip.travelers.find((traveler) => selectedActivity.satisfies.includes(traveler.id)) ??
    trip.travelers[0];
  const replacement =
    selectedDay?.activities.find(
      (activity) =>
        activity.id !== selectedActivity.id &&
        (!affectedTraveler || activity.satisfies.includes(affectedTraveler.id)),
    ) ?? selectedDay?.activities.find((activity) => activity.id !== selectedActivity.id);

  if (!replacement) return undefined;

  return {
    activityId: selectedActivity.id,
    day: selectedDay.day,
    afterTime: replacement?.startTime ?? "Flexible",
    beforeTime: selectedActivity?.startTime ?? "Flexible",
    removedActivity:
      selectedActivity.title ??
      affectedTraveler?.mustDo[0] ??
      `${affectedTraveler?.name ?? "A traveler"}'s selected activity`,
    replacement: replacement?.title ?? `A later option for ${affectedTraveler?.name ?? "the group"}`,
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
