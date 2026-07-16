import { formatTravelerConflict, getTravelerTone } from "./presentation";
import type { TravelerProfile, Trip } from "../lib/types";

type TravelerChipPhase = "landing" | "generating" | "ready";

interface TravelerChipsProps {
  phase: TravelerChipPhase;
  travelers: TravelerProfile[];
  trip?: Trip;
}

function canDeriveTravelerTone(trip: Trip) {
  return Array.isArray(trip.days) && trip.days.every((day) => Array.isArray(day.activities));
}

export function TravelerChips({ phase, travelers, trip }: TravelerChipsProps) {
  return (
    <ul className={`travelerChips travelerChips-${phase}`} aria-label="Traveler preferences">
      {travelers.map((traveler) => {
        const tone =
          phase === "ready" && trip && canDeriveTravelerTone(trip)
            ? getTravelerTone(trip, traveler.id)
            : "neutral";

        return (
          <li className={`travelerChip travelerChip-${tone}`} key={traveler.id}>
            <span>{traveler.name}</span>
            <small>{formatTravelerConflict(traveler)}</small>
          </li>
        );
      })}
    </ul>
  );
}
