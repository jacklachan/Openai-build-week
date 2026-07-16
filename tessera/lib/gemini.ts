import { estimateBudget } from "@/lib/budget";
import { parseTrip } from "@/lib/plan-validation";
import type { TravelerProfile, Trip, TripConstraints } from "@/lib/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_OUTPUT_TOKENS = 4200;

export interface PlanRequest {
  travelers: TravelerProfile[];
  constraints: TripConstraints;
  priorTrip?: Trip;
  editCommand?: string;
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

const systemInstruction = `You are Tessera, an explainable group-trip negotiator.
Return exactly one JSON Trip object and nothing else. The user request contains traveler profiles, constraints, and optionally a priorTrip plus editCommand.

Your Trip must preserve the supplied travelers and constraints exactly. Create exactly constraints.days DayPlan objects. Every activity needs a unique id, title, category, startTime, durationMin, estCostPerPerson, rationale, and one or more valid traveler ids in satisfies. Include explicit named compromises in tradeoffs. Add a tension field whenever an activity costs a traveler something.

For revisions, return version exactly priorTrip.version + 1 and make the requested change; update the tradeoffs to explain the new compromise. Keep costs realistic and do not invent unsupported claims. The server recalculates all budget totals, but include a budget object with total, lines, and the optional ceiling.

Use this JSON shape: { id, constraints, travelers, days, budget, tradeoffs, version }. Each day is { day, date?, summary, activities, transportLegs }. Every transport leg is { mode, fromName, toName, durationMin?, estCost? }.`;

function configuredModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
}

function responseText(payload: GeminiResponse) {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error(payload.error?.message || "Gemini returned no itinerary.");
  return text;
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

/** Generates a validated plan with Gemini. The API key is kept server-side. */
export async function negotiateTrip(request: PlanRequest, fetcher: typeof fetch = fetch): Promise<Trip> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const response = await fetcher(`${GEMINI_ENDPOINT}/${configuredModel()}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(request) }] }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) throw new Error(payload.error?.message || `Gemini request failed (${response.status}).`);

  try {
    return normaliseTrip(JSON.parse(responseText(payload)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini returned an invalid itinerary.";
    throw new Error(`Gemini plan validation failed: ${message}`);
  }
}
