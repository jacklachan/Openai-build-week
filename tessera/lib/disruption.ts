import type { ProposalOption } from "./proposal-arena";
import type { Activity, Trip } from "./types";

export type DisruptionDrill = {
  affectedActivity: string;
  affectedTraveler: string;
  condition: string;
  question: string;
  risk: string;
  swapProposal?: ProposalOption;
};

function findAffectedActivity(trip: Trip): Activity | undefined {
  for (const day of trip.days) {
    const weatherExposedCriticalStop = day.activities.find((activity) =>
      /hike|summit|trail|beach|outdoor/i.test(activity.title),
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

/**
 * Builds a clearly labelled drill from the current agreement. It is not weather data;
 * its job is to pressure-test the exact promise the group has already made.
 */
export function getDisruptionDrill(trip: Trip, proposals: ProposalOption[]): DisruptionDrill | null {
  const activity = findAffectedActivity(trip);
  if (!activity) return null;

  const traveler = trip.travelers.find((person) => activity.satisfies.includes(person.id));
  const swapProposal = proposals.find((proposal) => proposal.id === "pace");

  return {
    affectedActivity: activity.title,
    affectedTraveler: traveler?.name ?? "The group",
    condition: `Heavy rain makes ${activity.title} a bad fit today.`,
    question: `Do we hold ${traveler?.name ?? "the group"}'s promise, or change the pact before anyone is surprised?`,
    risk: traveler
      ? `${traveler.name} is the person most likely to lose something they named if this gets solved quietly.`
      : "A quiet itinerary edit could remove a promise without the group noticing.",
    swapProposal,
  };
}
