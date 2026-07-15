# Tessera Atlas and Cloud Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Atlas map-first Tessera frontend and deploy a secure demo-mode baseline to Cloud Run in `tessera-502419`.

**Architecture:** Keep `Trip` as the only frontend data contract. Add a thin client adapter for the existing `/api/plan` and `/api/edit` routes, then use the existing demo trip whenever `DEMO_ONLY=true`. Package Next.js standalone output in Docker, build it with Cloud Build, and deploy a public Cloud Run service with a dedicated runtime service account and startup probe.

**Tech Stack:** Next.js 16, React 19, TypeScript, Anime.js 4, Docker, Cloud Build, Artifact Registry, Cloud Run, Secret Manager.

## Global Constraints

- Preserve `lib/types.ts` and the existing `/api/plan`, `/api/edit`, and `/api/health` contracts.
- Never put an API key in source, Docker build arguments, client JavaScript, git history, or Cloud Build substitutions.
- The initial Cloud Run deployment must set `DEMO_ONLY=true`; only a later revision may receive OpenAI secrets.
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` is optional and must fall back honestly when absent.
- Use `asia-south1`, service name `tessera-web`, Artifact Registry repository `tessera`, and runtime service account `tessera-run`.
- Respect `prefers-reduced-motion`; animations cannot be required for any interaction or content.

---

### Task 1: Make the Next.js build container-ready

**Files:**
- Modify: `next.config.ts`
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `cloudbuild.yaml`

**Interfaces:**
- Produces: a `node server.js` standalone application listening on `PORT=8080`.
- Consumes: Cloud Run's `PORT`, `NODE_ENV`, and `DEMO_ONLY` environment variables.

- [ ] **Step 1: Enable standalone output**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Add the multi-stage Dockerfile**

```dockerfile
FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM dependencies AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
```

- [ ] **Step 3: Keep the Cloud Build context small**

```gitignore
node_modules
.next
.git
.env*
.superpowers
coverage
```

```yaml
steps:
  - name: gcr.io/cloud-builders/docker
    args: ["build", "--tag", "${_IMAGE}", "."]
images: ["${_IMAGE}"]
```

- [ ] **Step 4: Prove the production image locally**

Run: `docker build -t tessera-web:local .`

Run: `docker run --rm -e DEMO_ONLY=true -p 8080:8080 tessera-web:local`

Expected: `curl http://127.0.0.1:8080/api/health` returns `{"ok":true}`.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts Dockerfile .dockerignore cloudbuild.yaml
git commit -m "build: package Tessera for Cloud Run"
```

### Task 2: Build the Atlas interaction shell

**Files:**
- Modify: `components/trip-studio.tsx`
- Modify: `components/group-agreement.tsx`
- Modify: `app/globals.css`
- Create: `components/atlas-status.tsx`
- Create: `components/atlas-motion.tsx`
- Test: `tests/studio.test.ts`

**Interfaces:**
- `AtlasStatus` consumes `Trip` and returns semantically labelled trip health, weather, and route placeholders.
- `AtlasMotion` consumes no trip data and only decorates elements tagged with `data-atlas-motion`.

- [ ] **Step 1: Add a failing test for backend-safe status copy**

```ts
import { getAtlasSignals } from "../lib/studio";

test("derives a deterministic Atlas status without a live provider", () => {
  const signals = getAtlasSignals(trip);
  assert.equal(signals.tripHealth, "3 preferences represented");
  assert.equal(signals.weather.status, "unavailable");
});
```

- [ ] **Step 2: Run the UI test to verify RED**

Run: `npm run test:ui`

Expected: fail because `getAtlasSignals` is absent.

- [ ] **Step 3: Add the smallest view-model**

```ts
export function getAtlasSignals(trip: Trip) {
  return {
    tripHealth: `${trip.travelers.length} preferences represented`,
    weather: { label: "Weather provider", status: "unavailable" as const },
    route: { label: "Live routing", status: "unavailable" as const },
  };
}
```

`AtlasStatus` renders these values as labelled status cards; it must not fetch from a public API in the browser.

- [ ] **Step 4: Add only the needed motion dependency and component**

Run: `npm install animejs`

```tsx
"use client";
import { useEffect } from "react";
import { animate, stagger } from "animejs";

export function AtlasMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate("[data-atlas-motion]", { opacity: [0, 1], translateY: [10, 0], delay: stagger(70), duration: 420, ease: "out(3)" });
  }, []);
  return null;
}
```

- [ ] **Step 5: Compose the Atlas layout**

Keep `TripMap`, `ItineraryTray`, `GroupAgreement`, and the map route overlay. Add an Atlas toolbar, compact status chips, and the `AtlasStatus` cards; use native buttons, ARIA labels, and CSS transitions for controls. The command composer remains disabled in demo mode.

- [ ] **Step 6: Verify GREEN and visual behavior**

Run: `npm run test:ui && npm run lint && npm run build`

Expected: all commands exit 0. In a browser, the route and panels appear without motion when reduced motion is enabled.

- [ ] **Step 7: Commit**

```bash
git add components app/globals.css lib/studio.ts tests/studio.test.ts package.json package-lock.json
git commit -m "feat: add Atlas production frontend shell"
```

### Task 3: Add deployment safeguards and a Cloud Run runtime identity

**Files:**
- Modify: `app/api/health/route.ts`
- Create: `scripts/deploy-cloud-run.ps1`

**Interfaces:**
- `/api/health` returns `{ ok: true, service: "tessera-web", mode: "demo" | "live" }`.
- `deploy-cloud-run.ps1` requires only project ID, region, and image URI; it does not read or print secrets.

- [ ] **Step 1: Add the health contract test**

```ts
test("health endpoint reports the runtime mode", async () => {
  const { GET } = await import("../app/api/health/route");
  const response = GET();
  assert.equal(response.status, 200);
});
```

- [ ] **Step 2: Update the health endpoint**

```ts
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    mode: process.env.DEMO_ONLY === "true" ? "demo" : "live",
    service: "tessera-web",
  });
}
```

- [ ] **Step 3: Make deployment explicit and repeatable**

```powershell
param([string]$ProjectId = "tessera-502419", [string]$Region = "asia-south1", [Parameter(Mandatory)][string]$ImageUri)
$gcloud = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$serviceAccount = "tessera-run@$ProjectId.iam.gserviceaccount.com"
& $gcloud run deploy tessera-web --project $ProjectId --region $Region --image $ImageUri --service-account $serviceAccount --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 --concurrency 40 --max-instances 4 --min-instances 0 --timeout 60s --startup-probe "httpGet.path=/api/health,httpGet.port=8080,periodSeconds=10,timeoutSeconds=5,failureThreshold=3" --set-env-vars "NODE_ENV=production,DEMO_ONLY=true" --quiet
```

- [ ] **Step 4: Verify local health**

Run: `npm run build` and use the local container command from Task 1.

Expected: the returned JSON has `ok: true` and `mode: "demo"`.

- [ ] **Step 5: Commit**

```bash
git add app/api/health/route.ts scripts/deploy-cloud-run.ps1
git commit -m "ops: add repeatable Cloud Run deployment"
```

### Task 4: Create and validate the Cloud Run service

**Files:**
- No source changes.

**Interfaces:**
- Produces: `https://tessera-web-<hash>-as.a.run.app` or equivalent Cloud Run service URL.

- [ ] **Step 1: Select the provided project and enable required APIs**

```powershell
gcloud config set project tessera-502419
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com iamcredentials.googleapis.com
```

- [ ] **Step 2: Create runtime identity and Artifact Registry**

```powershell
gcloud iam service-accounts create tessera-run --display-name "Tessera Cloud Run runtime"
gcloud artifacts repositories create tessera --repository-format docker --location asia-south1 --description "Tessera web images"
```

- [ ] **Step 3: Build and publish the production image**

```powershell
$image = "asia-south1-docker.pkg.dev/tessera-502419/tessera/tessera-web:$((git rev-parse --short HEAD))"
gcloud builds submit --config cloudbuild.yaml --substitutions "_IMAGE=$image" .
```

- [ ] **Step 4: Deploy demo mode and obtain the URL**

```powershell
.\scripts\deploy-cloud-run.ps1 -ImageUri $image
gcloud run services describe tessera-web --region asia-south1 --format "value(status.url)"
```

- [ ] **Step 5: Verify deployment**

Run: `Invoke-WebRequest "$url/api/health" | Select-Object -Expand Content`

Expected: an HTTP 200 body including `"ok":true` and `"mode":"demo"`.

- [ ] **Step 6: Enable live planning only after secrets are present**

```powershell
gcloud secrets create openai-api-key --replication-policy automatic
gcloud secrets versions add openai-api-key --data-file <path-to-secret-file>
gcloud secrets add-iam-policy-binding openai-api-key --member "serviceAccount:tessera-run@tessera-502419.iam.gserviceaccount.com" --role roles/secretmanager.secretAccessor
gcloud run services update tessera-web --region asia-south1 --update-secrets "OPENAI_API_KEY=openai-api-key:latest" --update-env-vars "DEMO_ONLY=false"
```

Do not run this step until a real key is supplied locally by the user.

## Self-Review

- **Spec coverage:** Task 1 packages the app, Task 2 applies the approved Atlas UI, Task 3 supplies health and a repeatable deployment boundary, and Task 4 creates and verifies the deployed service.
- **Placeholder scan:** the design contains no incomplete implementation steps; live OpenAI mode is intentionally deferred because no secret exists in the workspace.
- **Type consistency:** `Trip` remains the page payload and the health endpoint returns a JSON object without changing API plan/edit contracts.
