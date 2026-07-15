import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GroupAgreement } from "../components/group-agreement";
import * as tripStudio from "../components/trip-studio";
import seedTrip from "../data/seed-demo-trip.json";
import { getAgreementEntries, getVetoPreview } from "../lib/studio";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

function cssBlock(stylesheet: string, selector: string) {
  const start = stylesheet.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `Expected ${selector} to be defined.`);

  return stylesheet.slice(start, stylesheet.indexOf("}", start));
}

test("omits a Veto action and fabricated preview for a generated plan without mount-takao", () => {
  const generatedTrip = {
    ...trip,
    days: trip.days.map((day) => ({
      ...day,
      activities: day.activities.filter((activity) => activity.id !== "mount-takao"),
    })),
  };
  const getVetoPreviewForTrip = (tripStudio as Record<string, unknown>).getVetoPreviewForTrip;

  assert.equal(typeof getVetoPreviewForTrip, "function");
  assert.equal((getVetoPreviewForTrip as (value: Trip) => unknown)(generatedTrip), undefined);

  const html = renderToStaticMarkup(
    createElement(GroupAgreement, {
      agreement: getAgreementEntries(generatedTrip),
      trip: generatedTrip,
    }),
  );

  assert.doesNotMatch(html, /vetoPanel/);
  assert.doesNotMatch(html, />Veto(?:ed)?</);
  assert.doesNotMatch(html, /Early hike|Yanaka walk \+ tea|10:30/);
});

test("keeps the seeded Veto and derives its label from the matched activity day", () => {
  const movedVetoTrip = {
    ...trip,
    days: trip.days.map((day, index) => ({
      ...day,
      activities:
        index === 0
          ? [
              ...day.activities,
              ...trip.days.flatMap((sourceDay) =>
                sourceDay.activities.filter((activity) => activity.id === "mount-takao"),
              ),
            ]
          : day.activities.filter((activity) => activity.id !== "mount-takao"),
    })),
  };
  const html = renderToStaticMarkup(
    createElement(GroupAgreement, {
      agreement: getAgreementEntries(movedVetoTrip),
      onTogglePreview: () => undefined,
      preview: getVetoPreview(movedVetoTrip),
      showPreview: true,
      trip: movedVetoTrip,
    }),
  );

  assert.match(html, /vetoPanel/);
  assert.match(html, /VETO \/\/ DAY 01/);
  assert.match(html, /class="inkButton"/);
  assert.match(html, />Vetoed</);
  assert.match(html, /Mount Takao summit trail/);
  assert.match(html, /10:30/);
});

test("renders a non-revealing generation block for every requested day", () => {
  const GenerationTimeline = (tripStudio as Record<string, unknown>).GenerationTimeline;

  assert.equal(typeof GenerationTimeline, "function");

  const html = renderToStaticMarkup(
    createElement(GenerationTimeline as ComponentType<{ days: number }>, { days: 4 }),
  );

  assert.match(html, /generationTimeline/);
  assert.match(html, />D01</);
  assert.match(html, />D02</);
  assert.match(html, />D03</);
  assert.match(html, />D04</);
  assert.doesNotMatch(html, /Mount Takao|Yanaka|satisfies|tension/i);
});

test("uses left-edge traveler semantics and flat activity tone blocks", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const travelerTension = cssBlock(stylesheet, ".travelerChip-tension");
  const travelerSatisfied = cssBlock(stylesheet, ".travelerChip-satisfied");
  const headerChip = cssBlock(stylesheet, ".generatedHeader .travelerChip");
  const headerChipName = cssBlock(stylesheet, ".generatedHeader .travelerChip span");
  const headerChipDetail = cssBlock(stylesheet, ".generatedHeader .travelerChip small");
  const timelineTension = cssBlock(stylesheet, ".activityTone-tension");
  const timelineSatisfied = cssBlock(stylesheet, ".activityTone-satisfied");
  const timelineNeutral = cssBlock(stylesheet, ".activityTone-neutral");
  const generationRow = cssBlock(stylesheet, ".generationTimelineRow");

  assert.match(travelerTension, /border-left-color: var\(--signal\)/);
  assert.doesNotMatch(travelerTension, /background:/);
  assert.match(travelerSatisfied, /border-left-color: var\(--verify\)/);
  assert.doesNotMatch(travelerSatisfied, /background:/);
  assert.match(headerChip, /background: var\(--bone\)/);
  assert.match(headerChipName, /color: var\(--ink\)/);
  assert.match(headerChipDetail, /color: var\(--ink-2\)/);
  assert.match(timelineTension, /background: var\(--signal\)/);
  assert.match(timelineTension, /color: var\(--ink\)/);
  assert.match(timelineSatisfied, /background: var\(--verify\)/);
  assert.match(timelineSatisfied, /color: var\(--ink\)/);
  assert.match(timelineNeutral, /border-color: var\(--ink\)/);
  assert.match(stylesheet, /animation: timelineSnap 60ms steps\(2, end\) backwards/);
  assert.match(generationRow, /animation-delay: calc\(var\(--timeline-index\) \* 60ms\)/);
});

test("keeps the landing button and disabled controls legible while preserving map route weights", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const formButton = cssBlock(stylesheet, ".planForm button");
  const disabledControls = cssBlock(stylesheet, ".planForm button:disabled,\n.planForm input:disabled");
  const inkRoute = cssBlock(stylesheet, ".inkRoute");
  const selectedRoute = cssBlock(stylesheet, ".dataSelectedRoute");

  assert.match(formButton, /color: var\(--ink\)/);
  assert.match(formButton, /background: var\(--bone\)/);
  assert.ok(
    stylesheet.indexOf(".planForm button {") >
      stylesheet.indexOf(".planForm button,\n.signalButton,\n.inkButton"),
  );
  assert.doesNotMatch(disabledControls, /ink-3/);
  assert.match(inkRoute, /stroke-width: 2/);
  assert.match(selectedRoute, /stroke-width: 3/);
});
