import assert from "node:assert/strict";
import test from "node:test";
import { getHealthPayload } from "../lib/health";

test("reports a dependency-free health payload for demo mode", () => {
  assert.deepEqual(getHealthPayload("true"), {
    mode: "demo",
    ok: true,
    service: "tessera-web",
  });
});

test("reports no-key demo mode when the optional provider is not configured", () => {
  assert.deepEqual(getHealthPayload("false", ""), {
    mode: "demo",
    ok: true,
    service: "tessera-web",
  });
});

test("reports live mode without exposing configured provider values", () => {
  assert.deepEqual(getHealthPayload("false", "configured-provider-key"), {
    mode: "live",
    ok: true,
    service: "tessera-web",
  });
});
