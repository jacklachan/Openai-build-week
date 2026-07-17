import assert from "node:assert/strict";

import seedTrip from "../data/seed-demo-trip.json";
import { POST as editPlan } from "../app/api/edit/route";
import { GET as getDemo } from "../app/api/demo/route";
import { POST as createPlan } from "../app/api/plan/route";
import { parseTrip } from "../lib/plan-validation";

async function main() {
  const seed = parseTrip(seedTrip);
  const planRequest = {
    travelers: seed.travelers,
    constraints: seed.constraints,
  };

  const previousDemoOnly = process.env.DEMO_ONLY;
  const previousGeminiApiKey = process.env.GEMINI_API_KEY;
  delete process.env.DEMO_ONLY;
  delete process.env.GEMINI_API_KEY;

  const noKeyResponse = await createPlan(
    new Request("http://localhost/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "demo-no-key" },
      body: JSON.stringify(planRequest),
    }),
  );
  const noKeyPayload = await noKeyResponse.json();
  assert.equal(noKeyResponse.status, 200);
  assert.equal(noKeyPayload.source, "demo");
  assert.equal(noKeyPayload.trip.version, 1);

  const noKeyEditResponse = await editPlan(
    new Request("http://localhost/api/edit", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "demo-no-key-edit" },
      body: JSON.stringify({
        trip: noKeyPayload.trip,
        command: "Priya vetoes the 5:30am Mount Fuji start.",
      }),
    }),
  );
  const noKeyEditPayload = await noKeyEditResponse.json();
  assert.equal(noKeyEditResponse.status, 200);
  assert.equal(noKeyEditPayload.source, "demo");
  assert.equal(noKeyEditPayload.trip.version, 2);

  if (previousDemoOnly === undefined) {
    delete process.env.DEMO_ONLY;
  } else {
    process.env.DEMO_ONLY = previousDemoOnly;
  }
  if (previousGeminiApiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = previousGeminiApiKey;
  }

  process.env.DEMO_ONLY = "true";

  const planResponse = await createPlan(
    new Request("http://localhost/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "demo-plan" },
      body: JSON.stringify(planRequest),
    }),
  );
  const planPayload = await planResponse.json();
  assert.equal(planResponse.status, 200);
  assert.equal(planPayload.source, "demo");
  assert.equal(planPayload.trip.version, 1);

  const sseResponse = await createPlan(
    new Request("http://localhost/api/plan", {
      method: "POST",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
        "x-forwarded-for": "demo-sse",
      },
      body: JSON.stringify(planRequest),
    }),
  );
  assert.match(sseResponse.headers.get("content-type") || "", /text\/event-stream/);
  assert.match(await sseResponse.text(), /"source":"demo"/);

  const editResponse = await editPlan(
    new Request("http://localhost/api/edit", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "demo-edit" },
      body: JSON.stringify({
        trip: planPayload.trip,
        command: "Priya vetoes the 5:30am Mount Fuji start.",
      }),
    }),
  );
  const editPayload = await editResponse.json();
  assert.equal(editResponse.status, 200);
  assert.equal(editPayload.source, "demo");
  assert.equal(editPayload.trip.version, 2);
  assert.equal(editPayload.diff.previousVersion, 1);
  assert.equal(editPayload.diff.nextVersion, 2);

  const demoResponse = await getDemo(new Request("http://localhost/api/demo?version=2"));
  const demoPayload = await demoResponse.json();
  assert.equal(demoResponse.status, 200);
  assert.equal(demoPayload.trip.version, 2);

  console.log("Demo plan, SSE, veto, and versioned demo endpoint passed without API usage.");
}

void main();
