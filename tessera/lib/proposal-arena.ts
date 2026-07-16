import { estimateBudget } from "./budget";
import type { Activity, Trip } from "./types";

export type ProposalId = "fairness" | "pace" | "budget";

export type ProposalOption = {
  id: ProposalId;
  label: string;
  summary: string;
  tradeoff: string;
  scores: { budget: number; fairness: number; pace: number };
  trip: Trip;
};

function cloneTrip(trip: Trip, suffix: string): Trip {
  return { ...structuredClone(trip), id: `${trip.id}-${suffix}` };
}

function withBudget(trip: Trip): Trip {
  return { ...trip, budget: { ceiling: trip.constraints.budgetCeiling, ...estimateBudget(trip) } };
}

function findActivity(trip: Trip, predicate: (activity: Activity) => boolean) {
  for (const day of trip.days) {
    const index = day.activities.findIndex(predicate);
    if (index >= 0) return { day, index };
  }
  return undefined;
}

function makePaceProposal(base: Trip): Trip {
  const trip = cloneTrip(base, "pace");
  const target = findActivity(trip, (activity) => activity.id === "mount-takao") ??
    findActivity(trip, (activity) => Boolean(activity.tension));
  if (!target) return trip;

  const original = target.day.activities[target.index]!;
  target.day.activities[target.index] = {
    ...original,
    category: "city",
    durationMin: 120,
    estCostPerPerson: 28,
    id: `${original.id}-late-alternative`,
    lat: 35.6491,
    lng: 139.789,
    rationale: "A later, mostly indoor alternative lowers the walking and early-start burden without losing a shared highlight.",
    startTime: "11:00",
    tension: "The group trades the most demanding stop for a lower-friction shared experience.",
    title: "teamLab Planets",
  };
  trip.tradeoffs = [
    "The early, high-effort stop is replaced with a late indoor experience so the group protects a slower pace.",
    "Ravi gives up the biggest adventure moment; everyone keeps a memorable shared highlight.",
  ];
  return withBudget(trip);
}

function makeBudgetProposal(base: Trip): Trip {
  const trip = cloneTrip(base, "budget");
  const target = findActivity(trip, (activity) => activity.id === "special-dinner") ??
    findActivity(trip, (activity) => activity.category === "meal" && (activity.estCostPerPerson ?? 0) >= 60);
  if (!target) return trip;

  const original = target.day.activities[target.index]!;
  target.day.activities[target.index] = {
    ...original,
    estCostPerPerson: Math.max(18, Math.round((original.estCostPerPerson ?? 48) * 0.32)),
    id: `${original.id}-local-set`,
    rationale: "A well-reviewed local vegetarian set keeps the shared dinner ritual while releasing money for flexible group choices.",
    tension: "Priya trades the one premium splurge for a thoughtful, lower-cost dinner.",
    title: "Local vegetarian set dinner",
  };
  trip.tradeoffs = [
    "The premium dinner becomes a local vegetarian set, preserving the shared meal while creating more budget headroom.",
    "Priya gives up the luxury format so the group carries less cost risk.",
  ];
  return withBudget(trip);
}

function budgetScore(trip: Trip) {
  const ceiling = trip.budget.ceiling ?? trip.constraints.budgetCeiling;
  if (!ceiling) return 75;
  return Math.max(0, Math.min(100, Math.round((1 - trip.budget.total / ceiling) * 100)));
}

/** Produces transparent, deterministic alternatives for the no-key arena and any generated plan. */
export function getProposalOptions(trip: Trip): ProposalOption[] {
  const fairTrip = cloneTrip(trip, "fairness");
  const paceTrip = makePaceProposal(trip);
  const budgetTrip = makeBudgetProposal(trip);

  return [
    {
      id: "fairness",
      label: "Best fairness",
      summary: "Protect every traveler’s named must-do.",
      tradeoff: "One early start and one premium dinner remain in play.",
      scores: { budget: budgetScore(fairTrip), fairness: 94, pace: 82 },
      trip: fairTrip,
    },
    {
      id: "pace",
      label: "Lowest friction",
      summary: "Trade the hardest stop for a late shared experience.",
      tradeoff: "Ravi gives up the biggest adventure moment.",
      scores: { budget: budgetScore(paceTrip), fairness: 86, pace: 96 },
      trip: paceTrip,
    },
    {
      id: "budget",
      label: "Most headroom",
      summary: "Keep the trip shape; cut its largest discretionary cost.",
      tradeoff: "Priya gives up the premium dinner format.",
      scores: { budget: budgetScore(budgetTrip), fairness: 78, pace: 84 },
      trip: budgetTrip,
    },
  ];
}
