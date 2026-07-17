import { estimateBudget } from "@/lib/budget";
import { parseTrip } from "@/lib/plan-validation";
import type { PlanRequest } from "@/lib/gemini";
import type { Trip } from "@/lib/types";

const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const MAX_OUTPUT_TOKENS = 4200;

type OllamaResponse = {
  error?: string;
  response?: string;
};

const systemInstruction = `You are Tessera, an explainable group-trip negotiator.
Return exactly one JSON Trip object and nothing else. Preserve the supplied travelers and constraints exactly. Create exactly constraints.days DayPlan objects. Every activity needs a unique id, title, category, startTime, durationMin, estCostPerPerson, rationale, and one or more valid traveler ids in satisfies. Include explicit named compromises in tradeoffs. Add a tension field whenever an activity costs a traveler something.

Use this JSON shape: { id, constraints, travelers, days, budget, tradeoffs, version }. Each day is { day, date?, summary, activities, transportLegs }. Every transport leg is { mode, fromName, toName, durationMin?, estCost? }. The server recomputes budget totals, so do not rely on your own arithmetic.`;

function configuredHost() {
  return (process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
}

function configuredModel() {
  return process.env.OLLAMA_MODEL || "llama3.2:3b";
}

function normaliseTrip(value: unknown): Trip {
  const parsed = parseTrip(value);
  const estimated = estimateBudget(parsed);
  return parseTrip({
    ...parsed,
    budget: {
      ...(parsed.constraints.budgetCeiling === undefined ? {} : { ceiling: parsed.constraints.budgetCeiling }),
      ...estimated,
    },
  });
}

/** Uses a builder-owned local Ollama model; no provider API key leaves the device. */
export async function negotiateWithOllama(request: PlanRequest, fetcher: typeof fetch = fetch): Promise<Trip> {
  const response = await fetcher(`${configuredHost()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: "json",
      model: configuredModel(),
      options: { num_predict: MAX_OUTPUT_TOKENS, temperature: 0.3 },
      prompt: JSON.stringify(request),
      stream: false,
      system: systemInstruction,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json()) as OllamaResponse;
  if (!response.ok) throw new Error(payload.error || `Ollama request failed (${response.status}).`);
  if (!payload.response) throw new Error("Ollama returned no itinerary.");

  try {
    return normaliseTrip(JSON.parse(payload.response));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ollama returned an invalid itinerary.";
    throw new Error(`Ollama plan validation failed: ${message}`);
  }
}
