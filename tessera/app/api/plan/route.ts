import { NextResponse } from "next/server";

import { cacheKey, getCachedPlan, getDemoTrip, isDemoOnly, setCachedPlan } from "@/lib/cache";
import { negotiateTrip, type PlanRequest } from "@/lib/gemini";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import type { Interest, TravelerProfile, TripConstraints } from "@/lib/types";

export const runtime = "nodejs";

const interestValues = new Set<Interest>([
  "nature",
  "city",
  "food",
  "adventure",
  "relaxation",
  "culture",
  "nightlife",
  "shopping",
  "anime",
  "beach",
  "history",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTraveler(value: unknown): value is TravelerProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.budgetContribution === undefined || typeof value.budgetContribution === "number") &&
    (value.pace === "slow" || value.pace === "moderate" || value.pace === "packed") &&
    isStringArray(value.interests) &&
    value.interests.every((interest) => interestValues.has(interest as Interest)) &&
    isStringArray(value.dietary) &&
    isStringArray(value.accessibility) &&
    isStringArray(value.mustDo) &&
    isStringArray(value.dealbreakers)
  );
}

function isConstraints(value: unknown): value is TripConstraints {
  if (!isRecord(value)) return false;
  return (
    typeof value.destination === "string" &&
    Number.isInteger(value.days) &&
    (value.days as number) > 0 &&
    typeof value.currency === "string" &&
    (value.startDate === undefined || typeof value.startDate === "string") &&
    (value.budgetCeiling === undefined || typeof value.budgetCeiling === "number") &&
    (value.originCity === undefined || typeof value.originCity === "string")
  );
}

function parsePlanRequest(value: unknown): PlanRequest {
  if (!isRecord(value) || !Array.isArray(value.travelers)) {
    throw new Error("Request must include a travelers array and constraints object.");
  }
  if (!value.travelers.length || !value.travelers.every(isTraveler) || !isConstraints(value.constraints)) {
    throw new Error("Request contains an invalid traveler profile or trip constraint.");
  }
  return { travelers: value.travelers, constraints: value.constraints };
}

function sseResponse(
  trip: Awaited<ReturnType<typeof negotiateTrip>>,
  source: "live" | "cache" | "demo",
): Response {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(`event: trip\ndata: ${JSON.stringify({ trip, source })}\n\n`),
      );
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientKey(request.headers));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many plan requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const planRequest = parsePlanRequest(await request.json());
    const key = cacheKey(planRequest);
    const demoOnly = isDemoOnly() || !process.env.GEMINI_API_KEY;
    const cachedTrip = demoOnly ? undefined : getCachedPlan(key);
    const trip = demoOnly ? getDemoTrip() : cachedTrip || (await negotiateTrip(planRequest));
    const source = demoOnly ? "demo" : cachedTrip ? "cache" : "live";
    if (!demoOnly && !cachedTrip) setCachedPlan(key, trip);
    if (request.headers.get("accept")?.includes("text/event-stream")) {
      return sseResponse(trip, source);
    }
    return NextResponse.json({ trip, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a plan.";
    const status = message.includes("Request") || message.includes("invalid") ? 400 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
