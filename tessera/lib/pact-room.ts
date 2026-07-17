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
};

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
