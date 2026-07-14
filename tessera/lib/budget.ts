import type { BudgetLine, Trip } from "@/lib/types";

export function estimateBudget(trip: Trip): {
  total: number;
  lines: BudgetLine[];
} {
  const estimates = new Map<string, number>();

  for (const day of trip.days) {
    for (const activity of day.activities) {
      if (activity.estCostPerPerson === undefined) continue;

      const estimate = activity.estCostPerPerson * trip.travelers.length;
      estimates.set(
        activity.category,
        (estimates.get(activity.category) ?? 0) + estimate,
      );
    }

    for (const leg of day.transportLegs) {
      if (leg.estCost === undefined) continue;

      estimates.set(
        "transport",
        (estimates.get("transport") ?? 0) + leg.estCost,
      );
    }
  }

  const lines = [...estimates]
    .map(([category, estimate]) => ({ category, estimate }))
    .sort((a, b) => a.category.localeCompare(b.category));
  const total = lines.reduce((sum, line) => sum + line.estimate, 0);

  return { total, lines };
}
