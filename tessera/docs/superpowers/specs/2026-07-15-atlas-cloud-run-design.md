# Tessera Atlas and Cloud Run Design

**Status:** Atlas approved from the visual companion; deployment requested for GCP project `tessera-502419`.

## Goal

Turn Tessera into a map-first, production-quality web application that can run safely on Cloud Run now and accept the remaining trip-planning logic and paid-service credentials later.

## Product direction

Atlas is the foundation: a full-bleed Tokyo map is the primary workspace, with an unobtrusive decision rail and itinerary dock. It preserves the current group-agreement interaction and adds clear presentation surfaces for live plan status, weather, routing, and policy decisions.

The interface borrows the copy-owned component discipline of ReUI: accessible buttons, drawers, segmented controls, command-style actions, and compact status cards. It uses an editorial visual hierarchy inspired by Recent, one small particle-like ambient accent inspired by the Framer reference, and restrained Anime.js motion only for route reveal, panel entrance, and state changes. All motion must respect `prefers-reduced-motion`.

## Frontend boundaries

- `TripStudio` owns only screen state: selected day, selected workspace mode, and an optional preview revision.
- A small API adapter owns calls to `/api/plan` and `/api/edit`; the UI remains usable with the checked-in demo trip when `DEMO_ONLY=true`.
- The map component keeps its existing optional Google Maps 3D behavior. A browser key is never embedded in source and its absence is a labelled, polished fallback state.
- Weather, transit, and destination data panels use a typed status contract (`loading`, `ready`, `unavailable`) so a backend can later provide live data. No browser calls to third-party APIs are added in this phase.
- The disabled command composer becomes an active form only when the edit adapter is connected; it must expose loading, success, and recoverable-error states.

## Deployment architecture

```text
GitHub branch -> Cloud Build -> Artifact Registry -> Cloud Run (asia-south1)
                                               -> service account
                                               -> Secret Manager (when keys are supplied)
```

- Build a small, multi-stage Docker image for Next.js standalone output.
- Deploy a public Cloud Run service named `tessera-web` in `asia-south1`; the Cloud Run URL is the initial production endpoint. A custom domain and CDN are deliberately out of scope until the user supplies a domain.
- Use 1 vCPU, 512 MiB memory, concurrency 40, maximum 4 instances, and a 60-second request timeout. Minimum instances remain 0 to avoid idle cost until traffic and latency requirements are measured.
- Add a startup probe to `/api/health`; the service is only allowed to receive production traffic after a direct health check succeeds.
- Enable Cloud Run, Cloud Build, Artifact Registry, Secret Manager, and required IAM APIs. Keep non-secret configuration as environment variables; use Secret Manager only for `OPENAI_API_KEY`, `GOOGLE_MAPS_SERVER_KEY`, and future server-side credentials.
- The first safe deployment uses `DEMO_ONLY=true`. A later secret-backed revision can set `DEMO_ONLY=false` without changing the client contract.

## Validation

- The existing seed, orchestrator, replan, safeguards, UI tests, lint, and production build must all pass.
- The container must build locally and respond successfully from `/api/health` before cloud deployment.
- After deployment, verify the Cloud Run URL, health endpoint, headers, and the seeded UI in a browser.
- Deployment failures are investigated from the actual Cloud Build and Cloud Run logs before configuration is changed.
