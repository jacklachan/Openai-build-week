import assert from "node:assert/strict";
import test from "node:test";

import { createPactRoomToken, createPactRoomUrl, hashPactRoomToken, isPactRoomAction } from "../lib/pact-room";

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
