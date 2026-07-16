import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import seedTrip from "../data/seed-demo-trip.json";
import { AtlasMotion } from "../components/atlas-motion";
import { GroupAgreement } from "../components/group-agreement";
import { ItineraryTray } from "../components/itinerary-tray";
import { TripMap } from "../components/trip-map";
import { getAgreementEntries, getVetoPreview } from "../lib/studio";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("renders contract-derived transcript, budget, and Veto preview state", () => {
  const agreement = getAgreementEntries(trip);
  const preview = getVetoPreview(trip);
  assert.ok(preview);
  const html = renderToStaticMarkup(
    createElement(GroupAgreement, {
      agreement,
      onTogglePreview: () => undefined,
      preview,
      showPreview: true,
      trip,
    }),
  );

  assert.match(html, /agreementTranscript/);
  assert.doesNotMatch(html, /avatar/);
  assert.match(html, /SPENT \/\/ CEILING \/\/ DELTA/);
  assert.match(html, /inkButton/);
  assert.match(html, />Vetoed</);
  assert.ok(html.includes(preview.removedActivity));
  assert.ok(html.includes(preview.afterTime));
});

test("renders ceiling-free budget data without inventing a ceiling or delta", () => {
  const ceilingFreeTrip = { ...trip, budget: { ...trip.budget, ceiling: undefined } };
  const html = renderToStaticMarkup(
    createElement(GroupAgreement, {
      agreement: getAgreementEntries(ceilingFreeTrip),
      onTogglePreview: () => undefined,
      preview: getVetoPreview(ceilingFreeTrip),
      showPreview: false,
      trip: ceilingFreeTrip,
    }),
  );

  assert.match(html, /budgetTrack-neutral/);
  assert.match(html, />SPENT</);
  assert.doesNotMatch(html, /CEILING/);
  assert.doesNotMatch(html, /DELTA/);
});

test("renders sequential timeline controls, truthful preview values, and selected rationale", () => {
  const preview = getVetoPreview(trip);
  assert.ok(preview);
  const html = renderToStaticMarkup(
    createElement(ItineraryTray, {
      onSelectActivity: () => undefined,
      onSelectDay: () => undefined,
      selectedActivityId: preview.activityId,
      selectedDay: preview.day,
      trip,
      vetoPreview: preview,
    }),
  );

  assert.match(html, />D01</);
  assert.match(html, />D02</);
  assert.match(html, />D03</);
  assert.match(html, /activityTone-tension/);
  assert.ok(html.includes(preview.replacement));
  assert.ok(html.includes(preview.afterTime));
  assert.match(html, /rationalePanel/);
  assert.match(html, /without requiring an early start for Priya/);
});

test("renders the non-animated rule element", () => {
  const html = renderToStaticMarkup(createElement(AtlasMotion));

  assert.match(html, /sectionRuleDraw/);
  assert.doesNotMatch(html, /atlasParticleField/);
});

test("renders a generated 3D itinerary terrain when no browser key is available", () => {
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  try {
    const preview = getVetoPreview(trip);
    const html = renderToStaticMarkup(
      createElement(TripMap, {
        selectedActivityId: preview?.activityId ?? null,
        selectedDay: preview?.day ?? 1,
        trip,
        vetoPreview: preview,
      }),
    );

    assert.match(html, /mapSurface/);
    assert.match(html, /terrainMap3d/);
    assert.match(html, /GENERATED TERRAIN/);
    assert.match(html, /Trip map/);
    assert.match(html, /Tokyo/);
    assert.match(html, /3D/);
  } finally {
    if (browserKey === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY = browserKey;
    }
  }
});
