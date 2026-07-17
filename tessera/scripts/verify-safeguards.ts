import assert from "node:assert/strict";

import {
  cacheKey,
  getCachedPlan,
  getDemoReplan,
  getDemoTrip,
  isDemoOnly,
  setCachedPlan,
} from "../lib/cache";
import { checkRateLimit } from "../lib/rate-limit";

const key = cacheKey({ destination: "Japan", travelers: ["ravi", "priya", "mei"] });
const demo = getDemoTrip();
setCachedPlan(key, demo);
const cached = getCachedPlan(key);

assert.ok(cached);
cached.id = "mutated-copy";
assert.notEqual(getCachedPlan(key)?.id, "mutated-copy");

const replan = getDemoReplan();
assert.equal(replan.version, demo.version + 1);
assert.ok(replan.days.flatMap((day) => day.activities).some((activity) => activity.id === "hakone-open-air-museum"));

const now = 1_000;
for (let count = 0; count < 5; count += 1) {
  assert.equal(checkRateLimit("verify-safeguards", 5, 60_000, now).allowed, true);
}
const limited = checkRateLimit("verify-safeguards", 5, 60_000, now);
assert.equal(limited.allowed, false);
assert.equal(limited.retryAfterSeconds, 60);
assert.equal(checkRateLimit("verify-safeguards", 5, 60_000, now + 60_000).allowed, true);

const previousDemoOnly = process.env.DEMO_ONLY;
process.env.DEMO_ONLY = "true";
assert.equal(isDemoOnly(), true);
if (previousDemoOnly === undefined) {
  delete process.env.DEMO_ONLY;
} else {
  process.env.DEMO_ONLY = previousDemoOnly;
}

console.log("Cache isolation, demo-only fallback, and rate limiting passed.");
