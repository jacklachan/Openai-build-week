import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TripStudio } from "../components/trip-studio";
import seedTrip from "../data/seed-demo-trip.json";
import type { Trip } from "../lib/types";

test("renders the approved landing subhead", () => {
  const html = renderToStaticMarkup(createElement(TripStudio, { trip: seedTrip as Trip }));

  assert.match(
    html,
    /Everyone wants something different\. Get a plan that says who gave up what\./,
  );
});

test("uses an ink ground for the base landing hero", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(stylesheet, /^\.landingHero\s*\{[^}]*background: var\(--ink\);/m);
});
