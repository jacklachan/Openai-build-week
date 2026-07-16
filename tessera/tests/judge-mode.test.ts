import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ReplanAudit } from "../components/replan-audit";
import {
  getJudgeDemoStep,
  isJudgeModeSource,
  usesDeterministicDemoReplan,
} from "../components/trip-studio";
import seedTrip from "../data/seed-demo-trip.json";
import { getDemoVetoPreview } from "../lib/studio";
import type { Trip } from "../lib/types";

test("guides a judge through the deterministic demo in order", () => {
  assert.equal(getJudgeDemoStep(false, false, false), "load");
  assert.equal(getJudgeDemoStep(true, false, false), "preview");
  assert.equal(getJudgeDemoStep(true, true, false), "apply");
  assert.equal(getJudgeDemoStep(true, false, true), "complete");
});

test("keeps a fixture-loaded Judge Mode veto on the no-key demo endpoint", () => {
  assert.equal(usesDeterministicDemoReplan("demo"), true);
  assert.equal(usesDeterministicDemoReplan("live"), false);
  assert.equal(usesDeterministicDemoReplan("cache"), false);
  assert.equal(isJudgeModeSource("demo"), true);
  assert.equal(isJudgeModeSource("live"), false);
  assert.equal(isJudgeModeSource("cache"), false);
});

test("renders an auditable before-and-after veto record", () => {
  const markup = renderToStaticMarkup(
    createElement(ReplanAudit, {
      currency: "USD",
      diff: {
        addedActivities: [{ id: "teamlab", title: "teamLab Planets" }],
        budget: { after: 422, before: 406, delta: 16 },
        changedTradeoffs: true,
        nextVersion: 2,
        previousVersion: 1,
        removedActivities: [{ id: "mount-takao", title: "Mount Takao hike" }],
      },
    }),
  );

  assert.match(markup, /VETO APPLIED/);
  assert.match(markup, /Mount Takao hike/);
  assert.match(markup, /teamLab Planets/);
  assert.match(markup, /VERSION 1 → 2/);
  assert.match(markup, /\+\$16/);
  assert.match(markup, /UPDATED/);
});

test("uses the seeded Priya Mount Takao veto that the demo replan actually applies", () => {
  assert.deepEqual(getDemoVetoPreview(seedTrip as Trip), {
    activityId: "mount-takao",
    afterTime: "11:00",
    beforeTime: "08:30",
    day: 2,
    removedActivity: "Mount Takao summit trail",
    replacement: "teamLab Planets",
  });
});

test("formats a replan audit in the trip currency", () => {
  const markup = renderToStaticMarkup(
    createElement(ReplanAudit, {
      currency: "EUR",
      diff: {
        addedActivities: [],
        budget: { after: 22, before: 20, delta: 2 },
        changedTradeoffs: false,
        nextVersion: 2,
        previousVersion: 1,
        removedActivities: [],
      },
    }),
  );

  assert.match(markup, /€2/);
  assert.match(markup, /€20/);
  assert.match(markup, /€22/);
});
