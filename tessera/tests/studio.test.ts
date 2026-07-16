import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GroupAgreement } from "../components/group-agreement";
import { ItineraryTray } from "../components/itinerary-tray";
import * as tripStudio from "../components/trip-studio";
import seedTrip from "../data/seed-demo-trip.json";
import { getVetoPreviewSelection } from "../components/trip-studio";
import {
  getAgreementEntries,
  getAtlasSignals,
  getSelectedDay,
  getVetoPreview,
} from "../lib/studio";
import { getMapFallbackMessage, getMapScriptUrl } from "../components/trip-map";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("uses a source-independent workspace predicate for every valid ready plan", () => {
  const canRenderTripWorkspace = (tripStudio as Record<string, unknown>).canRenderTripWorkspace;

  assert.equal(typeof canRenderTripWorkspace, "function");

  const canRender = canRenderTripWorkspace as (phase: string, value: Trip | null) => boolean;
  assert.equal(canRender("ready", trip), true);
  assert.equal(canRender("landing", trip), false);
  assert.equal(canRender("ready", null), false);
  assert.doesNotMatch(canRender.toString(), /source|demo|cache/);
});

test("activating a Veto selects the preview activity and its day", () => {
  assert.deepEqual(
    getVetoPreviewSelection({
      activityId: "lisbon-fado",
      day: 4,
      beforeTime: "21:00",
      afterTime: "11:30",
      removedActivity: "Alfama Fado late set",
      replacement: "Pastel de nata break",
    }),
    { selectedActivityId: "lisbon-fado", selectedDay: 4 },
  );
});

test("keeps an activated Veto preview scoped to its selected day and activity", () => {
  const getActiveVetoPreview = (tripStudio as Record<string, unknown>).getActiveVetoPreview;
  const preview = getVetoPreview(trip);

  assert.equal(typeof getActiveVetoPreview, "function");
  assert.ok(preview);

  const resolvePreview = getActiveVetoPreview as (
    preview: NonNullable<ReturnType<typeof getVetoPreview>>,
    selectedDay: number,
    selectedActivityId: string | null,
  ) => ReturnType<typeof getVetoPreview>;

  assert.equal(resolvePreview(preview, preview.day, preview.activityId), preview);
  assert.equal(resolvePreview(preview, preview.day + 1, preview.activityId), undefined);
  assert.equal(resolvePreview(preview, preview.day, "another-activity"), undefined);
});

test("does not substitute a Veto activity with the same ID on another selected day", () => {
  const duplicateIdTrip = {
    ...trip,
    days: [
      {
        ...trip.days[0]!,
        day: 1,
        activities: [
          { ...trip.days[0]!.activities[0]!, id: "shared-activity", title: "Day one veto" },
          {
            ...trip.days[0]!.activities[1]!,
            id: "day-one-alternative",
            title: "Day one alternative",
          },
        ],
      },
      {
        ...trip.days[1]!,
        day: 2,
        activities: [
          { ...trip.days[1]!.activities[0]!, id: "shared-activity", title: "Day two original" },
        ],
      },
    ],
  };
  const preview = {
    activityId: "shared-activity",
    afterTime: "12:30",
    beforeTime: "09:00",
    day: 1,
    removedActivity: "Day one veto",
    replacement: "Day one alternative",
  };

  const html = renderToStaticMarkup(
    createElement(ItineraryTray, {
      onSelectActivity: () => undefined,
      onSelectDay: () => undefined,
      selectedActivityId: "shared-activity",
      selectedDay: 2,
      trip: duplicateIdTrip,
      vetoPreview: preview,
    }),
  );

  assert.ok(html.includes("Day two original"));
  assert.doesNotMatch(html, /Day one alternative/);
});

test("does not derive a Veto preview from a replacement on another day", () => {
  const crossDayTrip = {
    ...trip,
    days: [
      {
        ...trip.days[0]!,
        day: 1,
        activities: [
          {
            ...trip.days[0]!.activities[0]!,
            id: "solo-veto",
            satisfies: ["ravi"],
            tension: "Ravi gives up an early start.",
          },
        ],
      },
      {
        ...trip.days[1]!,
        day: 2,
        activities: [
          {
            ...trip.days[1]!.activities[0]!,
            id: "next-day-option",
            satisfies: ["ravi"],
            tension: undefined,
          },
        ],
      },
    ],
  };

  assert.equal(getVetoPreview(crossDayTrip), undefined);
});

test("derives the seeded agreement and activity-based veto preview", () => {
  const agreement = getAgreementEntries(trip);
  const preview = getVetoPreview(trip);
  const activities = trip.days.flatMap((day) => day.activities);

  assert.ok(preview);

  assert.equal(getSelectedDay(trip, 2)?.day, 2);
  assert.equal(agreement[1].traveler.name, "Priya");
  assert.match(agreement[1].concession, /early/i);
  assert.match(agreement[0].concession, /^Ravi accepts/i);
  assert.match(agreement[2].concession, /^Mei gets/i);
  assert.ok(
    activities.some(
      (activity) =>
        activity.title === preview.removedActivity && activity.startTime === preview.beforeTime,
    ),
  );
  assert.ok(
    activities.some(
      (activity) => activity.title === preview.replacement && activity.startTime === preview.afterTime,
    ),
  );
});

test("uses one non-Tokyo activity for the Veto day, preview, and replaced itinerary row", () => {
  const lisbonTrip = {
    ...trip,
    constraints: { ...trip.constraints, destination: "Lisbon, Portugal" },
    days: [
      {
        ...trip.days[0]!,
        day: 4,
        activities: [
          {
            ...trip.days[0]!.activities[0]!,
            id: "lisbon-fado",
            title: "Alfama Fado late set",
            startTime: "21:00",
            rationale: "A late performance gives Ravi a cultural compromise.",
            satisfies: ["ravi"],
            tension: "Ravi gives up an early coastal hike.",
          },
          {
            ...trip.days[0]!.activities[1]!,
            id: "lisbon-pastry",
            title: "Pastel de nata break",
            startTime: "11:30",
            rationale: "A relaxed alternative keeps the day flexible.",
            satisfies: ["ravi"],
            tension: undefined,
          },
        ],
      },
    ],
  };
  const preview = getVetoPreview(lisbonTrip);

  assert.equal(preview?.activityId, "lisbon-fado");
  assert.equal(preview?.day, 4);

  const agreementHtml = renderToStaticMarkup(
    createElement(GroupAgreement, {
      agreement: getAgreementEntries(lisbonTrip),
      onTogglePreview: () => undefined,
      preview,
      showPreview: true,
      trip: lisbonTrip,
    }),
  );
  const itineraryHtml = renderToStaticMarkup(
    createElement(ItineraryTray, {
      onSelectActivity: () => undefined,
      onSelectDay: () => undefined,
      selectedActivityId: preview?.activityId ?? null,
      selectedDay: preview?.day ?? 1,
      trip: lisbonTrip,
      vetoPreview: preview,
    }),
  );

  assert.match(agreementHtml, /VETO \/\/ DAY 04/);
  assert.ok(agreementHtml.includes("Alfama Fado late set"));
  assert.ok(agreementHtml.includes("Pastel de nata break"));
  assert.ok(itineraryHtml.includes("Pastel de nata break"));
  assert.ok(itineraryHtml.includes("11:30"));
  assert.doesNotMatch(itineraryHtml, /Alfama Fado late set/);
});

test("returns the correct itinerary for the selected day", () => {
  assert.notEqual(getSelectedDay(trip, 1)?.summary, getSelectedDay(trip, 3)?.summary);
  assert.equal(getSelectedDay(trip, 3)?.activities[0]?.title, "Tsukiji Outer Market breakfast");
});

test("derives honest Atlas status signals from the trip contract", () => {
  const signals = getAtlasSignals(trip);

  assert.equal(signals.agreementCount, trip.travelers.length);
  assert.equal(signals.budgetRatio, 19);
  assert.equal(signals.nextStop, "Shinjuku Gyoen National Garden");
});

test("creates a safe Google Maps script URL only when a browser key exists", () => {
  assert.equal(getMapScriptUrl(""), null);
  assert.equal(
    getMapScriptUrl("key with space"),
    "https://maps.googleapis.com/maps/api/js?key=key%20with%20space&v=weekly",
  );
});

test("distinguishes an absent map key from a real map loading error", () => {
  assert.match(getMapFallbackMessage("missing-key"), /NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY/);
  assert.match(getMapFallbackMessage("error"), /could not be loaded/i);
});
