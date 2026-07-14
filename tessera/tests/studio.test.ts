import assert from "node:assert/strict";
import test from "node:test";
import seedTrip from "../data/seed-demo-trip.json";
import {
  getAgreementEntries,
  getSelectedDay,
  getVetoPreview,
} from "../lib/studio";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("derives the seeded agreement and veto preview", () => {
  const agreement = getAgreementEntries(trip);
  const preview = getVetoPreview(trip);

  assert.equal(getSelectedDay(trip, 2)?.day, 2);
  assert.equal(agreement[1].traveler.name, "Priya");
  assert.match(agreement[1].concession, /early/i);
  assert.equal(preview.removedActivity, "Mount Takao summit trail");
  assert.equal(preview.beforeTime, "08:30");
  assert.equal(preview.afterTime, "10:30");
});

test("returns the correct itinerary for the selected day", () => {
  assert.notEqual(getSelectedDay(trip, 1)?.summary, getSelectedDay(trip, 3)?.summary);
  assert.equal(getSelectedDay(trip, 3)?.activities[0]?.title, "Tsukiji Outer Market breakfast");
});
