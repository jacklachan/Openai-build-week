export type Interest =
  | "nature"
  | "city"
  | "food"
  | "adventure"
  | "relaxation"
  | "culture"
  | "nightlife"
  | "shopping"
  | "anime"
  | "beach"
  | "history";

export interface TravelerProfile {
  id: string;
  name: string;
  budgetContribution?: number;
  pace: "slow" | "moderate" | "packed";
  interests: Interest[];
  dietary: string[];
  accessibility: string[];
  mustDo: string[];
  dealbreakers: string[];
}

export interface TripConstraints {
  destination: string;
  startDate?: string;
  days: number;
  currency: string;
  budgetCeiling?: number;
  originCity?: string;
}

export interface Activity {
  id: string;
  title: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  startTime?: string;
  durationMin?: number;
  category: Interest | "transport" | "meal" | "lodging";
  estCostPerPerson?: number;
  rationale: string;
  satisfies: string[];
  tension?: string;
}

export interface TransportLeg {
  mode: "flight" | "train" | "metro" | "walk" | "taxi" | "ferry" | "bus";
  fromName: string;
  toName: string;
  fromPlaceId?: string;
  toPlaceId?: string;
  durationMin?: number;
  estCost?: number;
}

export interface DayPlan {
  day: number;
  date?: string;
  summary: string;
  activities: Activity[];
  transportLegs: TransportLeg[];
}

export interface BudgetLine {
  category: string;
  estimate: number;
}

export interface Trip {
  id: string;
  constraints: TripConstraints;
  travelers: TravelerProfile[];
  days: DayPlan[];
  budget: { ceiling?: number; total: number; lines: BudgetLine[] };
  tradeoffs: string[];
  version: number;
}
