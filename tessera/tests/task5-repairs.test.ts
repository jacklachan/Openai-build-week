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
  const normalizedStylesheet = stylesheet.replace(/\r\n/g, "\n");
  const start = normalizedStylesheet.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `Expected ${selector} to be defined.`);

  return normalizedStylesheet.slice(start, normalizedStylesheet.indexOf("}", start));
}

test("derives a Veto from a generated activity without mount-takao", () => {
  const generatedTrip = {
    ...trip,
    days: trip.days.map((day) => ({
      ...day,
      activities: day.activities.filter((activity) => activity.id !== "mount-takao"),
    })),
  };
  const getVetoPreviewForTrip = (tripStudio as Record<string, unknown>).getVetoPreviewForTrip;

  assert.equal(typeof getVetoPreviewForTrip, "function");
  const preview = (getVetoPreviewForTrip as (value: Trip) => ReturnType<typeof getVetoPreview>)(
    generatedTrip,
  );
  assert.ok(preview);
  assert.notEqual(preview.activityId, "mount-takao");

  const html = renderToStaticMarkup(
    createElement(GroupAgreement, {
      agreement: getAgreementEntries(generatedTrip),
      onTogglePreview: () => undefined,
      preview,
      showPreview: true,
      trip: generatedTrip,
    }),
  );

  assert.match(html, /vetoPanel/);
  assert.match(html, new RegExp(`VETO // DAY ${String(preview.day).padStart(2, "0")}`));
  assert.ok(html.includes(preview.removedActivity));
  assert.ok(html.includes(preview.replacement));
});

test("keeps the seeded Veto and derives its labels from the selected activity day", () => {
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
  const preview = getVetoPreview(movedVetoTrip);
  assert.ok(preview);
  const previewDay = movedVetoTrip.days.find((day) =>
    day.activities.some((activity) => activity.title === preview.removedActivity),
  );
  const html = renderToStaticMarkup(
    createElement(GroupAgreement, {
      agreement: getAgreementEntries(movedVetoTrip),
      onTogglePreview: () => undefined,
      preview,
      showPreview: true,
      trip: movedVetoTrip,
    }),
  );

  assert.match(html, /vetoPanel/);
  assert.ok(html.includes(`VETO // DAY ${String(previewDay?.day ?? 1).padStart(2, "0")}`));
  assert.match(html, /class="inkButton"/);
  assert.match(html, />Vetoed</);
  assert.ok(html.includes(preview.removedActivity));
  assert.ok(html.includes(preview.afterTime));
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

  assert.match(travelerTension, /border-left-color: var\(--warning\)/);
  assert.doesNotMatch(travelerTension, /background:/);
  assert.match(travelerSatisfied, /border-left-color: var\(--verification\)/);
  assert.doesNotMatch(travelerSatisfied, /background:/);
  assert.match(headerChip, /background: var\(--background\)/);
  assert.match(headerChipName, /color: var\(--foreground\)/);
  assert.match(headerChipDetail, /color: var\(--foreground-muted\)/);
  assert.match(timelineTension, /background: var\(--warning\)/);
  assert.match(timelineTension, /color: var\(--foreground\)/);
  assert.match(timelineSatisfied, /background: var\(--verification\)/);
  assert.match(timelineSatisfied, /color: var\(--foreground\)/);
  assert.match(timelineNeutral, /border-color: var\(--foreground\)/);
  assert.match(stylesheet, /animation: timelineSnap 60ms steps\(2, end\) backwards/);
  assert.match(generationRow, /animation-delay: calc\(var\(--timeline-index\) \* 60ms\)/);
});

test("keeps tension and satisfied activity blocks semantic when hovered or selected", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const hoveredTension = cssBlock(
    stylesheet,
    ".timelineActivity:hover.activityTone-tension,\n.timelineActivity-selected.activityTone-tension",
  );
  const hoveredSatisfied = cssBlock(
    stylesheet,
    ".timelineActivity:hover.activityTone-satisfied,\n.timelineActivity-selected.activityTone-satisfied",
  );

  assert.match(hoveredTension, /color: var\(--foreground\)/);
  assert.match(hoveredTension, /background: var\(--warning\)/);
  assert.match(hoveredTension, /border-color: var\(--warning\)/);
  assert.match(hoveredSatisfied, /color: var\(--foreground\)/);
  assert.match(hoveredSatisfied, /background: var\(--verification\)/);
  assert.match(hoveredSatisfied, /border-color: var\(--verification\)/);
});

test("keeps the landing button and disabled controls legible without fake route geometry", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const formButton = cssBlock(stylesheet, ".planForm button");
  const disabledControls = cssBlock(stylesheet, ".planForm button:disabled,\n.planForm input:disabled");

  assert.match(formButton, /color: var\(--foreground\)/);
  assert.match(formButton, /background: var\(--background\)/);
  assert.ok(
    stylesheet.indexOf(".planForm button {") >
      stylesheet.indexOf(".planForm button,\n.signalButton,\n.inkButton"),
  );
  assert.doesNotMatch(disabledControls, /ink-3/);
  assert.doesNotMatch(stylesheet, /\.routeOverlay|\.routeLine|\.inkRoute|\.dataSelectedRoute|\.routeStop|\.mapControls/);
});
