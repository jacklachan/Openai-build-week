# Tessera — Build Week submission evidence

## What a judge can test without credentials

1. Open the deployed app or run `npm install && npm run dev`.
2. Select **Load the Tokyo demo**.
3. Compare **Best fairness**, **Lowest friction**, and **Most headroom** in Proposal Arena.
4. Select **Lowest friction**: the 3D map focuses on the substituted Day 2 stop and the Trip Pact names the compromise.
5. Use the Veto flow, complete group check-in, and download the agreement brief.

No model key, Maps key, payment method, or account is required for that path.

## Required tooling evidence

- **Codex + GPT-5.6 contribution:** the team used GPT-5.6 through Codex for the app architecture, contract validation, 3D map integration, Proposal Arena, and tests. The public commit history shows the work completed during Build Week.
- **Primary Codex `/feedback` session ID:** `ADD BEFORE SUBMISSION`
- **Optional live provider:** Gemini can generate a live plan when `GEMINI_API_KEY` is configured. It is explicitly optional and is not represented as GPT-5.6.

## Technical proof points

- A no-key deterministic trip and revision make the critical demo reproducible.
- Every plan is parsed against the Trip contract; code recomputes budget totals and rejects malformed data.
- Proposal Arena creates and compares three concrete compromises, including itinerary changes that update the 3D route.
- The test suite covers demo mode, replan diffs, safeguards, UI evidence, health status, and proposal mutations.

## Video outline — under 90 seconds

1. **Problem (0–12s):** “Group trip planners give one answer and hide who lost.”
2. **Conflict (12–27s):** Show Ravi, Priya, and Mei’s competing needs.
3. **Arena (27–52s):** Switch among the three compromises; show the 3D map jump to the changed stop.
4. **Decision (52–72s):** Show the Trip Pact, veto, and check-in reaching a group decision.
5. **Build evidence (72–90s):** “Built with GPT-5.6 through Codex; the no-key demo is guarded by contract validation and a tested decision engine.”

## Final submission checklist

- [ ] Public repository URL is included.
- [ ] Deployed no-key demo URL and local setup are included.
- [ ] YouTube video is public, has audio, and is under three minutes.
- [ ] The video explains the contribution of Codex and GPT-5.6.
- [ ] The primary Codex `/feedback` session ID is entered here and in Devpost.
- [ ] The README links to this guide and explains the optional Gemini provider honestly.
