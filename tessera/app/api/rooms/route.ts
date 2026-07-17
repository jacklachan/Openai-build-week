import { NextResponse } from "next/server";

import { validateCommittedTrip } from "@/lib/plan-validation";
import {
  createPactRoomToken,
  createPactRoomUrl,
  getPactRoomOrigin,
  hashPactRoomToken,
  isPactRoomConfigured,
  supabaseRest,
  type PactRoomCreated,
} from "@/lib/pact-room";
import type { AgreementEntry } from "@/lib/studio";

export const runtime = "nodejs";

type NewRoomBody = { agreement?: unknown; trip?: unknown };

function isAgreement(value: unknown): value is AgreementEntry[] {
  return Array.isArray(value) && value.every((entry) => (
    typeof entry === "object" && entry !== null &&
    "mustDo" in entry && typeof entry.mustDo === "string" &&
    "concession" in entry && typeof entry.concession === "string" &&
    "traveler" in entry && typeof entry.traveler === "object" && entry.traveler !== null
  ));
}

export async function POST(request: Request) {
  if (!isPactRoomConfigured()) {
    return NextResponse.json(
      { error: "Live Pact Rooms are not configured yet. Add the free Supabase values in .env.local." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as NewRoomBody;
    const trip = validateCommittedTrip(body.trip);
    if (!isAgreement(body.agreement)) {
      return NextResponse.json({ error: "A valid agreement is required." }, { status: 400 });
    }

    const organizerToken = createPactRoomToken();
    const travelerTokens = trip.travelers.map((traveler) => ({ traveler, token: createPactRoomToken() }));
    const rooms = await supabaseRest<Array<{ id: string }>>("tessera_pact_rooms", {
      body: JSON.stringify({ agreement: body.agreement, trip }),
      method: "POST",
    });
    const room = rooms[0];
    if (!room?.id) throw new Error("Pact Room storage did not return a room id.");

    await supabaseRest("tessera_pact_invites", {
      body: JSON.stringify([
        { label: "Organizer", role: "organizer", room_id: room.id, token_hash: hashPactRoomToken(organizerToken), traveler_id: null },
        ...travelerTokens.map(({ token, traveler }) => ({
          label: traveler.name,
          role: "traveler",
          room_id: room.id,
          token_hash: hashPactRoomToken(token),
          traveler_id: traveler.id,
        })),
      ]),
      method: "POST",
    });

    const origin = getPactRoomOrigin(request);
    const payload: PactRoomCreated = {
      roomId: room.id,
      organizerUrl: createPactRoomUrl(origin, room.id, organizerToken),
      invites: travelerTokens.map(({ token, traveler }) => ({
        label: traveler.name,
        role: "traveler" as const,
        travelerId: traveler.id,
        url: createPactRoomUrl(origin, room.id, token),
      })),
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the Pact Room.";
    return NextResponse.json({ error: message }, { status: message.includes("must") || message.includes("required") ? 400 : 503 });
  }
}
