import assert from "node:assert/strict";
import test from "node:test";

import seedTrip from "../data/seed-demo-trip.json";
import { negotiateWithOllama } from "../lib/ollama";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("requests a local JSON-only Ollama plan and validates its budget", async () => {
  const oldHost = process.env.OLLAMA_HOST;
  const oldModel = process.env.OLLAMA_MODEL;
  process.env.OLLAMA_HOST = "http://127.0.0.1:11434";
  process.env.OLLAMA_MODEL = "test-local-model";
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  try {
    const result = await negotiateWithOllama(
      { travelers: trip.travelers, constraints: trip.constraints },
      async (input, init) => {
        requestUrl = String(input);
        requestInit = init;
        return new Response(JSON.stringify({ response: JSON.stringify(trip) }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      },
    );

    assert.equal(requestUrl, "http://127.0.0.1:11434/api/generate");
    assert.match(String(requestInit?.body), /\"format\":\"json\"/);
    assert.match(String(requestInit?.body), /\"stream\":false/);
    assert.match(String(requestInit?.body), /test-local-model/);
    assert.equal(result.budget.total, 870);
  } finally {
    if (oldHost === undefined) delete process.env.OLLAMA_HOST;
    else process.env.OLLAMA_HOST = oldHost;
    if (oldModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = oldModel;
  }
});
