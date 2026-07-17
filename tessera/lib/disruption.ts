import type { ProposalOption } from "./proposal-arena";
import type { Activity, Trip } from "./types";

export type DisruptionScenario = {
  id: "budget" | "weather";
  affectedActivity: string;
  affectedTraveler: string;
  condition: string;
  label: string;
  question: string;
  risk: string;
  solution?: ProposalOption;
};

function findAffectedActivity(trip: Trip): Activity | undefined {
  for (const day of trip.days) {
    const weatherExposedCriticalStop = day.activities.find((activity) =>
      /hike|summit|sunrise|mount|trail|beach|outdoor/i.test(activity.title),
    );
    if (weatherExposedCriticalStop) return weatherExposedCriticalStop;
  }

  const mustDoTokens = trip.travelers
    .flatMap((traveler) => traveler.mustDo)
    .flatMap((mustDo) => mustDo.toLocaleLowerCase().split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 5)
    .toSorted((left, right) => right.length - left.length);

  for (const day of trip.days) {
    const namedMustDo = day.activities.find((activity) => {
      const title = activity.title.toLocaleLowerCase();
      return mustDoTokens.some((token) => title.includes(token));
    });
    if (namedMustDo) return namedMustDo;
  }

  for (const day of trip.days) {
    const tense = day.activities.find((activity) => Boolean(activity.tension));
    if (tense) return tense;
  }

  return trip.days.flatMap((day) => day.activities)[0];
}

function findLargestCostActivity(trip: Trip): Activity | undefined {
  let largest: Activity | undefined;

  for (const day of trip.days) {
    for (const activity of day.activities) {
      if ((activity.estCostPerPerson ?? 0) > (largest?.estCostPerPerson ?? 0)) {
        largest = activity;
      }
    }
  }

  return largest;
}

/**
 * Builds a clearly labelled drill from the current agreement. It is not weather data;
 * its job is to pressure-test the exact promise the group has already made.
 */
export function getDisruptionScenarios(trip: Trip, proposals: ProposalOption[]): DisruptionScenario[] {
  const weatherActivity = findAffectedActivity(trip);
  const budgetActivity = findLargestCostActivity(trip);
  const weatherTraveler = weatherActivity
    ? trip.travelers.find((person) => weatherActivity.satisfies.includes(person.id))
    : undefined;
  const budgetTraveler = budgetActivity
    ? trip.travelers.find((person) => budgetActivity.satisfies.includes(person.id))
    : undefined;
  const paceProposal = proposals.find((proposal) => proposal.id === "pace");
  const budgetProposal = proposals.find((proposal) => proposal.id === "budget");
  const scenarios: DisruptionScenario[] = [];

  if (weatherActivity) {
    scenarios.push({
      id: "weather",
      affectedActivity: weatherActivity.title,
      affectedTraveler: weatherTraveler?.name ?? "The group",
      condition: `Heavy rain makes ${weatherActivity.title} a bad fit today.`,
      label: "Weather shift",
      question: `Do we hold ${weatherTraveler?.name ?? "the group"}'s promise, or change the pact before anyone is surprised?`,
      risk: weatherTraveler
        ? `${weatherTraveler.name} is the person most likely to lose something they named if this gets solved quietly.`
        : "A quiet itinerary edit could remove a promise without the group noticing.",
      solution: paceProposal,
    });
  }

  if (budgetActivity) {
    scenarios.push({
      id: "budget",
      affectedActivity: budgetActivity.title,
      affectedTraveler: budgetTraveler?.name ?? "The group",
      condition: `The group budget drops before ${budgetActivity.title} is booked.`,
      label: "Budget shock",
      question: `Do we protect the expensive moment, or make the saving explicit before the bill becomes someone else's problem?`,
      risk: budgetTraveler
        ? `${budgetTraveler.name} is most exposed if the group cuts the cost without naming what they lose.`
        : "A quiet budget cut could remove a promise without the group noticing.",
      solution: budgetProposal,
    });
  }

  return scenarios;
}

/** Keeps the original entry point for compact callers while the UI offers multiple scenarios. */
export function getDisruptionDrill(trip: Trip, proposals: ProposalOption[]): DisruptionScenario | null {
  return getDisruptionScenarios(trip, proposals).find((scenario) => scenario.id === "weather") ?? null;
}
