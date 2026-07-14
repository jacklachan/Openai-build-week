import OpenAI from "openai";
import type {
  Response,
  ResponseInputItem,
} from "openai/resources/responses/responses";

import { executeTesseraTool, isCommittedPlan, tesseraToolDefinitions } from "@/lib/tools";
import type { TravelerProfile, Trip, TripConstraints } from "@/lib/types";

const MAX_TOOL_ROUNDS = 8;
const MAX_OUTPUT_TOKENS = 1800;

export interface PlanRequest {
  travelers: TravelerProfile[];
  constraints: TripConstraints;
  priorTrip?: Trip;
  editCommand?: string;
}

interface ResponsesClient {
  responses: {
    create: (params: {
      model: string;
      instructions: string;
      tools: typeof tesseraToolDefinitions;
      input: ResponseInputItem[];
      parallel_tool_calls: false;
      max_output_tokens: number;
    }) => Promise<Response>;
  };
}

const systemInstructions = `You are Tessera, an explainable group-trip negotiator.
Build a feasible itinerary by reconciling stated traveler needs and constraints.

You must use search_places and get_route to ground the plan, estimate_budget for every budget total, then commit_plan to finalize it.
Never invent place ids, route duration, or budget math. Do not call commit_plan until estimate_budget has returned the exact budget for the proposed trip.
Every activity needs a specific rationale, satisfies one or more traveler ids, and a tension when it materially costs a traveler something.
When preferences conflict, write at least one explicit, named tradeoff in trip.tradeoffs.
If priorTrip and editCommand are supplied, treat the command as a veto or requested revision. Produce a revised plan with version exactly priorTrip.version + 1 and explain the changed compromise.
The commit_plan schema requires every optional field to be present. Use null only where an optional field is absent.
Keep the result within budgetCeiling when one is supplied.`;

function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

function modelName(): string {
  return process.env.OPENAI_MODEL || "gpt-5.6";
}

function buildInput(request: PlanRequest): ResponseInputItem[] {
  return [
    {
      role: "user",
      content: JSON.stringify(request),
    },
  ];
}

export async function negotiateTrip(
  request: PlanRequest,
  client: ResponsesClient = createClient(),
): Promise<Trip> {
  const input = buildInput(request);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.responses.create({
      model: modelName(),
      instructions: systemInstructions,
      tools: tesseraToolDefinitions,
      input,
      parallel_tool_calls: false,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    });
    // The Responses API requires every output item, including reasoning items, in the
    // next input. The SDK's broad output union is wider than its input union.
    input.push(...(response.output as unknown as ResponseInputItem[]));

    const calls = response.output.filter((item) => item.type === "function_call");
    if (calls.length === 0) {
      throw new Error("GPT-5.6 returned without committing a plan.");
    }

    for (const call of calls) {
      let argumentsObject: unknown;
      try {
        argumentsObject = JSON.parse(call.arguments);
      } catch {
        throw new Error(`GPT-5.6 returned invalid arguments for ${call.name}.`);
      }

      const result = await executeTesseraTool(call.name, argumentsObject);
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });

      if (call.name === "commit_plan" && isCommittedPlan(result)) {
        return result.trip;
      }
    }
  }

  throw new Error(`Negotiation exceeded the ${MAX_TOOL_ROUNDS}-round limit.`);
}

export { MAX_TOOL_ROUNDS };
