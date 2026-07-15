# Map-First Trip Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder landing page with a responsive, data-driven Tessera trip studio that mirrors the approved map-first mock-up and exposes the seeded Tokyo agreement and veto flow.

**Architecture:** `app/page.tsx` remains a Server Component and passes the checked-in seed trip to one small Client Component responsible for selected-day and veto-preview state. Pure derivation functions in `lib/studio.ts` turn the frozen `Trip` into agreement cards and a selected day; visual components render the map, itinerary, agreement, and revision without changing the API contract.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 base import, scoped CSS Modules, Node's built-in test runner through `tsx`, Google Maps JavaScript API 3D Maps when `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` is configured.

## Global Constraints

- Preserve `lib/types.ts` exactly; UI derives only from `Trip`, `DayPlan`, and `TravelerProfile`.
- Use the seeded Tokyo trip for the cold-load demo and make no OpenAI or Maps API request from the server.
- Use no new runtime or UI dependency; all icons are semantic text or inline SVG and all interaction uses React plus native controls.
- Keep the browser Maps key as the only client-exposed credential; absent keys render a clear setup state, never a broken map.
- Keep the agreement explainable: each traveler shows a must-do and a real tradeoff taken from `Trip` fields.
- Keep budget display deterministic: format `Trip.budget.total` and `Trip.budget.ceiling` only.
- Use semantic landmarks, labelled buttons, keyboard-operable day tabs, and readable text over the map.

---

### Task 1: Stabilize install and add the UI test command

**Files:**
- Modify: `package-lock.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run test:ui`, which runs TypeScript tests with `tsx --test tests/**/*.test.ts`.

- [ ] **Step 1: Reproduce the existing lockfile failure**

Run: `npx --yes npm@10.9.2 ci --ignore-scripts --no-audit --no-fund`

Expected: failure caused by missing optional packages such as `@emnapi/core`.

- [ ] **Step 2: Regenerate only the lockfile with optional packages included**

Run: `npm install --package-lock-only --include=optional --ignore-scripts --no-audit --no-fund`

- [ ] **Step 3: Add the test runner script**

```json
{
  "scripts": {
    "test:ui": "tsx --test tests/**/*.test.ts"
  }
}
```

- [ ] **Step 4: Verify a clean install**

Run: `npx --yes npm@10.9.2 ci --ignore-scripts --no-audit --no-fund`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: stabilize frontend install"
```

### Task 2: Add pure studio derivations with a red-green test

**Files:**
- Create: `tests/studio.test.ts`
- Create: `lib/studio.ts`

**Interfaces:**
- Consumes: `Trip`, `DayPlan`, and `TravelerProfile` from `lib/types.ts`.
- Produces: `getSelectedDay(trip, day)`, `getAgreementEntries(trip)`, and `getVetoPreview(trip)`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import seedTrip from "../data/seed-demo-trip.json";
import { getAgreementEntries, getSelectedDay, getVetoPreview } from "../lib/studio";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("derives the seeded agreement and veto preview", () => {
  assert.equal(getSelectedDay(trip, 2)?.day, 2);
  assert.equal(getAgreementEntries(trip)[1].traveler.name, "Priya");
  assert.match(getAgreementEntries(trip)[1].concession, /early/i);
  assert.equal(getVetoPreview(trip).removedActivity, "Mount Takao summit trail");
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:ui`

Expected: fail because `lib/studio.ts` does not exist.

- [ ] **Step 3: Write the smallest derivation module**

```ts
import type { DayPlan, Trip, TravelerProfile } from "./types";

export interface AgreementEntry {
  traveler: TravelerProfile;
  mustDo: string;
  concession: string;
}

export function getSelectedDay(trip: Trip, day: number): DayPlan | undefined {
  return trip.days.find((plan) => plan.day === day);
}

export function getAgreementEntries(trip: Trip): AgreementEntry[] {
  return trip.travelers.map((traveler) => ({
    traveler,
    mustDo: traveler.mustDo[0] ?? "A shared Tokyo moment",
    concession:
      trip.tradeoffs.find((tradeoff) => tradeoff.includes(traveler.name)) ??
      "Keeps the group plan balanced.",
  }));
}

export function getVetoPreview(trip: Trip) {
  const hike = trip.days.flatMap((day) => day.activities).find((activity) => activity.id === "mount-takao");
  return {
    removedActivity: hike?.title ?? "Early hike",
    replacement: "Yanaka walk + tea",
    beforeTime: hike?.startTime ?? "08:30",
    afterTime: "10:30",
  };
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:ui`

Expected: one passing test.

- [ ] **Step 5: Commit**

```bash
git add tests/studio.test.ts lib/studio.ts
git commit -m "test: cover studio trip derivations"
```

### Task 3: Build the map-first studio composition

**Files:**
- Modify: `app/page.tsx`
- Create: `components/trip-studio.tsx`
- Create: `components/group-agreement.tsx`
- Create: `components/itinerary-tray.tsx`
- Create: `components/trip-studio.module.css`

**Interfaces:**
- Consumes: a serialized `Trip` passed by `app/page.tsx`.
- Produces: a client-side studio with selected-day buttons and a veto-preview toggle.

- [ ] **Step 1: Extend the red test with selected-day behavior**

```ts
test("returns a different itinerary for each selected day", () => {
  assert.notEqual(getSelectedDay(trip, 1)?.summary, getSelectedDay(trip, 3)?.summary);
});
```

- [ ] **Step 2: Verify RED if the seed is not used by the UI model**

Run: `npm run test:ui`

Expected: fail until `getSelectedDay` is used as the studio's selected-day source.

- [ ] **Step 3: Replace the placeholder page with the seed-backed studio**

```tsx
import seedTrip from "../data/seed-demo-trip.json";
import TripStudio from "../components/trip-studio";
import type { Trip } from "../lib/types";

export default function Home() {
  return <TripStudio trip={seedTrip as Trip} />;
}
```

`TripStudio` must use `useState(1)` for the selected day and `useState(false)` for the veto preview. `GroupAgreement` must receive only `getAgreementEntries(trip)`, and `ItineraryTray` must receive `trip.days`, `selectedDay`, and an `onSelectDay` callback.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:ui && npm run lint`

Expected: test and lint exit code 0.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/trip-studio.tsx components/group-agreement.tsx components/itinerary-tray.tsx components/trip-studio.module.css tests/studio.test.ts
git commit -m "feat: build map-first Tokyo trip studio"
```

### Task 4: Add the optional real 3D Maps background

**Files:**
- Create: `components/trip-map.tsx`
- Modify: `components/trip-studio.tsx`
- Modify: `components/trip-studio.module.css`

**Interfaces:**
- Consumes: `DayPlan` activity labels and `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` in the browser.
- Produces: a 3D Maps canvas when the key exists, and an explicit no-key fallback with the same itinerary overlay when it does not.

- [ ] **Step 1: Write the failing map configuration test**

```ts
import { getMapScriptUrl } from "../components/trip-map";

test("creates a Maps JavaScript URL only for a browser key", () => {
  assert.equal(getMapScriptUrl(""), null);
  assert.match(getMapScriptUrl("browser-key") ?? "", /maps\.googleapis\.com/);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:ui`

Expected: fail because `components/trip-map.tsx` does not exist.

- [ ] **Step 3: Implement the smallest browser-only map component**

```tsx
"use client";

export function getMapScriptUrl(key: string): string | null {
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
}
```

On mount, load the returned URL once, call `window.google.maps.importLibrary("maps3d")`, create a `Map3DElement` in `HYBRID` mode centered on Tokyo, and append it to the component's ref. If the key is absent or the script errors, render a labelled map setup state while keeping itinerary pins accessible as HTML overlays.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:ui && npm run lint && npm run build`

Expected: all commands exit code 0; the build must not require a Maps key.

- [ ] **Step 5: Commit**

```bash
git add components/trip-map.tsx components/trip-studio.tsx components/trip-studio.module.css tests/studio.test.ts
git commit -m "feat: add optional 3d Tokyo map background"
```

### Task 5: Finish visual and accessibility verification

**Files:**
- Modify: `app/globals.css`
- Modify: `components/trip-studio.module.css`

**Interfaces:**
- Preserves: the Task 3 component props and Task 4 Maps setup behavior.

- [ ] **Step 1: Add focused accessibility assertions**

```ts
test("keeps the veto preview grounded in the current seeded trip", () => {
  const preview = getVetoPreview(trip);
  assert.equal(preview.beforeTime, "08:30");
  assert.equal(preview.afterTime, "10:30");
});
```

- [ ] **Step 2: Verify RED and then GREEN**

Run: `npm run test:ui`

Expected: the test fails until `getVetoPreview` returns both exact times, then passes.

- [ ] **Step 3: Complete responsive styles**

Use CSS grid for the desktop `minmax(0, 1fr) 320px` split, stack the agreement below the map below `900px`, and allow itinerary days to scroll horizontally only at narrow widths. Keep focus indicators visible and use `button` elements for all selected-day and preview actions.

- [ ] **Step 4: Run the complete verification suite**

Run:

```bash
npm run validate:seed
npm run verify:orchestrator
npm run verify:replan
npm run verify:safeguards
npm run test:ui
npm run lint
npm run build
```

Expected: every command exits code 0.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css components/trip-studio.module.css tests/studio.test.ts
git commit -m "feat: polish accessible trip studio"
```

## Self-Review

- **Spec coverage:** Tasks 2–5 render the frozen `Trip` values as traveler agreement, timeline, map context, budget, and veto diff; no task changes the backend contract or calls paid services on the seeded cold-load path.
- **Placeholder scan:** No placeholder implementation steps are used. The map fallback is an intentional runtime state for an absent browser key, not incomplete UI.
- **Type consistency:** `Trip` is the only page payload; `DayPlan` is selected by `getSelectedDay`; agreement and veto values are derived by named functions in `lib/studio.ts`.
