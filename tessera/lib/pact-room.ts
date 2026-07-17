import { createHash, randomBytes } from "node:crypto";

import type { AgreementEntry } from "@/lib/studio";
import type { Trip } from "@/lib/types";

export type PactRoomRole = "organizer" | "traveler";
export type PactRoomEventAction = "accepted" | "concern";

export type PactRoomEvent = {
  action: PactRoomEventAction;
  actorLabel: string;
  createdAt: string;
  id: string;
  message: string;
  travelerId: string | null;
};

export type PactRoomSnapshot = {
  agreement: AgreementEntry[];
  events: PactRoomEvent[];
  role: PactRoomRole;
  roomId: string;
  trip: Trip;
  viewer: { label: string; travelerId: string | null };
};

export type PactRoomReadinessItem = {
  decision: "ready" | "concern" | "waiting";
  mustDo: string;
  name: string;
  travelerId: string;
};

/** Reduces an append-only event history to the one decision the group needs to act on now. */
export function getPactRoomReadiness(snapshot: Pick<PactRoomSnapshot, "agreement" | "events">) {
  const latestByTraveler = new Map<string, PactRoomEvent>();
  for (const event of snapshot.events) {
    if (event.travelerId && !latestByTraveler.has(event.travelerId)) latestByTraveler.set(event.travelerId, event);
  }
  const items: PactRoomReadinessItem[] = snapshot.agreement.map((entry) => ({
    travelerId: entry.traveler.id,
    name: entry.traveler.name,
    mustDo: entry.mustDo,
    decision: latestByTraveler.get(entry.traveler.id)?.action === "accepted"
      ? "ready"
      : latestByTraveler.has(entry.traveler.id)
        ? "concern"
        : "waiting",
  }));
  return {
    items,
    ready: items.filter((item) => item.decision === "ready").length,
    concerns: items.filter((item) => item.decision === "concern").length,
    waiting: items.filter((item) => item.decision === "waiting").length,
  };
}

/** Compact, share-safe room status: it reports decisions without exposing the imported chat or invite tokens. */
export function createPactRoomUpdate(snapshot: Pick<PactRoomSnapshot, "agreement" | "events" | "trip">) {
  const readiness = getPactRoomReadiness(snapshot);
  const attention = readiness.items
    .filter((item) => item.decision !== "ready")
    .map((item) => `${item.name}: ${item.decision === "concern" ? "needs a change" : "waiting"}`)
    .join(" · ");
  return [
    `Tessera room update — ${snapshot.trip.constraints.destination}`,
    `${readiness.ready}/${readiness.items.length} travelers are ready.`,
    attention || "Everyone is ready to book.",
  ].join("\n");
}

export type PactRoomInvite = {
  label: string;
  role: PactRoomRole;
  travelerId: string | null;
  url: string;
};

export type PactRoomCreated = {
  invites: PactRoomInvite[];
  organizerUrl: string;
  roomId: string;
};

export function isPactRoomConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function hashPactRoomToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPactRoomToken() {
  return randomBytes(32).toString("base64url");
}

/** Keeps the secret out of HTTP requests and server logs while retaining a simple invite link. */
export function createPactRoomUrl(origin: string, roomId: string, token: string) {
  return `${origin.replace(/\/$/, "")}/room/${encodeURIComponent(roomId)}#token=${encodeURIComponent(token)}`;
}

export function getPactRoomOrigin(request: Request) {
  const configuredOrigin = process.env.APP_BASE_URL?.trim();
  return configuredOrigin?.replace(/\/$/, "") || new URL(request.url).origin;
}

export function getPactRoomConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Live Pact Rooms need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { serviceRoleKey, url };
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}) {
  const { url, serviceRoleKey } = getPactRoomConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("Authorization", `Bearer ${serviceRoleKey}`);
  headers.set("Content-Type", "application/json");
  headers.set("Prefer", headers.get("Prefer") ?? "return=representation");

  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Pact Room storage request failed (${response.status}). Apply the Supabase migration first.`);
  }
  return (await response.json()) as T;
}

export function getPactRoomToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return "";
  return authorization.slice("Bearer ".length).trim();
}

export function isPactRoomRole(value: unknown): value is PactRoomRole {
  return value === "organizer" || value === "traveler";
}

export function isPactRoomAction(value: unknown): value is PactRoomEventAction {
  return value === "accepted" || value === "concern";
}
