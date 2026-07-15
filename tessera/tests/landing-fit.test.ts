import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the landing form within a short desktop viewport", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(
    stylesheet,
    /@media \(max-height: 800px\) and \(min-width: 761px\) \{[\s\S]*?\.landingHero \{[\s\S]*?padding-top: 1rem;[\s\S]*?padding-bottom: 1rem;[\s\S]*?\.landingHero h1 \{[\s\S]*?font-size: clamp\(2\.75rem, 5vw, 4\.5rem\);[\s\S]*?\.planForm \{[\s\S]*?margin-top: 1rem;/,
  );
});
