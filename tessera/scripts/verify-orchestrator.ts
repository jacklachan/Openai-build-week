import assert from "node:assert/strict";

import type { Response } from "openai/resources/responses/responses";

import seedTrip from "../data/seed-demo-trip.json";
import { negotiateTrip, type PlanRequest } from "../lib/openai";
import { estimateBudget } from "../lib/budget";
import { parseTrip } from "../lib/plan-validation";

const seed = parseTrip(seedTrip);

const request: PlanRequest = {
  travelers: seed.travelers,
  constraints: seed.constraints,
};

const committedTrip = structuredClone(seed);
committedTrip.budget = {
  ceiling: committedTrip.constraints.budgetCeiling,
  ...estimateBudget(committedTrip),
};

const responses = [
  {
    output: [
      {
        type: "function_call",
        name: "search_places",
        call_id: "call-search",
        arguments: JSON.stringify({ query: "Mount Takao", near: "Tokyo", type: "adventure" }),
      },
    ],
  },
  {
    output: [
      {
        type: "function_call",
        name: "get_route",
        call_id: "call-route",
        arguments: JSON.stringify({
          fromPlaceId: "tokyo-shinjuku-gyoen",
          toPlaceId: "tokyo-mount-takao",
          mode: "train",
        }),
      },
    ],
  },
  {
    output: [
      {
        type: "function_call",
        name: "estimate_budget",
        call_id: "call-budget",
        arguments: JSON.stringify({ trip: committedTrip }),
      },
    ],
  },
  {
    output: [
      {
        type: "function_call",
        name: "commit_plan",
        call_id: "call-commit",
        arguments: JSON.stringify({ trip: committedTrip }),
      },
    ],
  },
] as unknown as Response[];

const inputs: unknown[] = [];
const fakeClient = {
  responses: {
    create: async (params: unknown) => {
      inputs.push(params);
      const response = responses.shift();
      if (!response) throw new Error("Unexpected extra model round.");
      return response;
    },
  },
};

async function main() {
  const trip = await negotiateTrip(request, fakeClient);

  assert.equal(trip.id, seed.id);
  assert.equal(trip.budget.total, 1574);
  assert.equal(inputs.length, 4);
  assert.equal(responses.length, 0);
  console.log("Mock GPT-5.6 orchestration completed a grounded, budget-validated Trip.");
}

void main();
