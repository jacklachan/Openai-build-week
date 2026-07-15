import { NextResponse } from "next/server";

import { getDemoReplan, isDemoOnly } from "@/lib/cache";
import { negotiateTrip } from "@/lib/openai";
import { validateCommittedTrip } from "@/lib/plan-validation";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { createReplanRequest, diffTrips, validateReplannedTrip } from "@/lib/replan";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientKey(request.headers));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many edit requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const body = await request.json();
    if (!isRecord(body) || typeof body.command !== "string") {
      return NextResponse.json({ error: "Request must include a trip and edit command." }, { status: 400 });
    }
    const previousTrip = validateCommittedTrip(body.trip);
    const demoOnly = isDemoOnly() || !process.env.OPENAI_API_KEY;
    const nextTrip = validateReplannedTrip(
      previousTrip,
      demoOnly ? getDemoReplan() : await negotiateTrip(createReplanRequest(previousTrip, body.command)),
    );
    return NextResponse.json({
      trip: nextTrip,
      diff: diffTrips(previousTrip, nextTrip),
      source: demoOnly ? "demo" : "live",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revise the plan.";
    const status = message.includes("Request") || message.includes("required") || message.includes("match") ? 400 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
