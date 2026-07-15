import { TripStudio } from "../components/trip-studio";
import seedTrip from "../data/seed-demo-trip.json";
import type { Trip } from "../lib/types";

export default function Home() {
  return <TripStudio trip={seedTrip as Trip} />;
}
