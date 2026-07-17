import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TripStudio } from "../components/trip-studio";

test("starts from a generic landing form without the Japan fixture", () => {
  const html = renderToStaticMarkup(createElement(TripStudio));

  assert.match(
    html,
    /Turn competing wishes into one visible agreement/,
  );
  assert.match(html, /Destination/);
  assert.match(html, /Load the Japan demo/);
  assert.doesNotMatch(html, /Mount Fuji|Akihabara/);
});

test("uses an ink ground for the base landing hero", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(stylesheet, /^\.landingHero\s*\{[^}]*background: var\(--foreground\);/m);
});
