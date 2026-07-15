import { formatTravelerConflict, getTravelerTone } from "./presentation";
import type { Trip } from "../lib/types";

type TravelerChipPhase = "landing" | "generating" | "ready";

interface TravelerChipsProps {
  phase: TravelerChipPhase;
  trip: Trip;
}

function canDeriveTravelerTone(trip: Trip) {
  return Array.isArray(trip.days) && trip.days.every((day) => Array.isArray(day.activities));
}

export function TravelerChips({ phase, trip }: TravelerChipsProps) {
  return (
    <ul className={`travelerChips travelerChips-${phase}`} aria-label="Traveler preferences">
      {trip.travelers.map((traveler, index) => {
        const tone =
          phase === "ready" && canDeriveTravelerTone(trip)
            ? getTravelerTone(trip, traveler.id)
            : "neutral";

        return (
          <li className={`travelerChip travelerChip-${tone}`} key={traveler.id}>
            <span>{`T${String(index + 1).padStart(2, "0")} // ${traveler.name}`}</span>
            <small>{formatTravelerConflict(traveler)}</small>
          </li>
        );
      })}
    </ul>
  );
}
