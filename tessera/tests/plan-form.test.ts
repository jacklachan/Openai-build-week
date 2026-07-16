import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  addTravelerDraft,
  createPlanDraft,
  normalizePlanDraft,
  PlanForm,
  removeTravelerDraft,
} from "../components/plan-form";
import { createPlanRequestBody } from "../components/trip-studio";

function validPlanDraft() {
  const draft = createPlanDraft();

  return {
    ...draft,
    destination: "Lisbon",
    travelers: [{ ...draft.travelers[0]!, name: "Lina" }],
  };
}

test("normalizes one arbitrary traveler and leaves blank optional fields undefined", () => {
  const draft = createPlanDraft();
  const traveler = draft.travelers[0]!;
  const request = normalizePlanDraft({
    ...draft,
    destination: "  Lisbon, Portugal ",
    startDate: "",
    days: "5",
    currency: " eur ",
    budgetCeiling: "",
    originCity: "   ",
    travelers: [
      {
        ...traveler,
        name: "  Lina  ",
        pace: "slow",
        interests: ["culture", "food"],
        dietary: "vegetarian, halal",
        accessibility: "step-free access",
        mustDo: "fado evening",
        dealbreakers: "red-eye flights",
        budgetContribution: "",
      },
    ],
  });

  assert.deepEqual(request.travelers, [
    {
      id: traveler.id,
      name: "Lina",
      pace: "slow",
      interests: ["culture", "food"],
      dietary: ["vegetarian", "halal"],
      accessibility: ["step-free access"],
      mustDo: ["fado evening"],
      dealbreakers: ["red-eye flights"],
    },
  ]);
  assert.equal(request.constraints.destination, "Lisbon, Portugal");
  assert.equal(request.constraints.days, 5);
  assert.equal(request.constraints.currency, "EUR");
  assert.equal(request.constraints.startDate, undefined);
  assert.equal(request.constraints.budgetCeiling, undefined);
  assert.equal(request.constraints.originCity, undefined);
});

test("adds and removes traveler rows with generated unique ids", () => {
  const initial = createPlanDraft();
  const withSecondTraveler = addTravelerDraft(initial);
  const secondTraveler = withSecondTraveler.travelers[1]!;

  assert.equal(withSecondTraveler.travelers.length, 2);
  assert.notEqual(secondTraveler.id, initial.travelers[0]!.id);
  assert.deepEqual(removeTravelerDraft(withSecondTraveler, secondTraveler.id), initial);
  assert.deepEqual(removeTravelerDraft(initial, initial.travelers[0]!.id), initial);
});

test("rejects invalid plan field bounds and duplicate traveler ids", () => {
  const draft = validPlanDraft();

  assert.throws(
    () => normalizePlanDraft({ ...draft, destination: "Lisbon", days: "15" }),
    /Days must be between/i,
  );
  assert.throws(
    () => normalizePlanDraft({ ...draft, currency: "EU" }),
    /currency/i,
  );
  assert.throws(
    () =>
      normalizePlanDraft({
        ...draft,
        travelers: [draft.travelers[0]!, { ...draft.travelers[0]!, name: "Mina" }],
      }),
    /unique/i,
  );
});

test("constructs the JSON request body from normalized form values", () => {
  const draft = validPlanDraft();
  const request = normalizePlanDraft({
    ...draft,
    startDate: "2026-09-01",
    budgetCeiling: "2400",
    originCity: "Madrid",
    travelers: [{ ...draft.travelers[0]!, budgetContribution: "1200" }],
  });

  assert.deepEqual(JSON.parse(createPlanRequestBody(request)), request);
});

test("renders the caller-owned draft values for an error retry", () => {
  const draft = {
    ...validPlanDraft(),
    startDate: "2026-09-01",
    originCity: "Madrid",
  };
  const html = renderToStaticMarkup(
    createElement(PlanForm, {
      draft,
      onDraftChange: () => undefined,
      onSubmit: () => undefined,
    }),
  );

  assert.match(html, /value="Lisbon"/);
  assert.match(html, /value="2026-09-01"/);
  assert.match(html, /value="Madrid"/);
  assert.match(html, /value="Lina"/);
});
