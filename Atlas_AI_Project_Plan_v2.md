# Project Plan: Atlas AI — v2 (Build-Week-Aligned)

> **What this revision does.** Same soul as your original ("experience the trip before you book it"), but the center of gravity is moved from *rendering* to *reasoning*, the MVP is cut to something a team can actually ship and fully polish in ~7 days, and GPT-5.6 is repositioned as the visible star (which is what this event scores). Full change log at the bottom (§16).

---

## 0. Event Constraints (bake these into every decision)

- **Event:** OpenAI Build Week Challenge. **Track:** Apps for Your Life.
- **Hard deadline:** Jul 21, 2026 · 5:00 PM PT.
- **Mandatory tools:** Codex (to build) + GPT-5.6 (in the product), both *non-trivial and core*.
- **Judged on 4 equal criteria:** Technological Implementation (skillful model use), Design (complete runnable product, not a POC), Potential Impact (real problem actually solved), Quality of Idea (novel/differentiated).
- **Judges test the live app** and may judge from the video alone. It **must run flawlessly** on a shared link through Aug 5.
- **Cost reality:** only Codex credits are granted — GPT-5.6 + Google Maps API calls at runtime are on you. Keep the judge-facing demo cheap to run (cache, rate-limit, sensible model tier).

---

## 1. One-Line Pitch (revised)

**Atlas AI is a group-travel *negotiator*: friends drop their conflicting preferences into one conversation, and GPT-5.6 designs a trip that provably balances everyone — reasoning out loud, defending its tradeoffs, and letting anyone veto — while a live map turns the plan into something you can feel before you book.**

The map is still there and still cinematic. But the **product is the reasoning**, and the reasoning is the thing nobody else does well.

---

## 2. The Wedge (this is why you win, not just place)

Every AI travel app does "one person talks, AI spits out an itinerary." **None** solves the real reason group trips are painful: *reconciling conflicting people.* That is a genuine multi-stakeholder reasoning problem, it is exactly what a strong model is good at, and it is **visible and explainable** — which makes it a perfect demo and a perfect Technological-Implementation showcase.

Concretely, the differentiator is that Atlas can say, out loud:

> "Ravi capped the budget at $1,500 and wants adventure. Priya wants Michelin dinners and slow mornings. I've allocated 2 splurge meals and 8 casual ones, front-loaded hiking while Priya joins day trips, and kept us $120 under budget. Ravi, this costs you one fancy dinner — veto or accept?"

That paragraph is the whole product. If a judge sees *that*, you've won on Idea, Impact, and Tech Implementation in one shot. Build everything else in service of making that moment land.

---

## 3. The Problem (tightened)

Planning a trip *with other people* is the hard part. Solo planning is mostly solved. The pain is:
- Preferences conflict (budget vs. luxury, pace, food, energy level, accessibility) and get negotiated over fragmented WhatsApp threads, Notes, and 12 open tabs.
- No one has authority, so decisions stall.
- The person who does the work resents it; everyone else feels unheard.

Atlas replaces the group chat + spreadsheet + tab-chaos with one place where the AI does the reconciliation *and shows its work* so the group trusts the result.

---

## 4. The Solution & Core Philosophy

Traditional travel apps generate documents. **Atlas generates an agreement — and then makes it felt.**

Two layers, in priority order:
1. **The reasoning layer (the product):** GPT-5.6 models each person's preferences, resolves conflicts, proposes a plan, explains *why*, and updates the plan live as people push back. Every decision is explainable and vetoable.
2. **The experiential layer (the proof):** the map/timeline visualizes the agreed plan so the group *feels* the trip and buys in emotionally. The visualization exists to make the reasoning tangible — not the other way around.

Design law: **the world reacts to a decision the AI just explained.** Never animate something the AI can't justify.

---

## 5. How GPT-5.6 Is the Core Intelligence (event-mandatory — do not hand-wave this)

GPT-5.6 is not a preference-extractor bolted onto Google Maps. It is doing genuine reasoning:

- **Structured preference modeling** — turns freeform chat from multiple people into a typed `TravelerProfile` (budget band, pace, interests, dietary, accessibility, must-dos, dealbreakers) via structured tool-calling.
- **Conflict detection & negotiation** — identifies where profiles collide and proposes a *defensible* compromise with an explicit rationale, not a bland average.
- **Constrained itinerary synthesis** — composes a day-by-day plan against hard constraints (budget ceiling, dates, accessibility, opening hours from Places API) and soft preferences, and re-plans on edit.
- **Explainable decisions** — every itinerary item carries a one-line "why" the AI can defend when challenged.
- **Streaming narration** — narrates the plan as the map animates, and for the demo, generates the voiceover-friendly "here's the trip and the tradeoffs" summary.

This gives judges a clean, honest answer to "how did you use GPT-5.6?" — the model *is* the app.

---

## 6. Judge-Demo Core (the recut MVP — everything here MUST fully work)

Scope discipline is the whole game. Ship these, flawlessly, and nothing else until they're perfect:

1. **Multi-person conversational intake** — one shared conversation; each participant's preferences captured as a distinct profile (even if entered by one person for the demo: "add Priya, she wants…").
2. **Negotiated day-by-day itinerary** — GPT-5.6 produces a constrained plan with a visible per-decision rationale and a "tradeoffs" summary.
3. **Explainable, vetoable edits** — natural commands ("make it cheaper", "Ravi has less energy", "swap Osaka for Hiroshima", "Priya vetoes the 6am hike") that re-plan *and re-explain*.
4. **Live budget** — running total vs. the group's ceiling, updates on every edit. (This is cheap and scores directly on Impact.)
5. **One clean map + timeline view** — a reliable interactive map (2D or lightweight globe) with the route and a synced day-by-day timeline. Cinematic transitions are welcome; photorealism is not required.
6. **Async share link** — a read/comment link so "invite friends" is real without building multiplayer sync.

If time remains after all six are *polished*, and only then, pull from §7.

---

## 7. Deferred / Stretch / Future (honestly labeled)

**Deferred to stretch (only if the Core is perfect):**
- **Street View context** — cheap via embed; nice for the video. Good first stretch pull.
- **"Preview My Vacation" fly-through** — high demo value but heavy; only if the map pipeline is already smooth. A 20-second scripted camera path beats a buggy generative one.
- **Photorealistic 3D tiles** — swap the lightweight globe for Google Photorealistic 3D *only* once everything else is stable and you've confirmed it stays smooth and affordable.

**Cut from MVP (real-time multiplayer):**
- **Simultaneous live collaborative editing** — CRDT/presence sync is a multi-week subsystem and the #1 way this project misses the deadline half-broken. Replaced by the async share link in the Core. Multiplayer is a great *post-hackathon* headline, not a week-one build.

**Future vision (unchanged, out of scope):** automatic booking, live pricing, offline companion, AR navigation, AI travel journal.

---

## 8. Lean Architecture (agents collapsed into something real)

The nine-agent list is a great *conceptual* map but a trap to literally implement in a week. Implement **one orchestrator + tools**, and *describe* it as specialized reasoning:

- **Planner (single GPT-5.6 orchestrator)** — owns the conversation, the profiles, conflict resolution, and the plan.
- **Tools it calls:**
  - `places_search` / `place_details` (Google Places API) — real POIs, hours, price level.
  - `route` (Routes API) — travel legs and durations for the map.
  - `budget_estimate` — deterministic cost model (your code, not the LLM, so numbers are trustworthy).
  - `weather` (optional stretch) — seasonal context.
- **State:** `Trip { travelers[], constraints, days[], budget }` in Supabase/Firebase; the LLM reads/writes this via tools so the plan is grounded and re-playable.

This is honest ("multi-agent reasoning via tool-calling"), robust, and cheap. You can still *present* the reasoning as Food/Budget/Transport "considerations" in the UI.

---

## 9. Tech Stack (revised for shippability)

**Frontend:** Next.js · React · TypeScript · Tailwind · Framer Motion.
**Map (MVP):** a reliable interactive map — Google Maps JS + a **lightweight globe** (e.g., react-globe.gl / three-globe) for the hero moment. **Defer** React Three Fiber + Photorealistic 3D Tiles to stretch; they are the biggest time sinks.
**AI:** GPT-5.6 with structured tool-calling + streaming.
**Maps data:** Google Places API, Routes API, Street View (stretch, via embed).
**Backend:** Supabase or Firebase (auth, trip storage, share links). No realtime-sync engine in MVP.
**Deploy:** Cloud Run (your existing muscle memory) or Vercel — whichever gets a stable public URL fastest, since judges test live.

---

## 10. 7-Day Build Plan (parallelizable across the team)

- **Day 1 — Spine.** Repo + Codex session (capture the `/feedback` thread here), Next.js scaffold, GPT-5.6 tool-calling loop returning a hardcoded-constraints itinerary as JSON. Nail the data model `Trip`.
- **Day 2 — Reasoning.** Multi-profile intake → conflict detection → negotiated plan with per-item rationale. This is the wedge; give it the most time.
- **Day 3 — Map + timeline.** Lightweight globe + route render + synced day timeline. Reliable over fancy.
- **Day 4 — Editing + budget.** Natural-command re-planning that re-explains; live budget vs. ceiling.
- **Day 5 — Polish + share link + deploy.** Async share link; ship to a stable public URL; harden error states (judges will hit them).
- **Day 6 — Video + README.** Record the demo as the app stabilizes (don't leave it to Day 7). Write the README's Codex/GPT-5.6 section (§5 gives you the content).
- **Day 7 — Buffer + submit.** Re-test the live link cold, confirm it's free/open, submit early. Never submit in the last hour.

Stretch pulls (Street View, fly-through, photorealistic tiles) only slot in on Days 5–6 *after* the Core is perfect.

---

## 11. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Scope creep re-inflates the MVP | **High** | §6 is a contract. Nothing from §7 until all six Core items are polished. |
| 3D pipeline eats the week | High | Lightweight globe in MVP; photorealistic tiles are stretch-only. |
| GPT-5.6 runtime cost during judging | Medium | Cache plans, rate-limit, sensible model tier, seed a demo trip so judges don't cold-start expensive calls. |
| Live link breaks during judging | High | Deploy by Day 5, keep it up through Aug 5, test cold daily, include a fallback demo account + the video. |
| AI "balances preferences" but can't defend it | Medium | Force a `rationale` field on every decision; the demo must show a challenge → re-explanation. |
| Budget numbers hallucinated | Medium | Compute budget in code, not the LLM. |

---

## 12. Demo Video Script Skeleton (≤3 min, voiceover mandatory — this is scored)

The voiceover **must** cover *what you built* + *how you used Codex* + *how you used GPT-5.6*. Suggested beats:

1. **0:00–0:20 — The problem, concretely.** "Planning a trip with three friends means reconciling three people who want different things." Show the messy alternative in one shot.
2. **0:20–1:20 — The wedge, live.** Enter three conflicting travelers; GPT-5.6 negotiates; the map builds; the AI *explains a tradeoff out loud*. This is the money shot.
3. **1:20–2:00 — Challenge it.** Someone vetoes; the AI re-plans and re-explains; budget updates live.
4. **2:00–2:40 — How it's built.** "We built Atlas with Codex — it scaffolded the tool-calling loop and the trip data model, and we iterated on the negotiation logic with it." Then: "GPT-5.6 does the reasoning: structured preference modeling, conflict resolution, and explainable planning." Be specific, not "we used AI to build it."
5. **2:40–3:00 — The vision.** One line on where it goes (booking, live pricing). Close on the cinematic map.

---

## 13. Design Principles (trimmed)

1. Conversation first. 2. The world is the interface (but it serves the reasoning). 3. **Show the AI's reasoning, don't hide it.** 4. Explain every decision; make every decision vetoable. 5. Progressive complexity. 6. Cinematic — but never at the cost of "does it run."

---

## 14. Export (unchanged, MVP-light)

Shareable link (Core) · PDF itinerary · Google Maps route links · packing checklist. Calendar export is a stretch nicety.

---

## 15. Why This Version Scores Better (map to the rubric)

- **Tech Implementation ↑** — GPT-5.6 does visible, non-trivial reasoning (negotiation, explainability), not just extraction.
- **Idea ↑** — group-preference reconciliation is a real, under-served, defensible wedge instead of "another AI trip planner."
- **Design ↑** — a 6-item core the team can actually finish and polish beats 8 half-built features.
- **Impact ↑** — it solves the *actual* pain (reconciling people) and shows its work, so the case is credible and demonstrated.

---

## 16. Revision Notes (what changed vs. your original, and why)

- **Repositioned the product from rendering → reasoning.** Your best line ("the AI balances everyone's preferences") was one bullet; it's now the entire thesis, because it's the only AI-hard, differentiated thing in the deck and it's exactly what this event scores.
- **Cut real-time multiplayer from the MVP** → async share link. Live collaborative sync is a multi-week subsystem and the biggest deadline risk.
- **Demoted photorealistic 3D tiles + React Three Fiber to stretch** → lightweight globe for MVP. Same "wow," a fraction of the build risk.
- **Collapsed 9 agents → 1 orchestrator + tools.** Honest, robust, cheap; still presentable as "specialized reasoning."
- **Recut the MVP** from 8 must-haves to 6 finishable ones, with a strict "nothing new until the core is perfect" rule.
- **Added:** event-constraints banner, explicit GPT-5.6-usage section, 7-day plan, risk register, demo-video script, runtime-cost note, and rubric mapping — because judges test the live app and score the video, and none of that was in the original.
- **Kept:** the cinematic soul, the map, Street View, "Preview My Vacation," budget dashboard, and the full future vision — just correctly sequenced.
