import { NextResponse } from "next/server";

import {
  getPactRoomToken,
  hashPactRoomToken,
  isPactRoomAction,
  isPactRoomConfigured,
  isPactRoomRole,
  supabaseRest,
  type PactRoomEvent,
  type PactRoomRole,
  type PactRoomSnapshot,
} from "@/lib/pact-room";
import type { AgreementEntry } from "@/lib/studio";
import type { Trip } from "@/lib/types";

export const runtime = "nodejs";

type InviteRow = {
  label: string;
  role: PactRoomRole;
  room_id: string;
  traveler_id: string | null;
};

type RoomRow = { agreement: AgreementEntry[]; id: string; trip: Trip };
type EventRow = {
  action: PactRoomEvent["action"];
  actor_label: string;
  created_at: string;
  id: string;
  message: string;
  traveler_id: string | null;
};

function isRoomId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function unavailable() {
  return NextResponse.json(
    { error: "Live Pact Rooms are not configured yet. Add the free Supabase values in .env.local." },
    { status: 503 },
  );
}

function toEvent(row: EventRow): PactRoomEvent {
  return {
    action: row.action,
    actorLabel: row.actor_label,
    createdAt: row.created_at,
    id: row.id,
    message: row.message,
    travelerId: row.traveler_id,
  };
}

async function authorize(request: Request, roomId: string) {
  const token = getPactRoomToken(request);
  if (!token) throw new Error("This Pact Room link is missing its invite token.");
  const tokenHash = hashPactRoomToken(token);
  const query = new URLSearchParams({
    select: "label,role,room_id,traveler_id",
    room_id: `eq.${roomId}`,
    token_hash: `eq.${tokenHash}`,
  });
  const invites = await supabaseRest<InviteRow[]>(`tessera_pact_invites?${query.toString()}`);
  const invite = invites[0];
  if (!invite || !isPactRoomRole(invite.role)) throw new Error("This invite is invalid or has been revoked.");
  return invite;
}

async function readRoom(roomId: string) {
  const query = new URLSearchParams({ select: "id,trip,agreement", id: `eq.${roomId}` });
  const rooms = await supabaseRest<RoomRow[]>(`tessera_pact_rooms?${query.toString()}`);
  const room = rooms[0];
  if (!room) throw new Error("This Pact Room no longer exists.");
  const eventsQuery = new URLSearchParams({
    select: "id,action,actor_label,message,traveler_id,created_at",
    room_id: `eq.${roomId}`,
    order: "created_at.desc",
    limit: "20",
  });
  const events = await supabaseRest<EventRow[]>(`tessera_pact_events?${eventsQuery.toString()}`);
  return { events: events.map(toEvent), room };
}

export async function GET(request: Request, context: RouteContext<"/api/rooms/[roomId]">) {
  if (!isPactRoomConfigured()) return unavailable();
  const { roomId } = await context.params;
  if (!isRoomId(roomId)) return NextResponse.json({ error: "Invalid Pact Room id." }, { status: 400 });
  try {
    const [invite, { room, events }] = await Promise.all([authorize(request, roomId), readRoom(roomId)]);
    const snapshot: PactRoomSnapshot = { agreement: room.agreement, events, role: invite.role, roomId, trip: room.trip };
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open this Pact Room.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: Request, context: RouteContext<"/api/rooms/[roomId]">) {
  if (!isPactRoomConfigured()) return unavailable();
  const { roomId } = await context.params;
  if (!isRoomId(roomId)) return NextResponse.json({ error: "Invalid Pact Room id." }, { status: 400 });
  try {
    const invite = await authorize(request, roomId);
    const body = await request.json() as { action?: unknown };
    if (invite.role !== "traveler" || !invite.traveler_id || !isPactRoomAction(body.action)) {
      return NextResponse.json({ error: "Only a traveler invite can record this decision." }, { status: 403 });
    }
    const message = body.action === "accepted"
      ? `${invite.label} marked their promise ready.`
      : `${invite.label} asked the group to revisit a concern.`;
    const events = await supabaseRest<EventRow[]>("tessera_pact_events", {
      body: JSON.stringify({
        action: body.action,
        actor_label: invite.label,
        message,
        room_id: roomId,
        traveler_id: invite.traveler_id,
      }),
      method: "POST",
    });
    const event = events[0];
    if (!event) throw new Error("Pact Room storage did not return the decision.");
    return NextResponse.json({ event: toEvent(event) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record the decision.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
