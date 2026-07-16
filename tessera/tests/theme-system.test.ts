import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readOptional(path: URL) {
  return readFile(path, "utf8").catch(() => "");
}

test("declares the Marathon palette and semantic light and dark theme tokens", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(stylesheet, /--purple:\s*#5200ff;/i);
  assert.match(stylesheet, /--neon:\s*#c0fe04;/i);
  assert.match(stylesheet, /:root\s*\{[\s\S]*?--background:\s*#ffffff;[\s\S]*?--foreground:\s*#000000;/i);
  assert.match(
    stylesheet,
    /html\[data-theme="dark"\]\s*\{[\s\S]*?--background:\s*#000000;[\s\S]*?--foreground:\s*#ffffff;/i,
  );

  for (const token of ["interactive", "focus", "warning", "verification", "chart-1", "chart-2"]) {
    assert.match(stylesheet, new RegExp(`--${token}:`));
  }
});

test("removes legacy palette tokens from runtime styles", async () => {
  const stylesheet = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(stylesheet, /--(?:bone(?:-2)?|ink(?:-2|-3)?|signal|data)\b/);
});

test("initializes a valid persisted theme before hydration without making the root layout a client component", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(layout, /^\s*["']use client["'];/m);
  assert.match(layout, /<html[^>]*\bsuppressHydrationWarning\b/);
  assert.match(layout, /<head>\s*<script[\s\S]*dangerouslySetInnerHTML/);
  assert.match(layout, /const themeStorageKey = "tessera-theme";/);
  assert.match(layout, /localStorage\.getItem\(themeStorageKey\)/);
  assert.match(layout, /storedTheme === "light" \|\| storedTheme === "dark"/);
  assert.match(layout, /matchMedia\("\(prefers-color-scheme: dark\)"\)/);
  assert.match(layout, /document\.documentElement\.dataset\.theme = theme/);
  assert.match(layout, /<ThemeToggle\s*\/>/);
});

test("keeps the browser-only theme behavior in an accessible narrow client toggle", async () => {
  const toggle = await readOptional(new URL("../components/theme-toggle.tsx", import.meta.url));

  assert.notEqual(toggle, "", "Expected ThemeToggle to be present.");
  assert.match(toggle, /^"use client";/);
  assert.match(toggle, /const themeStorageKey = "tessera-theme";/);
  assert.match(toggle, /localStorage\.getItem\(themeStorageKey\)/);
  assert.match(toggle, /storedTheme === "light" \|\| storedTheme === "dark"/);
  assert.match(toggle, /matchMedia\("\(prefers-color-scheme: dark\)"\)/);
  assert.match(toggle, /document\.documentElement\.dataset\.theme = nextTheme/);
  assert.match(toggle, /localStorage\.setItem\(themeStorageKey, nextTheme\)/);
  assert.match(toggle, /type="button"/);
  assert.match(toggle, /aria-label="Toggle color theme"/);
});
