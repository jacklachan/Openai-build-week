import assert from "node:assert/strict";
import test from "node:test";

import seedTrip from "../data/seed-demo-trip.json";
import { negotiateTrip } from "../lib/gemini";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("requests a JSON-only Gemini plan and re-computes its budget", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  try {
    const result = await negotiateTrip(
      { travelers: trip.travelers, constraints: trip.constraints },
      async (input, init) => {
        requestUrl = String(input);
        requestInit = init;
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify(trip) }] } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    );

    assert.match(requestUrl, /generativelanguage\.googleapis\.com/);
    assert.equal((requestInit?.headers as Record<string, string>)["x-goog-api-key"], "test-key");
    assert.match(String(requestInit?.body), /responseMimeType/);
    assert.equal(result.budget.total, 1574);
    assert.equal(result.constraints.destination, "Japan — Tokyo, Fuji, Kyoto & Osaka");
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
