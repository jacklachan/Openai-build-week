# Tessera

**Tessera turns conflicting group-trip preferences into an inspectable agreement.**

Instead of generating an itinerary for one person, Tessera models what each traveler needs, names the compromises, keeps the group within budget, and re-negotiates the plan when someone vetoes it.

This project is an entry for the OpenAI Build Week Challenge in the **Apps for Your Life** track.

## The demo scenario

The included zero-cost Tokyo scenario has three friends with incompatible needs:

- Ravi wants an adventure day without exceeding the group budget.
- Priya wants vegetarian food and slow mornings.
- Mei wants anime and nightlife.

The product outcome is not just an itinerary. It is a Group Agreement: the must-dos each traveler receives, their explicit concessions, why every activity exists, and a deterministic budget.

## The product loop

Tessera is built around a group decision, not a prettier itinerary:

1. **Import the conversation.** A WhatsApp `.txt` export or pasted group chat is read locally into editable traveler preferences. The raw chat is not sent by this step.
2. **Ask one consequential question.** The guided Tokyo demo identifies the hidden conflict and asks Priya the single answer that changes the route.
3. **Make the pact inspectable.** The 3D route, explicit trade-offs, individual check-in, and veto are tied to the same trip contract.
4. **Pressure-test reality.** The simulated disruption drill names who would lose if conditions change, then makes the alternative route and budget visible before the group agrees.
5. **Take it back to the group.** Share uses the device share sheet, copy fallback, or a WhatsApp handoff; the user chooses the destination group and no WhatsApp credential is needed.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

For optional live planning, configure these values in `.env.local` or your deployment provider. Never commit the file. Gemini is kept as an optional provider for builders with a free-tier quota; it is never required to run or judge Tessera.

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
```

### Run a fully local, free model

Tessera also supports an Ollama model running on the same machine. Install Ollama, pull a capable local model, start the Ollama service, then add its model name to `.env.local`:

```dotenv
OLLAMA_MODEL=llama3.2:3b
OLLAMA_HOST=http://127.0.0.1:11434
```

When `GEMINI_API_KEY` is absent and `OLLAMA_MODEL` is set, `/api/plan` uses the local model. Tessera still validates its JSON and recomputes the budget. This local provider is intended for local development; a deployed Cloud Run service cannot access Ollama on your laptop.

Set `DEMO_ONLY=true` to serve the included, vetted demo plan and veto response with **zero** Gemini or Maps calls. With no Gemini key, Tessera automatically stays in the same no-key judge mode.

## Deploy to Google Cloud Run

The checked-in release target is project `tessera-502419` in `asia-south1`. The initial service is intentionally deployed with `DEMO_ONLY=true`, so it does not need a Gemini key. A Google Maps browser key is optional for demo planning, but supplying it at build time enables the interactive trip map.

```powershell
$image = "asia-south1-docker.pkg.dev/tessera-502419/tessera/tessera-web:$(git rev-parse --short HEAD)"
$mapsKey = ""
if (Test-Path .env.local) {
  $match = Select-String -Path .env.local -Pattern '^NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=(.+)$' | Select-Object -First 1
  if ($match) { $mapsKey = $match.Matches[0].Groups[1].Value.Trim() }
}
gcloud builds submit --project tessera-502419 --config cloudbuild.yaml --substitutions "_IMAGE=$image,_NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=$mapsKey" .
.\scripts\deploy-cloud-run.ps1 -ImageUri $image
```

`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` is a browser key, not a server secret: restrict it to the deployed site and the Maps JavaScript API. It is passed only into the Next.js production build, never committed or set as a Cloud Run runtime variable. Leave it empty to keep the explicit map setup notice. The script deploys a public HTTPS service with a dedicated runtime service account, a `/api/health` startup probe, zero minimum instances, and bounded concurrency. It never sends or prints server secrets.

To enable live planning later, store `GEMINI_API_KEY` in Secret Manager, grant `tessera-run@tessera-502419.iam.gserviceaccount.com` `roles/secretmanager.secretAccessor`, mount the secret on Cloud Run, and then change `DEMO_ONLY` to `false`. A Maps browser key remains optional; without it the interface shows an explicit map setup notice rather than a fake Earth view.

## Backend contract for the app UI

The UI can use the API immediately; all JSON is validated on the server.

### Load the no-cost demo

`GET /api/demo` returns the initial Tokyo agreement. `GET /api/demo?version=2` returns the vetted post-veto revision. Both work without any environment variables or paid API calls.

### Create a plan

`POST /api/plan`

```json
{
  "travelers": [
    {
      "id": "ravi",
      "name": "Ravi",
      "pace": "packed",
      "interests": ["adventure", "food"],
      "dietary": [],
      "accessibility": [],
      "mustDo": ["Hike Mount Takao"],
      "dealbreakers": ["Fine dining every night"]
    }
  ],
  "constraints": {
    "destination": "Tokyo, Japan",
    "days": 3,
    "currency": "USD",
    "budgetCeiling": 4500
  }
}
```

Response:

```json
{ "trip": "Trip", "source": "live | cache | demo" }
```

Send `Accept: text/event-stream` to receive the same payload as an SSE `trip` event.

### Veto and re-negotiate

`POST /api/edit`

```json
{
  "trip": "the current Trip object",
  "command": "Priya vetoes the 6am Mount Takao hike."
}
```

Response:

```json
{
  "trip": "the next Trip version",
  "diff": {
    "previousVersion": 1,
    "nextVersion": 2,
    "removedActivities": [],
    "addedActivities": [],
    "budget": { "before": 870, "after": 918, "delta": 48 },
    "changedTradeoffs": true
  },
  "source": "live | demo"
}
```

The UI should derive the Group Agreement from the frozen `Trip` contract:

- traveler `mustDo` and `dealbreakers`;
- per-activity `satisfies`, `rationale`, and `tension`;
- group-level `tradeoffs`;
- code-computed `budget`.

Do not add a black-box fairness score or change `lib/types.ts` without an explicit contract decision.

## Safety and cost controls

- The landing demo is sourced from `data/seed-demo-trip.json`.
- `DEMO_ONLY=true` avoids provider calls entirely.
- Identical live planning requests are cached in-process by a SHA-256 input hash.
- `/api/plan` and `/api/edit` have a five-request-per-minute per-instance limiter.
- Gemini is asked for JSON only, then every final plan is server-validated: activity rationales are required, traveler ids are checked, and budget totals are recalculated in code.

## Verification

```bash
npm run validate:seed
npm run verify:orchestrator
npm run verify:replan
npm run verify:safeguards
npm run lint
npm run build
```

## Deploy

The included Cloud Build configuration passes the optional browser-only Maps key at build time and keeps server secrets in the deployment environment.

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions "_IMAGE=$image,_NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=$mapsKey"
```

## How Codex, GPT-5.6, and the optional LLM were used

GPT-5.6 was used through Codex to scaffold the Next.js application, freeze the trip data contract, build the server routes, implement the deterministic budget validator, create the 3D map and Proposal Arena, and write the verification suite. The key product decision was to make a group compromise visible and challengeable, rather than produce another opaque AI itinerary. The dated commit history and the Codex session below are the evidence for that work.

Gemini is an optional server-side provider for builders who have a free-tier quota. It returns JSON only; Tessera parses it, validates it on the server, and recomputes the budget rather than trusting model math. It is not presented as GPT-5.6. Without a Gemini key, the full judge path remains runnable using the deterministic Tokyo plan, One Question replay, Proposal Arena, 3D map, disruption drill, veto, and agreement export.

Before submission, use the [three-minute judge run](docs/judge-demo.md), complete the short evidence checklist in [docs/build-week-submission.md](docs/build-week-submission.md), then add the primary Codex `/feedback` session ID there and in the Devpost form.

## License

MIT. See [LICENSE](LICENSE).
