# Tessera Patch 03 Visual-System Design

**Status:** User-approved design; implementation requires review of this document before code changes.

## Goal

Replace the existing generic map dashboard presentation with a fixed light-ground print system that makes group negotiation legible before and after a plan is created. This is presentation work only: existing trip types, budget calculations, provider code, API route logic, and seed data remain unchanged.

## User journey and data flow

`TripStudio` renders four client-only screen states: `landing`, `generating`, `ready`, and `error`.

1. **Landing** shows the product thesis, the current destination in a single editable bare field, the existing travelers as read-only conflict evidence, and one `Generate plan` button.
2. **Generating** retains the hero and shows only the specified rule-draw and timeline snap motion.
3. **Ready** displays a compact generated-plan header, then the tradeoff ledger, then the planning workspace.
4. **Error** keeps the entered destination and gives a direct retry message.

On submit, the client posts the unchanged existing `travelers` and `constraints` request shape to `/api/plan`. The unchanged response `{ trip, source }` replaces the locally displayed trip and determines whether the compact header says `PLAN GENERATED // DEMO` or `PLAN GENERATED // LIVE`. The current demo deployment therefore produces a real, cached plan-generation action, while a later live-provider deployment keeps the same UI and client contract.

The seeded `Trip` is used only as the initial landing request source and as a safe fallback while no returned plan is available. No fields are added, removed, or transformed at the API boundary.

## Visual system

The implementation defines the exact Patch 03 tokens in `:root` and uses only those variables for rendered color. The only loaded faces are Archivo (including the width axis for expanded display headings) and JetBrains Mono, both from Google Fonts with the Latin subset.

The contrast law is fixed for every rendered text/ground pair:

- On `--bone`, text may be `--ink`, `--ink-2`, or `--data`. `--signal`, `--verify`, and `--warn` are fills, rules, and marks only.
- On `--ink`, text may be `--bone`, `--paper`, `--signal`, `--verify`, or `--warn`. `--data` is a rule or fill only.
- A `--data` fill may use `--bone` text; this is reserved for the rationale panel.

- Major regions alternate flat `--bone` and `--ink` full-bleed bands.
- Every major section uses a real-data mono kicker followed by an Archivo Expanded title. Kickers use `--ink-2` on bone grounds and `--bone` on ink grounds. `--ink-3` is limited to non-essential text at 18px or larger.
- Rules are the sole depth system: `1px` for local separation and `3px` for major boundaries.
- All radii are zero. There are no gradients, shadows, translucent surfaces, default palette classes, emoji icons, or decorative AI graphics.
- Only the selected rationale panel receives corner brackets (`⌐` and `¬`).
- Every interactive control receives a square `2px --data` focus outline through `:focus-visible`.

## Landing and generation

The landing hero is a full-bleed `--ink` band.

- Kicker: `TESSERA // GROUP TRIP NEGOTIATOR`.
- Title and the approved plain-language subhead describe the negotiation problem.
- The destination field is a bare line with a `--rule-bold` underline; it is the one input.
- The rectangular `Generate plan` button is the one action and posts to the existing plan endpoint.
- Read-only `TravelerChips` appear above or alongside the field. Each chip is a square ruled block with a real `T01`-style ID, traveler name, a neutral 3px `--ink` left edge, and a derived conflict summary from existing profile values: contribution/cap when available, pace, and a top interest or must-do. They do not add inputs or local state. Landing and generating chips never disclose post-plan semantic outcomes.
- The globe is a geometric, flat-block graphic only; it has no atmospheric effect or decorative accent.

## Ready-state order and components

The generated state has this fixed order at desktop sizes:

1. Compact header: `PLAN GENERATED // DEMO` or `PLAN GENERATED // LIVE`.
2. `TradeoffPanel`: full-width `--ink` band and the primary visual payoff.
3. Planning workspace: asymmetric 8/4 map-and-timeline plus traveler-transcript layout.

### TradeoffPanel

The ledger has one traveler row and the columns `TRAVELER`, `GOT`, `GAVE UP`, and `NET`. Existing agreement helpers and `Trip.tradeoffs` provide all its content. Satisfied outcomes use `--verify`; concessions use `--signal`; the derived group narration uses `--bone` text with a 3px `--data` left rule. On small screens, each row converts to a labeled stack rather than compressing columns.

### Traveler transcript and budget

The supporting rail uses a transcript instead of avatar cards or bubbles. Speakers are mono labels and AI/system-derived reasoning gets a 3px `--data` left rule. Traveler chips remain square with `T01 // NAME` labels. In the ready state, a traveler chip gets a `--signal` left edge if a related activity has `Activity.tension`; otherwise it gets `--verify` if a related activity has a non-empty `Activity.satisfies`; otherwise it retains the neutral `--ink` edge. The budget is one flat bar whose fill is derived from `Trip.budget.total` and its supplied ceiling: `--verify` below 90%, `--warn` within 10%, `--signal` over the ceiling. If no ceiling exists, it is a neutral `--ink` outline with `SPENT` only and no `CEILING` or `DELTA` values.

### Map and timeline

The optional Google map keeps its existing browser-key behavior and direct fallback message. Its surrounding presentation becomes a muted flat bone/ink surface; route lines are `--ink` at 2px and the selected day is `--data` at 3px. Stops are flat squares.

The timeline derives its controls from `Trip.days.length`; no day count is hardcoded. It presents real hour ticks, sequential `D01`-style labels, and flat activity blocks. `Activity.tension` has precedence and produces a `--signal` block even when `Activity.satisfies` is also populated. A non-empty `Activity.satisfies` without tension produces `--verify`; neither field produces a neutral `--ink` outline without a semantic fill. Selecting an activity exposes its existing `Activity.rationale` in a `--data` fill with `--bone` text. The selected rationale panel is the only place with corner brackets.

The existing Veto preview remains a display-only proposal. It is the sole `--signal` filled button, consistently labeled `Veto`/`Vetoed`; any reversal uses the normal ink treatment.

## Motion and responsive behavior

Motion is limited to a 240ms left-to-right section-rule draw on entry and 60ms sequential timeline-block snaps while a plan is generating. Hover inversion is immediate and has no transition. A reduced-motion media query disables all three effects.

At 380px, the layout becomes one column, traveler chip content wraps within its rules, timeline controls remain reachable without horizontal page scrolling, and the tradeoff ledger uses labeled rows. The layout is verified with a viewport screenshot and overflow check.

## Validation

Before reporting, the implementation will verify the seeded demo renders, day controls adapt to a different `Trip.days` count in automated coverage, and all existing behavior tests continue to pass. It will also run the directive's banned-token searches, contrast calculations for every rendered text/ground pair, keyboard focus check, reduced-motion check, 380px check, lint, and production build. Validation explicitly confirms that no `--data` text appears on `--ink`, no `--signal`/`--verify`/`--warn` text appears on `--bone`, and an activity with both `satisfies` and `tension` renders as tension (`--signal`). The final report will include those results, the accent-to-schema mapping, and screenshots of the landing state, ledger, and 380px state. No deployment or push occurs before human review.
