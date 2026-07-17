import assert from "node:assert/strict";
import test from "node:test";

import {
  createPactRoomToken,
  createPactRoomUpdate,
  createPactRoomUrl,
  getPactRoomReadiness,
  hashPactRoomToken,
  isPactRoomAction,
} from "../lib/pact-room";
import { getDemoTrip } from "../lib/cache";
import { getAgreementEntries } from "../lib/studio";

test("creates a private room URL with the raw invite token only in the fragment", () => {
  const url = createPactRoomUrl("https://tessera.example/", "e7b21b11-a3fa-4e2d-8df5-460c75cdb931", "not-in-query");
  assert.equal(url, "https://tessera.example/room/e7b21b11-a3fa-4e2d-8df5-460c75cdb931#token=not-in-query");
  assert.equal(new URL(url).search, "");
  assert.equal(new URL(url).hash, "#token=not-in-query");
});

test("stores a deterministic hash instead of the raw invite token", () => {
  assert.equal(hashPactRoomToken("private-token"), hashPactRoomToken("private-token"));
  assert.notEqual(hashPactRoomToken("private-token"), hashPactRoomToken("another-token"));
  assert.equal(createPactRoomToken().length >= 40, true);
});

test("accepts only the two traveler decisions supported by the room", () => {
  assert.equal(isPactRoomAction("accepted"), true);
  assert.equal(isPactRoomAction("concern"), true);
  assert.equal(isPactRoomAction("delete"), false);
});

test("reduces event history into the current readiness and a safe group update", () => {
  const trip = getDemoTrip();
  const agreement = getAgreementEntries(trip);
  const snapshot = {
    agreement,
    events: [
      { action: "concern" as const, actorLabel: "Priya", createdAt: "2026-01-01T00:01:00Z", id: "latest", message: "Priya asked the group to revisit a concern.", travelerId: "priya" },
      { action: "accepted" as const, actorLabel: "Ravi", createdAt: "2026-01-01T00:00:00Z", id: "first", message: "Ravi marked their promise ready.", travelerId: "ravi" },
    ],
    trip,
  };
  const readiness = getPactRoomReadiness(snapshot);

  assert.equal(readiness.ready, 1);
  assert.equal(readiness.concerns, 1);
  assert.equal(readiness.waiting, 1);
  assert.match(createPactRoomUpdate(snapshot), /1\/3 travelers are ready/);
  assert.match(createPactRoomUpdate(snapshot), /Priya: needs a change/);
});
