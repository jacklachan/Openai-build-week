# OpenAI Build Week Challenge — Structured Context Pack

> **Purpose of this file.** This is a deduplicated, restructured rewrite of the official OpenAI Build Week Challenge brief, official rules, and FAQ, optimized so that a coding agent (Codex, Claude Code, etc.) or a reasoning agent can consume it without ambiguity. Requirement strength is marked with **MUST** (hard/disqualifying), **SHOULD** (strongly advised), and **MAY** (optional). Where the source document contradicted itself or contained typos, the reconciliation is logged in §15 — treat this file as canonical, and the Devpost Official Rules + hackathon website as the ultimate legal source of truth.

---

## 0. Quick Reference

| Field | Value |
|---|---|
| Event | OpenAI Build Week Challenge ("the Hackathon") |
| Sponsor | OpenAI OpCo, LLC (San Francisco, CA) |
| Administrator | Devpost, Inc. (New York, NY) |
| Hackathon website | https://openai.devpost.com |
| Official rules | https://openai.devpost.com/rules |
| **Required build tools** | **Codex AND GPT-5.6** (both mandatory, both must be non-trivially used) |
| Tracks (pick exactly one) | Apps for Your Life · Work and Productivity · Developer Tools · Education |
| **Submission hard deadline** | **Tue July 21, 2026 · 5:00 PM PT** (= ~5:30 AM IST, Wed July 22)¹ |
| **Free-credits request deadline** | **Fri July 17, 2026 · 12:00 PM PT** (= ~12:30 AM IST, Sat July 18)¹ |
| Credits must be spent by | July 31, 2026 |
| Prize pool | $100,000 total cash + perks |
| Judging | 2 stages; Stage 2 = 4 equally-weighted criteria |
| Support | OpenAI Discord `#build-week-chat`, Devpost Discussion Board, support@devpost.com |

¹ IST conversions are derived (PDT = UTC−7, IST = UTC+5:30, +12h30m). Verify against the official clock before relying on them.

---

## 1. Mission — What To Build

Build a project using **Codex with GPT-5.6**. It can be an app, agent, website, game, workflow, developer tool, backend service, agent plugin (skill / MCP / tool), or something new.

The project **MUST** fit into **exactly one** of these four tracks:

| Track | Scope |
|---|---|
| **Apps for Your Life** | Consumer apps for everyday life — productivity, creativity, home, family, travel, health, personal finance. |
| **Work and Productivity** | Tools that make teams faster/more effective — workflow automation, customer support, analytics, sales, back-office ops. |
| **Developer Tools** | Tools for developers — testing, DevOps, agentic workflows, security. |
| **Education** | Projects that push AI forward for education — helping students, teachers, or educational organizations. Explicitly welcomes non-professional developers, students, and learners. |

Rules for track selection:
- **MUST** enter only one track per project. If it fits multiple, pick the closest match by primary audience/use case.
- A single Entrant **MAY** submit multiple projects, but each **MUST** be unique and substantially different (Sponsor's sole discretion).
- Each project is eligible for **one prize only**.

---

## 2. Mandatory Tool Usage & Proof of Use

This is the most common failure point. Both tools are required and their use **MUST** be genuine, not decorative.

- **MUST** use **Codex** to build the project (via ChatGPT app, Codex CLI, IDE extension, or SDK).
- **MUST** use **GPT-5.6** meaningfully inside the project.
- You **MAY** additionally use other OpenAI models/APIs and third-party SDKs, but eligibility hinges on Codex + GPT-5.6 being core, not incidental.

**Proof-of-use is evaluated across three artifacts — all three MUST show it:**
1. **Text description** — states what was built and how the tools were used.
2. **README** — documents where Codex accelerated the workflow, where key product/engineering/design decisions were made, and how GPT-5.6 is integrated.
3. **Demo video voiceover** — audibly explains how Codex AND GPT-5.6 were used (see §4).

**`/feedback` Codex Session ID (MUST):**
- Run `/feedback` inside the **primary Codex thread** where the majority of core functionality was built.
- This generates a unique Session ID.
- **MUST** paste that Session ID into the Devpost submission form.
- If work spanned multiple threads, submit the ID from the single most representative core-build thread (not a side/test thread), and document the multi-thread workflow in the README.

**Note:** Chatting with the plugin or running commands (e.g. brainstorming, `/checklist`) does **not** count as "building with Codex." Judges evaluate real built output.

---

## 3. Submission Deliverables — Master Checklist

All items below are **MUST** unless marked otherwise. This is the authoritative list an agent should verify against before submitting.

- [ ] **Working project** built with Codex + GPT-5.6, meeting all requirements.
- [ ] **One track/category** selected.
- [ ] **Text project description** explaining what it is and how it works.
- [ ] **Demo video** — public YouTube, <3 min, with voiceover (full spec in §4).
- [ ] **Code repository URL** — public (with an OSS license) **OR** private and shared with **testing@devpost.com** and **build-week-event@openai.com** (full spec in §5).
- [ ] **README** meeting the content spec in §5.
- [ ] **`/feedback` Codex Session ID** from the primary build thread.
- [ ] **(Plugins / Developer Tools only — MUST if applicable)** installation instructions, supported platforms, and a no-rebuild test path for judges (demo instance, sandbox, or test account).
- [ ] All materials in **English** (or an English translation provided for every non-English artifact).

Submission mechanics:
- Submit via the "Enter a Submission" flow at https://openai.devpost.com after registering ("Join Hackathon" → Devpost account).
- **MAY** save drafts before the deadline.
- After the Submission Period ends, **no changes** may be made to the submission (you may still update the project in your Devpost portfolio). See §11 for the narrow post-deadline exception.

---

## 4. Demo Video Specification (strict — read carefully)

The video requirement is stricter than typical hackathons. A screencast with only background music **fails** the requirement.

- **MUST** be **≤ 3 minutes** (judges are not required to watch past 3:00).
- **MUST** be uploaded to **YouTube** and set to **public**; the link goes on the submission form.
- **MUST** include a **clear demo of the working project**.
- **MUST** include a **voiceover** (your own voice OR AI/text-to-speech narration — both allowed).
- The voiceover **MUST** cover all three of:
  1. **What** the project does.
  2. **How Codex was used** — specific workflow/decisions, not "we used Codex to generate the backend." Prefer concrete framing, e.g. "used Codex to scaffold the data pipeline and iterate on the API integration."
  3. **How GPT-5.6 is integrated** and what it does in the product.
- **MUST NOT** include third-party trademarks or copyrighted music/material without permission.
- **SHOULD** show the Codex interface briefly on screen (not required, but a strong signal for the Technological Implementation criterion).
- **SHOULD** be recorded incrementally as you build, not the night before. Clarity beats polish.

---

## 5. Repository & README Specification

**Repository (MUST):**
- Provide a URL for judging/testing.
- Either **public** with a relevant open-source license attached, **or private** and shared with both:
  - `testing@devpost.com`
  - `build-week-event@openai.com`

**README (MUST contain):**
- Setup instructions.
- Sample data, if needed to run the project.
- Clear guidance for running and testing the project.
- A section documenting **how you collaborated with Codex**: where it accelerated the workflow, where key product/engineering/design decisions were made, and how GPT-5.6 + Codex contributed to the final result. (This directly feeds the Technological Implementation and Quality-of-Idea scores.)

**Testing access (MUST):**
- Judges are **not required** to build the project themselves and may judge from the description, images, and video alone.
- Provide a working demo link, test account, or sandbox wherever possible. If the site is private, include login credentials in the testing instructions.
- The project **MUST** be available free of charge and unrestricted for judging until the Judging Period ends.
- If the project runs on non-public/proprietary hardware (wearables, custom devices, etc.), Sponsor/Administrator **MAY** require physical access to the hardware.

---

## 6. Eligibility (condensed, actionable)

**Eligible:**
- Individuals at/above the age of majority in their residence at time of entry.
- Residents of countries/territories that support OpenAI's API services (list: https://platform.openai.com/docs/supported-countries) and not excluded below.
- Parents/guardians entering on behalf of students under 18 (or under local majority age).
- Teams of eligible individuals, and eligible organizations (incorporated at time of entry).
- Teams **MAY** span multiple countries as long as each member is individually eligible. Team members **MAY** also enter individually or on multiple teams.
- A Team/Organization **MUST** appoint one authorized **Representative** to submit on its behalf.

**Not eligible:**
- Residents of / organizations domiciled in unsupported territories, or anywhere US or local law prohibits participating/receiving a prize — including Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, Syria, and any OFAC-designated country.
- Sponsor/Administrator staff, their agents, immediate family/household, judges (and their employers), and affiliates — anyone with a real or apparent conflict of interest.

> Note for India-based entrants: India is an OpenAI-supported territory and is not on the exclusion list, so India-resident individuals/teams are eligible subject to the standard age and conflict-of-interest conditions. (Derived from the supported-countries reference; verify on the live list.)

---

## 7. Timeline & Deadlines

All times are **Pacific Time**. IST conversions are derived (+12h30m from PDT) — verify before relying on them.

| Milestone | Date & Time (PT) | Derived IST |
|---|---|---|
| Registration Period opens | Jul 9, 2026 · 10:00 AM | Jul 9 · ~10:30 PM |
| Submission Period opens | Jul 13, 2026 · 9:00 AM | Jul 13 · ~9:30 PM |
| **Free Codex credits — request deadline** | **Jul 17, 2026 · 12:00 PM** | **Jul 18 · ~12:30 AM** |
| **Submission hard deadline** | **Jul 21, 2026 · 5:00 PM** | **Jul 22 · ~5:30 AM** |
| Registration Period closes | Jul 21, 2026 · 5:00 PM | Jul 22 · ~5:30 AM |
| Credits expire (must be spent by) | Jul 31, 2026 | Jul 31 |
| Judging Period | Jul 22 (10:00 AM) – Aug 5, 2026 (5:00 PM) | — |
| Winners announced | ~Aug 12, 2026 · 2:00 PM | ~Aug 13 · ~2:30 AM |
| DevDay (1st-place passes) | Sep 29, 2026 (San Francisco) | — |

---

## 8. Free Codex Credits (logistics)

- Registered entrants **MAY** request **$100 in free Codex credits** while supplies last, subject to approval.
- **MUST** request via the form (https://forms.gle/Ncu6iGkaHq1SwUmEA) **by Jul 17, 2026 · 12:00 PM PT**. The form will **not reopen**; no credits distributed after it closes. The last batch is delivered shortly after close.
- **One code per Entrant.**
- Credits are prepaid, non-cash-redeemable, and **MUST** be used by **Jul 31, 2026**.
- Only **Codex credits** are provided for this event — no separate OpenAI API credits/tokens.
- Any usage beyond granted credits is the Entrant's responsibility. Monitor balance at **chatgpt.com → Settings → Usage**.
- When credits run out, Codex usage simply stops — you are **not** auto-charged **unless** "Auto top-up" is enabled in Settings → Usage. Keep it **off** to guarantee no overage.

---

## 9. Judging

**Stage 1 — Pass/Fail (baseline viability):** Does the project reasonably fit its track's theme AND reasonably apply the required tools (Codex + GPT-5.6)? Fail here = eliminated.

**Stage 2 — Four equally-weighted criteria** (25% each):

| Criterion | What judges look for |
|---|---|
| **Technological Implementation** | Thorough, skillful use of Codex; genuine effort; a working, non-trivial implementation. |
| **Design** | A complete, coherent, runnable product experience — not just a proof of concept. |
| **Potential Impact** | A credible, specific case for solving a real problem for a real audience, and evidence the solution actually addresses it. |
| **Quality of the Idea** | Creativity/novelty; genuine understanding of the problem space; differentiation from existing concepts. |

**Method:** Judging may use expert panels, peer review, and/or automated AI-driven analysis, in one or more rounds. Judges may or may not be publicly listed and may change.

**Tie-break order:** highest score on the first criterion above, then the next, in listed order (Technological Implementation → Design → Potential Impact → Quality of the Idea). Remaining ties → judges vote.

---

## 10. Prizes

**$100,000 total.** Each of the 4 tracks has a 1st and 2nd place. Each project can win **one** prize; a winner must pass identity/role verification.

| Placement (per track) | Cash | Additional |
|---|---|---|
| **1st Place** (each of the 4 tracks) | $15,000 | Up to 2 DevDay/Exchange passes per team (~$650 each) · Promotion by OpenAI Developers · Meet the Codex team · 1-year Pro account |
| **2nd Place** (each of the 4 tracks) | $10,000 | Promotion by OpenAI Developers · 1-year Pro account |

Per-track totals: $25,000 × 4 tracks = $100,000 cash.

**DevDay passes:** for 1st place only; DevDay is Sep 29, 2026 in San Francisco. Recipients cover all travel/lodging/visa/incidental costs. If unable to attend, up to 2 passes to an alternate DevDay Exchange event may be offered (subject to availability and later terms).

**Prize logistics:** non-transferable; Sponsor may substitute equal/greater value. Paid to the Entrant (individual) or the Representative (team/org), who allocates among members. Winners must return required forms (e.g. W-9 for US, W-8BEN for others) within 10 business days; prizes delivered within 60 days of receipt. Winners handle their own taxes, banking/FX compliance, and any wiring/exchange fees.

---

## 11. Rules & Compliance (actionable extracts)

These are the rule items that affect how you build and submit. Non-actionable legal boilerplate is indexed in the Appendix.

- **Original work (MUST):** The submission must be the Entrant's original work, solely owned, and must not violate any third party's IP/privacy/publicity rights.
- **Open source (MAY):** Standard libraries, frameworks, and open-source components are allowed. You **MUST** comply with their licenses and **MUST** build software that enhances/extends the underlying OSS (not just repackage it).
- **Third-party SDKs/APIs/data (MUST):** You must be authorized to use them under their terms/licenses.
- **Pre-existing projects (conditional):** Allowed **only if** meaningfully extended using Codex and/or GPT-5.6 **after the Submission Period start (Jul 13, 2026)**. Only new work is evaluated. You **MUST** clearly document new-vs-old with evidence (timestamped Codex session logs, dated commit history, or equivalent).
- **No financial/preferential support:** The project must not have been developed with funding/contract/commercial license from Sponsor or Administrator.
- **Language (MUST):** All materials in English, or English translations provided.
- **Multiple submissions (MAY):** Allowed if each is substantially different.
- **Post-deadline edits:** None allowed after the Submission Period, **except** a narrow Sponsor-permitted modification to remove infringing/PII/inappropriate material — and the submission must stay substantively the same.
- **IP license grant:** Entrants keep ownership. By submitting, you grant Sponsor/Devpost a non-exclusive license to use the submission for judging, and rights to promote it (and use participants' name/likeness/voice/image) for the Hackathon period + 3 years.
- **Conduct:** Sponsor/Administrator may disqualify for tampering, rule violations, or conflicts of interest, and may cancel/modify the Hackathon.

**Devpost Hackathons Plugin (OPTIONAL — MAY use):**
- An optional plugin installable in Codex inside ChatGPT that loads full Build Week context (rules, tracks, submission flow, resources) and acts as an AI assistant to ideate/plan/submit without leaving the editor.
- Requires a (free) Devpost account. Using it gives **no judging advantage** and does not affect eligibility. You can do everything via the website instead.
- **Not the source of truth** — Official Rules + website always prevail; the plugin's AI output may be inaccurate; it cannot guarantee credit access or prizes and cannot see your private code unless you share it.
- Because it runs inside Codex, sessions in it are Codex sessions — but only real building counts toward proof-of-use.
- Plugin commands: `$find-hackathons`, `$start-hackathon`, `$resources`, `$prepare-submission` (security/eligibility audit), `$submit`. During Build Week the plugin can only register you for Build Week.

---

## 12. Judges (as listed)

- **Thibault Sottiaux** — Head of Product & Platform
- **Kath Korevec** — Member of Product Staff
- **Tara Seshan** — Member of Product Staff
- **Leah Belsky** — VP of Education
- **Peter Steinberger** — Member of Technical Staff ("Clawfather")

(Panel may change and may not be listed individually.)

---

## 13. Official Tips (from the brief)

- **Start with the problem, not the model.** The strongest builds solve something real and reach for GPT-5.6 because the problem demanded it.
- **Record the demo as you go.** A clear 3-minute video with the required voiceover beats a rushed one.
- **Keep the repo testable.** Assume judges won't build it — clean instructions + sample data.
- **Watch credit usage.** Anything beyond granted credits is on you.
- **Recommended environment:** Codex inside the **ChatGPT desktop app (macOS or Windows)** for the best experience. The ChatGPT **mobile** app can monitor/steer sessions, but mobile currently only connects to Codex sessions running on **macOS**.

---

## 14. Setup Steps (participation flow)

1. Read the Official Rules (https://openai.devpost.com/rules).
2. (Optional) Install the Devpost Hackathons Plugin in Codex/ChatGPT.
3. Create an OpenAI account (https://auth.openai.com/create-account), download Codex, and request free Codex credits by **Jul 17, 12:00 PM PT**.
4. Read the docs — GPT-5.6 guide and the Codex quickstart — before building.
5. Register on Devpost ("Join Hackathon"), pick a track, build, and submit by **Jul 21, 5:00 PM PT**.

Support: OpenAI Discord `#build-week-chat`, the Devpost Discussion Board, or support@devpost.com.

---

## 15. Source-Document Reconciliation Log

Discrepancies/errors in the original file, and how this rewrite resolved them:

- **"free ts are exhausted" / "credits and credits"** — copy artifacts; the intended term is **Codex credits**. The credit amount is **$100** (confirmed in the FAQ).
- **Credit request deadline stated twice** — "Resources tab" (brief) vs. Google Form (rules), both **Jul 17, 12:00 PM PT**. Treated as the same single deadline; the form URL is authoritative.
- **"$100 in free credits" vs. "Codex credits"** — same $100 grant; this event distributes **Codex credits only**, not general API credits/tokens (per FAQ).
- **Submission Period start** — Registration opens Jul 9; the **Submission Period opens Jul 13**. Pre-existing-project extension work only counts from **Jul 13** onward.
- **Judging criteria wording** — "Quality of the Idea" appears with two phrasings (creativity/understanding vs. creativity/novelty/differentiation). Both are merged in §9; substance is identical.
- **Legal boilerplate (Official Rules §§10–16)** — liability release, publicity, general conditions, limitation of liability, disputes/arbitration (AAA, New York law), Devpost ToS/Privacy — is **non-actionable for building/submitting**. It is summarized in the Appendix rather than reproduced in full. Read the official rules directly if you need the exact legal language.

---

## Appendix — Legal Boilerplate Index (reference only, not needed to build)

Covered in the Official Rules but omitted from the actionable body above:

- **§10 Entry Conditions & Release** — non-fiduciary relationship; you agree to be bound by the rules; broad release/indemnification of "Released Parties"; no liability for technical failures, errors, lost submissions (sole remedy: request to resubmit).
- **§11 Publicity** — consent to promotional use of your name, likeness, voice, comments, city/country, worldwide, without further payment (unless prohibited by law).
- **§12 General Conditions** — Sponsor may cancel/modify/disqualify; Official Rules prevail over any conflicting material; rules may change (posted to website); Sponsor's IP reserved.
- **§13 Limitations of Liability** — release from liability re: prizes/participation (except where such limits are illegal, e.g. gross negligence, death/injury).
- **§14 Disputes** — individual binding **arbitration** (AAA), Federal Arbitration Act; no class actions; no punitive/consequential damages beyond actual out-of-pocket entry costs; governed by **New York** law.
- **§15 Additional Terms** — Devpost Terms of Service (https://info.devpost.com/terms) incorporated by reference; Official Rules control on conflict.
- **§16 Personal Information** — governed by Devpost Privacy Policy (https://info.devpost.com/privacy).

*End of context pack.*
