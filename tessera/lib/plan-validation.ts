import { estimateBudget } from "@/lib/budget";
import type {
  Activity,
  DayPlan,
  Interest,
  TransportLeg,
  TravelerProfile,
  Trip,
  TripConstraints,
} from "@/lib/types";

const interests = new Set<Interest>([
  "nature",
  "city",
  "food",
  "adventure",
  "relaxation",
  "culture",
  "nightlife",
  "shopping",
  "anime",
  "beach",
  "history",
]);
const activityCategories = new Set([...interests, "transport", "meal", "lodging"]);
const transportModes = new Set([
  "flight",
  "train",
  "metro",
  "walk",
  "taxi",
  "ferry",
  "bus",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredString(value, field);
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number.`);
  }
  return value;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredNumber(value, field);
}

function requiredStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings.`);
  }
  return value;
}

function parseTraveler(value: unknown, index: number): TravelerProfile {
  if (!isRecord(value)) throw new Error(`travelers[${index}] must be an object.`);
  const pace = requiredString(value.pace, `travelers[${index}].pace`);
  if (pace !== "slow" && pace !== "moderate" && pace !== "packed") {
    throw new Error(`travelers[${index}].pace is invalid.`);
  }
  const parsedInterests = requiredStringArray(
    value.interests,
    `travelers[${index}].interests`,
  );
  if (parsedInterests.some((interest) => !interests.has(interest as Interest))) {
    throw new Error(`travelers[${index}].interests contains an invalid value.`);
  }

  return {
    id: requiredString(value.id, `travelers[${index}].id`),
    name: requiredString(value.name, `travelers[${index}].name`),
    ...(optionalNumber(value.budgetContribution, `travelers[${index}].budgetContribution`) !==
    undefined
      ? { budgetContribution: optionalNumber(value.budgetContribution, `travelers[${index}].budgetContribution`) }
      : {}),
    pace,
    interests: parsedInterests as Interest[],
    dietary: requiredStringArray(value.dietary, `travelers[${index}].dietary`),
    accessibility: requiredStringArray(value.accessibility, `travelers[${index}].accessibility`),
    mustDo: requiredStringArray(value.mustDo, `travelers[${index}].mustDo`),
    dealbreakers: requiredStringArray(value.dealbreakers, `travelers[${index}].dealbreakers`),
  };
}

function parseConstraints(value: unknown): TripConstraints {
  if (!isRecord(value)) throw new Error("constraints must be an object.");
  const constraints: TripConstraints = {
    destination: requiredString(value.destination, "constraints.destination"),
    days: requiredNumber(value.days, "constraints.days"),
    currency: requiredString(value.currency, "constraints.currency"),
  };
  const startDate = optionalString(value.startDate, "constraints.startDate");
  const budgetCeiling = optionalNumber(value.budgetCeiling, "constraints.budgetCeiling");
  const originCity = optionalString(value.originCity, "constraints.originCity");
  if (startDate !== undefined) constraints.startDate = startDate;
  if (budgetCeiling !== undefined) constraints.budgetCeiling = budgetCeiling;
  if (originCity !== undefined) constraints.originCity = originCity;
  return constraints;
}

function parseActivity(value: unknown, dayIndex: number, activityIndex: number): Activity {
  const prefix = `days[${dayIndex}].activities[${activityIndex}]`;
  if (!isRecord(value)) throw new Error(`${prefix} must be an object.`);
  const category = requiredString(value.category, `${prefix}.category`);
  if (!activityCategories.has(category)) throw new Error(`${prefix}.category is invalid.`);
  const activity: Activity = {
    id: requiredString(value.id, `${prefix}.id`),
    title: requiredString(value.title, `${prefix}.title`),
    category: category as Activity["category"],
    rationale: requiredString(value.rationale, `${prefix}.rationale`),
    satisfies: requiredStringArray(value.satisfies, `${prefix}.satisfies`),
  };
  const fields = [
    ["placeId", optionalString(value.placeId, `${prefix}.placeId`)],
    ["startTime", optionalString(value.startTime, `${prefix}.startTime`)],
    ["tension", optionalString(value.tension, `${prefix}.tension`)],
    ["lat", optionalNumber(value.lat, `${prefix}.lat`)],
    ["lng", optionalNumber(value.lng, `${prefix}.lng`)],
    ["durationMin", optionalNumber(value.durationMin, `${prefix}.durationMin`)],
    ["estCostPerPerson", optionalNumber(value.estCostPerPerson, `${prefix}.estCostPerPerson`)],
  ] as const;
  for (const [field, parsed] of fields) {
    if (parsed !== undefined) Object.assign(activity, { [field]: parsed });
  }
  return activity;
}

function parseTransportLeg(value: unknown, dayIndex: number, legIndex: number): TransportLeg {
  const prefix = `days[${dayIndex}].transportLegs[${legIndex}]`;
  if (!isRecord(value)) throw new Error(`${prefix} must be an object.`);
  const mode = requiredString(value.mode, `${prefix}.mode`);
  if (!transportModes.has(mode)) throw new Error(`${prefix}.mode is invalid.`);
  const leg: TransportLeg = {
    mode: mode as TransportLeg["mode"],
    fromName: requiredString(value.fromName, `${prefix}.fromName`),
    toName: requiredString(value.toName, `${prefix}.toName`),
  };
  const fields = [
    ["fromPlaceId", optionalString(value.fromPlaceId, `${prefix}.fromPlaceId`)],
    ["toPlaceId", optionalString(value.toPlaceId, `${prefix}.toPlaceId`)],
    ["durationMin", optionalNumber(value.durationMin, `${prefix}.durationMin`)],
    ["estCost", optionalNumber(value.estCost, `${prefix}.estCost`)],
  ] as const;
  for (const [field, parsed] of fields) {
    if (parsed !== undefined) Object.assign(leg, { [field]: parsed });
  }
  return leg;
}

function parseDay(value: unknown, index: number): DayPlan {
  if (!isRecord(value)) throw new Error(`days[${index}] must be an object.`);
  if (!Array.isArray(value.activities) || !Array.isArray(value.transportLegs)) {
    throw new Error(`days[${index}] must include activities and transportLegs arrays.`);
  }
  const day: DayPlan = {
    day: requiredNumber(value.day, `days[${index}].day`),
    summary: requiredString(value.summary, `days[${index}].summary`),
    activities: value.activities.map((activity, activityIndex) =>
      parseActivity(activity, index, activityIndex),
    ),
    transportLegs: value.transportLegs.map((leg, legIndex) =>
      parseTransportLeg(leg, index, legIndex),
    ),
  };
  const date = optionalString(value.date, `days[${index}].date`);
  if (date !== undefined) day.date = date;
  return day;
}

export function parseTrip(value: unknown): Trip {
  if (!isRecord(value)) throw new Error("Trip must be an object.");
  if (!Array.isArray(value.travelers) || !Array.isArray(value.days)) {
    throw new Error("Trip travelers and days must be arrays.");
  }
  if (!isRecord(value.budget)) throw new Error("Trip budget must be an object.");

  const trip: Trip = {
    id: requiredString(value.id, "id"),
    constraints: parseConstraints(value.constraints),
    travelers: value.travelers.map(parseTraveler),
    days: value.days.map(parseDay),
    budget: {
      total: requiredNumber(value.budget.total, "budget.total"),
      lines: [],
    },
    tradeoffs: requiredStringArray(value.tradeoffs, "tradeoffs"),
    version: requiredNumber(value.version, "version"),
  };
  const ceiling = optionalNumber(value.budget.ceiling, "budget.ceiling");
  if (ceiling !== undefined) trip.budget.ceiling = ceiling;
  if (!Array.isArray(value.budget.lines)) throw new Error("budget.lines must be an array.");
  trip.budget.lines = value.budget.lines.map((line, index) => {
    if (!isRecord(line)) throw new Error(`budget.lines[${index}] must be an object.`);
    return {
      category: requiredString(line.category, `budget.lines[${index}].category`),
      estimate: requiredNumber(line.estimate, `budget.lines[${index}].estimate`),
    };
  });

  if (trip.days.length !== trip.constraints.days) {
    throw new Error("Trip day count must match constraints.days.");
  }
  if (new Set(trip.travelers.map((traveler) => traveler.id)).size !== trip.travelers.length) {
    throw new Error("Traveler ids must be unique.");
  }
  return trip;
}

export function validateCommittedTrip(value: unknown): Trip {
  const trip = parseTrip(value);
  const computedBudget = estimateBudget(trip);
  if (trip.budget.total !== computedBudget.total) {
    throw new Error("Trip budget.total does not match the deterministic estimate.");
  }
  if (JSON.stringify(trip.budget.lines) !== JSON.stringify(computedBudget.lines)) {
    throw new Error("Trip budget.lines does not match the deterministic estimate.");
  }
  if (trip.constraints.budgetCeiling !== undefined && trip.budget.total > trip.constraints.budgetCeiling) {
    throw new Error("Trip budget exceeds constraints.budgetCeiling.");
  }
  if (trip.days.flatMap((day) => day.activities).some((activity) => !activity.rationale.trim())) {
    throw new Error("Every activity must include a rationale.");
  }
  return trip;
}
