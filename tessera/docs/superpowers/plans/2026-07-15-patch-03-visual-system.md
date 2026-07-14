# Tessera Patch 03 Visual-System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Tessera's presentation as a contrast-safe negotiation-first experience whose landing action calls the existing plan API and whose generated plan leads with the tradeoff ledger.

**Architecture:** Keep all domain types and API routes unchanged. Add focused, pure presentation selectors for semantic state, keep `TripStudio` as the client-state boundary for `landing`, `generating`, `ready`, and `error`, and split rendered regions into traveler, ledger, transcript, timeline, and map components. Use CSS custom properties as the only source of rendered color.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, node:test, CSS custom properties, `next/font/google`, Anime.js.

## Global Constraints

- Do not modify `lib/types.ts`, `lib/budget.ts`, `lib/providers/*`, `app/api/*`, or `data/seed-demo-trip.json`.
- `POST /api/plan` receives the existing `{ travelers, constraints }` shape and returns its unchanged `{ trip, source }` response.
- Use only the locked Patch 03 color tokens, zero radii, Archivo, and JetBrains Mono. Do not add a dependency.
- On bone, text is only ink, ink-2, or data. On ink, text is only bone, paper, signal, verify, or warn. Data on ink is a rule/fill only.
- Activity and post-plan traveler precedence is tension, then satisfied, then neutral. Landing and generating traveler edges are neutral ink.
- The only brackets are on the selected rationale panel. Every interactive control has a square 2px data `:focus-visible` outline.
- Do not deploy, push, alter cloud configuration, or proceed beyond the acceptance report without human review.

---

## File structure

- `components/presentation.ts`: pure semantic selectors and formatters, consumed by UI and unit tests.
- `components/traveler-chips.tsx`: landing and ready traveler evidence blocks.
- `components/tradeoff-panel.tsx`: full-width ledger and narration.
- `components/group-agreement.tsx`: transcript, budget bar, and Veto control.
- `components/itinerary-tray.tsx`: dynamic day controls, semantic activity blocks, and rationale reveal.
- `components/trip-studio.tsx`: client state and existing-plan API orchestration only.
- `components/trip-map.tsx` and `components/atlas-motion.tsx`: flat map fallback and limited rule-draw motion.
- `app/layout.tsx` and `app/globals.css`: font loading and the complete token-only visual system.
- `tests/presentation.test.ts`: precedence, no-ceiling, and dynamic-day regression coverage.

### Task 1: Lock semantic presentation selectors with tests

**Files:**
- Create: `components/presentation.ts`
- Create: `tests/presentation.test.ts`

**Interfaces:**
- Consumes: `Activity`, `TravelerProfile`, and `Trip` from `lib/types.ts` without modifying them.
- Produces: `getActivityTone`, `getTravelerTone`, `getBudgetState`, `getTimelineDays`, and `formatTravelerConflict`.

- [ ] **Step 1: Write the failing semantic-selector tests**

```ts
test("tension has precedence over satisfied activity state", () => {
  const activity = trip.days[1]!.activities[0]!;
  assert.equal(getActivityTone(activity), "tension");
  assert.equal(getTravelerTone(trip, "priya"), "tension");
  assert.equal(getTravelerTone(trip, "mei"), "satisfied");
});

test("budget without a ceiling is neutral", () => {
  assert.deepEqual(getBudgetState({ total: 870, lines: [] }), { kind: "neutral" });
});

test("timeline controls derive from every supplied day", () => {
  const fourDayTrip = { ...trip, days: [...trip.days, { ...trip.days[0]!, day: 4 }] };
  assert.deepEqual(getTimelineDays(fourDayTrip).map((item) => item.label), ["D01", "D02", "D03", "D04"]);
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx tsx --test tests/presentation.test.ts`

Expected: FAIL because the selector module is absent.

- [ ] **Step 3: Implement the selectors with tension-first precedence**

```ts
export type ActivityTone = "tension" | "satisfied" | "neutral";
export type BudgetState =
  | { kind: "neutral" }
  | { kind: "verify" | "warn" | "signal"; ratio: number; delta: number };

export function getActivityTone(activity: Pick<Activity, "satisfies" | "tension">): ActivityTone {
  if (activity.tension) return "tension";
  return activity.satisfies.length ? "satisfied" : "neutral";
}

export function getBudgetState(budget: Trip["budget"]): BudgetState {
  if (budget.ceiling === undefined) return { kind: "neutral" };
  const ratio = (budget.total / budget.ceiling) * 100;
  return { kind: ratio > 100 ? "signal" : ratio >= 90 ? "warn" : "verify", ratio: Math.min(ratio, 100), delta: budget.ceiling - budget.total };
}
```

`getTravelerTone` checks name-targeted tension before a matching `satisfies` ID. `getTimelineDays` maps every `Trip.days` item to its sequential `D##` label. `formatTravelerConflict` reports only existing contribution, pace, interests, or must-do values.

- [ ] **Step 4: Run the test and commit**

Run: `npx tsx --test tests/presentation.test.ts`

Expected: PASS with all semantic assertions.

```bash
git add components/presentation.ts tests/presentation.test.ts
git commit -m "test: lock Patch 03 presentation semantics"
```

### Task 2: Add the negotiation-first generated-plan flow

**Files:**
- Create: `components/traveler-chips.tsx`
- Create: `components/tradeoff-panel.tsx`
- Modify: `components/trip-studio.tsx`

**Interfaces:**
- Consumes: Task 1 selectors, existing `getAgreementEntries`, `getSelectedDay`, `getVetoPreview`, and the unchanged `Trip` contract.
- Produces: `TravelerChips`, `TradeoffPanel`, and the only client request to `POST /api/plan`.

- [ ] **Step 1: Implement the traveler and ledger components**

```tsx
const tone = phase === "ready" ? getTravelerTone(trip, traveler.id) : "neutral";
<li className={`travelerChip travelerChip-${tone}`}>
  <span>{`T${String(index + 1).padStart(2, "0")} // ${traveler.name}`}</span>
  <small>{formatTravelerConflict(traveler)}</small>
</li>
```

The ledger renders one row per agreement with `TRAVELER | GOT | GAVE UP | NET`. Its group narration is bone text with a 3px data left rule, never data text on the ink band.

- [ ] **Step 2: Add the exact four-state client flow**

```tsx
type PlanSource = "demo" | "live" | "cache";
type StudioPhase = "landing" | "generating" | "ready" | "error";

const [activeTrip, setActiveTrip] = useState(trip);
const [destination, setDestination] = useState(trip.constraints.destination);
const [phase, setPhase] = useState<StudioPhase>("landing");
const [source, setSource] = useState<PlanSource | null>(null);

const response = await fetch("/api/plan", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    travelers: activeTrip.travelers,
    constraints: { ...activeTrip.constraints, destination },
  }),
});
```

Parse the unchanged response locally, replace `activeTrip` on success, initialize the first returned day/activity selection, render `PLAN GENERATED // DEMO` for `demo` and `PLAN GENERATED // LIVE` otherwise, and render `PLAN FAILED // [message]. RETRY.` on failure.

- [ ] **Step 3: Render ready content in the approved order**

```tsx
<GeneratedHeader source={source} />
<TradeoffPanel agreement={getAgreementEntries(activeTrip)} tradeoffs={activeTrip.tradeoffs} />
<section className="planningWorkspace">{/* 8/4 map/timeline plus transcript */}</section>
```

The landing contains read-only neutral traveler chips, one bare destination field, and one `Generate plan` action. It contains no post-plan semantic outcome.

- [ ] **Step 4: Run behavior tests and commit**

Run: `npm run test:ui`

Expected: PASS, including existing studio/map assertions.

```bash
git add components/trip-studio.tsx components/traveler-chips.tsx components/tradeoff-panel.tsx
git commit -m "feat: add Patch 03 negotiation flow"
```

### Task 3: Rebuild plan evidence components

**Files:**
- Modify: `components/group-agreement.tsx`
- Modify: `components/itinerary-tray.tsx`
- Modify: `components/trip-map.tsx`
- Modify: `components/atlas-motion.tsx`
- Delete: `components/atlas-status.tsx`

**Interfaces:**
- Consumes: `Trip`, `AgreementEntry`, `VetoPreview`, and Task 1 selectors.
- Produces: an accessible transcript, budget bar, dynamic timeline, rationale reveal, flat map, and reduced-motion-safe rule draw.

- [ ] **Step 1: Replace avatar cards with a transcript and budget bar**

Render each agreement as a mono speaker label, text body, and 1px turn rule. AI/system reasoning gets a 3px data left rule. Use `getBudgetState`: if its kind is neutral, render an ink-outline track plus `SPENT` only; otherwise render `SPENT // CEILING // DELTA` and the matching fill. `Veto` remains the sole signal-filled button.

- [ ] **Step 2: Implement dynamic timeline and selected rationale**

```tsx
{getTimelineDays(trip).map(({ day, label }) => (
  <button key={day.day} type="button" aria-pressed={day.day === selectedDay} onClick={() => onSelectDay(day.day)}>
    {label}
  </button>
))}
{selectedActivity ? (
  <section className="rationalePanel" aria-live="polite">
    <span>AI REASONING // {selectedActivity.id}</span>
    <p>{selectedActivity.rationale}</p>
  </section>
) : null}
```

Activity blocks use `getActivityTone`. Only `.rationalePanel` receives its corner brackets.

- [ ] **Step 3: Replace ambient animation and map presentation**

```tsx
export function AtlasMotion() {
  return <div className="sectionRuleDraw" aria-hidden="true" />;
}
```

Keep the existing Maps browser-key handling and direct error messages. Replace only fallback markup and map classes so it uses flat token surfaces, 2px ink route lines, 3px data selected route lines, and square stops. Delete the unused status component.

- [ ] **Step 4: Run tests and commit**

Run: `npm run test:ui`

Expected: PASS.

```bash
git add components/group-agreement.tsx components/itinerary-tray.tsx components/trip-map.tsx components/atlas-motion.tsx
git rm components/atlas-status.tsx
git commit -m "feat: present plan evidence with Patch 03 components"
```

### Task 4: Replace font and stylesheet system

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: class names emitted by Tasks 2–3.
- Produces: locked tokens, responsive layout, valid contrast pairs, visible focus, and motion restrictions.

- [ ] **Step 1: Load the two approved Google font families**

```tsx
import { Archivo, JetBrains_Mono } from "next/font/google";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
```

Remove all existing font imports and use only these font variables on `html`/the stylesheet.

- [ ] **Step 2: Replace global CSS with the locked print system**

```css
:root { --bone:#E9E5DA; --bone-2:#DDD8C9; --paper:#F4F1E8; --ink:#121211; --ink-2:#3A3934; --ink-3:#6E6C63; --signal:#FF4A17; --verify:#00A88F; --data:#2E2AE8; --warn:#D9A404; --rule:#121211; --rule-thin:1px; --rule-bold:3px; --radius:0; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--data); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
```

Build the desktop 8/4 layout and a single-column 380px layout without page overflow. Use only allowed text/ground pairs, no transparency, radius, shadow, gradient, default palette class, or a third font.

- [ ] **Step 3: Run source checks and commit**

Run:

```powershell
rg -n "gradient|backdrop-blur|shadow-|rounded-" app components
rg -n "slate-|zinc-|gray-|indigo-|violet-" app components
```

Expected: no matches.

```bash
git add app/layout.tsx app/globals.css
git commit -m "style: apply Patch 03 print visual system"
```

### Task 5: Verify the complete acceptance surface

**Files:**
- Modify if required by a verified defect only: files from Tasks 1–4.

**Interfaces:**
- Consumes: completed application and test suite.
- Produces: the final human-review report; no deployment or push.

- [ ] **Step 1: Run automated checks**

Run: `npm run lint && npm run test:ui && npm run build`

Expected: each command exits with code 0.

- [ ] **Step 2: Measure every rendered text/ground pair**

Use a local contrast calculation for exactly these CSS pairs: ink/bone, ink-2/bone, data/bone, bone/ink, paper/ink, signal/ink, verify/ink, warn/ink, and bone/data. Confirm every body-sized pair is at least 4.5:1 and every display-sized pair is at least 3:1.

- [ ] **Step 3: Run browser evidence checks**

At desktop: capture landing, submit `Generate plan`, capture compact header plus ledger, select Mount Takao, and confirm that its block and Priya's ready chip use tension styling despite non-empty `satisfies`. At 380px: capture the stacked ledger and assert `document.documentElement.scrollWidth <= window.innerWidth`. Use Tab to verify the square 2px focus outline. Emulate reduced motion and confirm no animation runs.

- [ ] **Step 4: Re-run source rails, report, and stop**

Run the two source searches from Task 4, check that no forbidden reference-brand text occurs anywhere in product files, and run `git status --short`. Report files changed, grep results, every text/ground contrast value, accent-to-schema mapping, browser evidence, and the requested screenshots. Stop for human review.
