import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import seedTrip from "../data/seed-demo-trip.json";
import { AtlasMotion } from "../components/atlas-motion";
import { DecisionReplay, getDecisionReceipt } from "../components/decision-replay";
import { DecisionRoom } from "../components/decision-room";
import { createAgreementBrief, createGroupShareText, getDecisionRoomSummary, getWhatsAppShareUrl } from "../components/decision-room";
import { DisruptionDrill } from "../components/disruption-drill";
import { GroupAgreement } from "../components/group-agreement";
import { ItineraryTray } from "../components/itinerary-tray";
import { MapLibreItineraryMap } from "../components/maplibre-itinerary-map";
import { getOsmViewport } from "../components/osm-itinerary-map";
import { ProposalArena } from "../components/proposal-arena";
import { getProposalOptions } from "../lib/proposal-arena";
import { createPactCardSvg, getPactCardFilename } from "../lib/pact-card";
import { getDisruptionDrill, getDisruptionScenarios } from "../lib/disruption";
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
  assert.match(html, /GROUP CHECK-IN/);
  assert.match(html, /Download brief/);
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
  assert.match(html, />D04</);
  assert.match(html, /activityTone-tension/);
  assert.ok(html.includes(preview.replacement));
  assert.ok(html.includes(preview.afterTime));
  assert.match(html, /rationalePanel/);
  assert.match(html, /without forcing an early start for Priya/);
});

test("renders the non-animated rule element", () => {
  const html = renderToStaticMarkup(createElement(AtlasMotion));

  assert.match(html, /sectionRuleDraw/);
  assert.doesNotMatch(html, /atlasParticleField/);
});

test("renders the key-free interactive 3D map shell", () => {
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  try {
    const preview = getVetoPreview(trip);
    const html = renderToStaticMarkup(
      createElement(MapLibreItineraryMap, {
        activities: trip.days[0]!.activities,
        destination: trip.constraints.destination,
        selectedActivityId: preview?.activityId ?? null,
        selectedDay: 1,
      }),
    );

    assert.match(html, /mapLibreItineraryMap/);
    assert.match(html, /LIVE 3D CITY MAP/);
    assert.match(html, /Drag to orbit/);
    assert.match(html, /Tokyo/);
    assert.match(html, /DAY 01/);
  } finally {
    if (browserKey === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY = browserKey;
    }
  }
});

test("turns an explicit group check-in into a ready-to-book outcome and exportable brief", () => {
  const agreement = getAgreementEntries(trip);
  const decisions = Object.fromEntries(agreement.map((entry) => [entry.traveler.id, "ready" as const]));

  assert.deepEqual(getDecisionRoomSummary(agreement, decisions), {
    needsChange: 0,
    ready: agreement.length,
    total: agreement.length,
    unanimous: true,
  });
  assert.match(createAgreementBrief(trip, agreement), /Tessera group agreement/);
  assert.match(createAgreementBrief(trip, agreement), /Japan — Tokyo, Fuji, Kyoto & Osaka/);
  assert.match(createAgreementBrief(trip, agreement), /Ravi keeps: Mount Fuji sunrise/);
  const pactCard = createPactCardSvg(trip, agreement);
  assert.match(pactCard, /TESSERA \/ GROUP PACT/);
  assert.match(pactCard, /Japan — Tokyo, Fuji, Kyoto &amp; Osaka/);
  assert.match(pactCard, /Mount Fuji sunrise/);
  assert.equal(getPactCardFilename("Japan — Tokyo, Fuji, Kyoto & Osaka"), "tessera-japan-tokyo-fuji-kyoto-osaka-pact-card.svg");
  assert.match(createGroupShareText(trip, agreement), /Ravi: Mount Fuji sunrise/);
  assert.match(getWhatsAppShareUrl("Tessera pact"), /^https:\/\/wa\.me\/\?text=Tessera%20pact$/);

  const html = renderToStaticMarkup(createElement(DecisionRoom, { agreement, trip }));
  assert.match(html, /Each traveler can accept their promise/);
  assert.match(html, /I&#x27;m in/);
  assert.match(html, /Flag a concern/);
  assert.match(html, /Share with group/);
  assert.match(html, /WhatsApp/);
  assert.match(html, /Mount Fuji sunrise/);
});

test("renders three proposal choices with auditable trade-off scores", () => {
  const html = renderToStaticMarkup(
    createElement(ProposalArena, {
      activeProposalId: "fairness",
      onRunDisruption: () => undefined,
      onSelect: () => undefined,
      proposals: getProposalOptions(trip),
    }),
  );

  assert.match(html, /Three viable futures/);
  assert.match(html, /Best fairness/);
  assert.match(html, /Lowest friction/);
  assert.match(html, /Most headroom/);
  assert.match(html, /BUDGET/);
  assert.match(html, /Pressure-test this pact/);
});

test("turns a named promise into an honest, visible disruption drill", () => {
  const proposals = getProposalOptions(trip);
  const drill = getDisruptionDrill(trip, proposals);
  assert.ok(drill);
  assert.equal(drill.affectedActivity, "Mount Fuji 5th Station sunrise");
  assert.equal(drill.affectedTraveler, "Ravi");
  assert.deepEqual(getDisruptionScenarios(trip, proposals).map((scenario) => scenario.id), ["weather", "budget"]);

  const html = renderToStaticMarkup(
    createElement(DisruptionDrill, {
      baseTrip: trip,
      currency: trip.constraints.currency,
      onClose: () => undefined,
      onOpenOptions: () => undefined,
      onSelect: () => undefined,
      proposals,
    }),
  );

  assert.match(html, /SIMULATED DISRUPTION DRILL/);
  assert.match(html, /Weather shift/);
  assert.match(html, /Budget shock/);
  assert.match(html, /Nothing here is live weather data/);
  assert.match(html, /Who carries the cost/);
  assert.match(html, /Switch to Trade the hardest stop/);
});

test("renders the seeded decision replay as one question, choices, ripple, and pact", () => {
  const proposals = getProposalOptions(trip);
  const sharedProps = {
    activeProposalId: "fairness" as const,
    baseTrip: trip,
    currency: trip.constraints.currency,
    onChallenge: () => undefined,
    onChoose: () => undefined,
    onFinish: () => undefined,
    onNext: () => undefined,
    onShowOptions: () => undefined,
    proposals,
    travelers: trip.travelers,
  };

  const conflict = renderToStaticMarkup(createElement(DecisionReplay, { ...sharedProps, step: "conflict" }));
  const question = renderToStaticMarkup(createElement(DecisionReplay, { ...sharedProps, step: "question" }));
  const choice = renderToStaticMarkup(createElement(DecisionReplay, { ...sharedProps, step: "choice" }));
  const ripple = renderToStaticMarkup(createElement(DecisionReplay, { ...sharedProps, step: "ripple" }));
  const pact = renderToStaticMarkup(createElement(DecisionReplay, { ...sharedProps, step: "pact" }));

  assert.match(conflict, /One early morning is blocking this trip/);
  assert.match(conflict, /See the one decision/);
  assert.match(conflict, /Skip replay/);
  assert.match(question, /Your choice/);
  assert.match(question, /Should Priya take one 05:30 start/);
  assert.match(question, /Why this matters/);
  assert.match(question, /Compare all three deals instead/);
  assert.match(choice, /What should the group protect/);
  assert.match(choice, /Best fairness/);
  assert.match(ripple, /What the group gets/);
  assert.match(ripple, /Everyone keeps the thing they named/);
  assert.match(pact, /Everyone can see what they get and give up/);
  assert.match(pact, /Challenge a promise/);

  const paceReceipt = getDecisionReceipt(trip, proposals[1]!, trip.constraints.currency);
  assert.equal(paceReceipt.changed, "Mount Fuji 5th Station sunrise becomes Hakone Open-Air Museum.");
  assert.match(paceReceipt.budget, /added to the total|stays in reserve|Total holds/);
});

test("uses only the visible nine-tile map viewport and projects known stops", () => {
  const viewport = getOsmViewport(trip.days[0].activities);

  assert.equal(viewport.tiles.length, 9);
  assert.ok(viewport.tiles.every(({ z }) => Number.isInteger(z) && z >= 8 && z <= 13));
  assert.equal(viewport.points.length, trip.days[0].activities.length);
  assert.ok(viewport.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
});
