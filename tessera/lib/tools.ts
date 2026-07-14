import type { FunctionTool } from "openai/resources/responses/responses";

import { estimateBudget } from "@/lib/budget";
import { parseTrip, validateCommittedTrip } from "@/lib/plan-validation";
import type { TransportLeg, Trip } from "@/lib/types";

type JsonSchema = Record<string, unknown>;

const objectSchema = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const nullable = (type: "string" | "number"): JsonSchema => ({
  type: [type, "null"],
});
const stringArray: JsonSchema = { type: "array", items: { type: "string" } };

const interestSchema: JsonSchema = {
  type: "string",
  enum: [
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
  ],
};
const activitySchema = objectSchema({
  id: { type: "string" },
  title: { type: "string" },
  placeId: nullable("string"),
  lat: nullable("number"),
  lng: nullable("number"),
  startTime: nullable("string"),
  durationMin: nullable("number"),
  category: {
    type: "string",
    enum: [
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
      "transport",
      "meal",
      "lodging",
    ],
  },
  estCostPerPerson: nullable("number"),
  rationale: { type: "string" },
  satisfies: stringArray,
  tension: nullable("string"),
});
const transportSchema = objectSchema({
  mode: {
    type: "string",
    enum: ["flight", "train", "metro", "walk", "taxi", "ferry", "bus"],
  },
  fromName: { type: "string" },
  toName: { type: "string" },
  fromPlaceId: nullable("string"),
  toPlaceId: nullable("string"),
  durationMin: nullable("number"),
  estCost: nullable("number"),
});
const tripSchema = objectSchema({
  id: { type: "string" },
  constraints: objectSchema({
    destination: { type: "string" },
    startDate: nullable("string"),
    days: { type: "number" },
    currency: { type: "string" },
    budgetCeiling: nullable("number"),
    originCity: nullable("string"),
  }),
  travelers: {
    type: "array",
    items: objectSchema({
      id: { type: "string" },
      name: { type: "string" },
      budgetContribution: nullable("number"),
      pace: { type: "string", enum: ["slow", "moderate", "packed"] },
      interests: { type: "array", items: interestSchema },
      dietary: stringArray,
      accessibility: stringArray,
      mustDo: stringArray,
      dealbreakers: stringArray,
    }),
  },
  days: {
    type: "array",
    items: objectSchema({
      day: { type: "number" },
      date: nullable("string"),
      summary: { type: "string" },
      activities: { type: "array", items: activitySchema },
      transportLegs: { type: "array", items: transportSchema },
    }),
  },
  budget: objectSchema({
    ceiling: nullable("number"),
    total: { type: "number" },
    lines: {
      type: "array",
      items: objectSchema({
        category: { type: "string" },
        estimate: { type: "number" },
      }),
    },
  }),
  tradeoffs: stringArray,
  version: { type: "number" },
});

export const tesseraToolDefinitions: FunctionTool[] = [
  {
    type: "function",
    name: "search_places",
    description: "Search the curated Tokyo activity catalogue for grounded places.",
    strict: true,
    parameters: objectSchema({
      query: { type: "string" },
      near: nullable("string"),
      type: nullable("string"),
    }),
  },
  {
    type: "function",
    name: "get_route",
    description: "Return a transport leg between two known catalogue place ids.",
    strict: true,
    parameters: objectSchema({
      fromPlaceId: { type: "string" },
      toPlaceId: { type: "string" },
      mode: {
        type: "string",
        enum: ["flight", "train", "metro", "walk", "taxi", "ferry", "bus"],
      },
    }),
  },
  {
    type: "function",
    name: "estimate_budget",
    description: "Compute the authoritative group budget for a proposed Trip. Never calculate totals yourself.",
    strict: true,
    parameters: objectSchema({ trip: tripSchema }),
  },
  {
    type: "function",
    name: "commit_plan",
    description: "Finalize a complete Trip only after grounding places, routes, and the deterministic budget.",
    strict: true,
    parameters: objectSchema({ trip: tripSchema }),
  },
];

const tokyoPlaces = [
  { placeId: "tokyo-shinjuku-gyoen", name: "Shinjuku Gyoen National Garden", lat: 35.6852, lng: 139.7101, priceLevel: 1, rating: 4.6 },
  { placeId: "tokyo-akihabara", name: "Akihabara Electric Town", lat: 35.7023, lng: 139.7745, priceLevel: 2, rating: 4.5 },
  { placeId: "tokyo-mount-takao", name: "Mount Takao", lat: 35.6254, lng: 139.2434, priceLevel: 1, rating: 4.6 },
  { placeId: "tokyo-sensoji", name: "Senso-ji", lat: 35.7148, lng: 139.7967, priceLevel: 1, rating: 4.6 },
  { placeId: "tokyo-tsukiji", name: "Tsukiji Outer Market", lat: 35.6654, lng: 139.7707, priceLevel: 2, rating: 4.4 },
  { placeId: "tokyo-shibuya-sky", name: "Shibuya Sky", lat: 35.658, lng: 139.7016, priceLevel: 2, rating: 4.6 },
];

function requireRecord(value: unknown, tool: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${tool} arguments must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string.`);
  return value;
}

function routeFor(
  fromPlaceId: string,
  toPlaceId: string,
  mode: TransportLeg["mode"],
): TransportLeg {
  const from = tokyoPlaces.find((place) => place.placeId === fromPlaceId);
  const to = tokyoPlaces.find((place) => place.placeId === toPlaceId);
  if (!from || !to) throw new Error("Route endpoints must come from search_places.");
  const durationMin = mode === "walk" ? 40 : mode === "taxi" ? 20 : 28;
  const estCost = mode === "walk" ? 0 : mode === "taxi" ? 35 : 6;
  return { mode, fromName: from.name, toName: to.name, fromPlaceId, toPlaceId, durationMin, estCost };
}

export async function executeTesseraTool(name: string, rawArguments: unknown): Promise<unknown> {
  const args = requireRecord(rawArguments, name);
  switch (name) {
    case "search_places": {
      const query = requireString(args.query, "search_places.query").toLowerCase();
      const matches = tokyoPlaces.filter((place) =>
        `${place.name} ${place.placeId}`.toLowerCase().includes(query),
      );
      return matches.length > 0 ? matches : tokyoPlaces;
    }
    case "get_route": {
      const mode = requireString(args.mode, "get_route.mode") as TransportLeg["mode"];
      if (!["flight", "train", "metro", "walk", "taxi", "ferry", "bus"].includes(mode)) {
        throw new Error("get_route.mode is invalid.");
      }
      return routeFor(
        requireString(args.fromPlaceId, "get_route.fromPlaceId"),
        requireString(args.toPlaceId, "get_route.toPlaceId"),
        mode,
      );
    }
    case "estimate_budget": {
      return estimateBudget(parseTrip(args.trip));
    }
    case "commit_plan": {
      const trip = validateCommittedTrip(args.trip);
      return { accepted: true, trip };
    }
    default:
      throw new Error(`Unsupported Tessera tool: ${name}`);
  }
}

export function isCommittedPlan(result: unknown): result is { accepted: true; trip: Trip } {
  return (
    typeof result === "object" &&
    result !== null &&
    "accepted" in result &&
    (result as { accepted?: unknown }).accepted === true &&
    "trip" in result
  );
}
