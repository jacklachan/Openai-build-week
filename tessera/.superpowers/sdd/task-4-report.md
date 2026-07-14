# Task 4 report — print visual system

## Scope delivered

- Replaced the global stylesheet rather than layering overrides on the prior design.
- Installed the locked root token block as the stylesheet's only CSS color literals. Every rendered surface, rule, text color, and state color now references those tokens.
- Replaced the prior font setup with exactly `Archivo` and `JetBrains_Mono` from `next/font/google`, each using the `latin` subset and a single CSS variable.
- Styled the landing, generating, retry, generated header, traveler states, tradeoff ledger and narration, map fallback and route overlay, transcript, budget states, Veto preview, timeline, rationale, and incomplete-plan state.
- Added the sole required markup hook: each timeline row exposes `--timeline-index`, allowing a CSS-only 60ms sequential snap stagger without changing the plan flow or presentation data.

## Constraint review

- The document uses the required 12-column generated layout, with the tradeoff panel before the 8/4 workspace split.
- The map fallback is a flat token surface. Route markers are square, and the live map remains the live map when a browser key is supplied.
- Tension and satisfied traveler/activity treatments use signal and verify respectively; neutral states retain an ink outline. The ceiling-free budget track remains an ink outline with no fill.
- The Veto control is the only signal-filled button. Other buttons use rectangular ink/bone treatments or ink outlines.
- All interactive controls receive the specified visible `:focus-visible` outline. The only corner brackets are on the selected rationale panel.
- The only motion is the 240ms rule draw and the staggered timeline snap. The reduced-motion media query disables animation and transition, and no animation changes opacity.
- The 380px rules use a single column, preserve wrapped traveler chips and labeled ledger rows, and keep controls/content visible without page-level horizontal overflow.

## Verification

| Check | Result |
| --- | --- |
| `rg -n "gradient|backdrop-blur|shadow-|rounded-" app components` | No matches (expected `rg` exit 1) |
| `rg -n "slate-|zinc-|gray-|indigo-|violet-" app components` | No matches (expected `rg` exit 1) |
| Palette/prohibited-style self-check | Only the locked token block contains hex values; no rgba/opacity/gradient/shadow/filter/blur/transparent declarations found |
| `git diff --check` | No whitespace errors |

## Landing repair — TDD evidence

- Added `tests/landing-hero.test.ts` before production edits. It server-renders the seeded `TripStudio` and requires the exact approved subhead; it also reads `app/globals.css` and requires `background: var(--ink)` in the base `.landingHero` rule.
- RED: `npx tsx --test tests/landing-hero.test.ts` failed both assertions after the selector was tightened to the base rule: the old subhead rendered, and `.landingHero` lacked the ink ground. No production source changed before this failure.
- GREEN: after the focused copy and stylesheet repair, the same command passed 2/2.
- Final verification: `npm run test:ui` passed 21/21, `npm run lint` passed, `npm run build` passed, and both required source rails returned no matches (expected `rg` exit 1).
- Scope: the repair only changes the approved landing subhead, the landing hero/form CSS, the focused regression test, and this report. It preserves the existing token, motion, focus, and plan-flow behavior.
| `npm run test:ui` | Pass — 19 tests, 0 failures |
| `npm run lint` | Pass |
| `npm run build` | Pass — production compilation, TypeScript, and static generation completed |

## Scope protection and concern

- No protected API, provider, seed, type, budget, data, or test file was changed. The pre-existing `package-lock.json` modification was left untouched and is excluded from the Task 4 commit.
- A local visual browser connection was unavailable, so the final visual inspection could not be captured there. The required source rails, static self-review, UI tests, lint, and production build all passed.

## Repair follow-up

- Converted the complete TradeoffPanel to an ink band. Ledger labels and NET text are now bone/paper on the ink ground, while GOT remains verify and GAVE UP remains signal on that same ink ground. The heading uses a data rule rather than data text, and narration retains bone text with its 3px data left rule.
- A ceiling-free budget now receives a compact paper surface selected only by its existing neutral track. Its SPENT text is ink, and the track is an unfilled ink outline. Ceiling-present verify/warn/signal track behavior is unchanged and no ceiling or delta is added.

## Repair verification

| Check | Result |
| --- | --- |
| Both required source rails | No matches (expected `rg` exit 1) |
| `npm run test:ui` | Pass — 19 tests, 0 failures |
| `npm run lint` | Pass |
| `npm run build` | Pass — production compilation, TypeScript, and static generation completed |
| `git diff --check` | No whitespace errors |
