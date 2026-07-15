import assert from "node:assert/strict";
import test from "node:test";
import seedTrip from "../data/seed-demo-trip.json";
import { getTradeoffEntryTone } from "../components/tradeoff-panel";
import { getPlanSelection } from "../components/trip-studio";
import { getAgreementEntries } from "../lib/studio";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

test("keeps a generated plan with missing activities in direct plan state", () => {
  const noActivities = {
    ...trip,
    days: [{ ...trip.days[0]!, activities: undefined }],
  } as unknown as Trip;
  const noDays = { ...trip, days: undefined } as unknown as Trip;

  assert.deepEqual(getPlanSelection(noActivities), { activityId: null, day: 1 });
  assert.deepEqual(getPlanSelection(noDays), { activityId: null, day: 1 });
});

test("keeps another traveler's tense activity out of a ledger row's NET", () => {
  const crossTravelerTension = {
    ...trip,
    days: [
      {
        ...trip.days[0]!,
        activities: [
          {
            ...trip.days[0]!.activities[0]!,
            satisfies: ["priya"],
            tension: "Ravi compromises on a late start.",
          },
        ],
      },
    ],
  };
  const priya = getAgreementEntries(crossTravelerTension).find(
    ({ traveler }) => traveler.id === "priya",
  );

  assert.equal(getTradeoffEntryTone(crossTravelerTension, priya!), "satisfied");
});
