"use client";

import { useState, type FormEvent } from "react";
import { AtlasMotion } from "./atlas-motion";
import { AtlasStatus } from "./atlas-status";
import { GroupAgreement } from "./group-agreement";
import { ItineraryTray } from "./itinerary-tray";
import { TradeoffPanel } from "./tradeoff-panel";
import { TripMap } from "./trip-map";
import { TravelerChips } from "./traveler-chips";
import {
  getAgreementEntries,
  getSelectedDay,
  getVetoPreview,
  type VetoPreview,
} from "../lib/studio";
import type { Trip } from "../lib/types";

interface TripStudioProps {
  trip: Trip;
}

type PlanSource = "demo" | "live" | "cache";
type StudioPhase = "landing" | "generating" | "ready" | "error";

type PlanResponse = {
  error?: string;
  source?: PlanSource;
  trip?: Trip;
};

function hasPlanningWorkspace(trip: Trip) {
  return (
    Array.isArray(trip.days) &&
    trip.days.length > 0 &&
    trip.days.every((day) => Array.isArray(day.activities))
  );
}

function formatPlanError(message: string) {
  return message.replace(/[.]+$/, "");
}

function RouteOverlay({
  trip,
  selectedDay,
  selectedActivityId,
  vetoPreview,
}: {
  trip: Trip;
  selectedDay: number;
  selectedActivityId: string | null;
  vetoPreview?: VetoPreview;
}) {
  const selectedPlan = hasPlanningWorkspace(trip) ? getSelectedDay(trip, selectedDay) : undefined;
  const routeStops = selectedPlan?.activities?.slice(0, 3) ?? [];

  return (
    <div
      className="routeOverlay"
      aria-label={`Day ${selectedDay} highlighted itinerary`}
      data-selected-activity={selectedActivityId ?? undefined}
    >
      <svg className="routeLine" viewBox="0 0 500 340" aria-hidden="true" preserveAspectRatio="none">
        <path d="M92 266 C180 236, 162 167, 284 175 S349 93, 427 74" />
      </svg>
      {routeStops.map((activity, index) => {
        const displayedActivity =
          vetoPreview && activity.id === "mount-takao"
            ? { ...activity, startTime: vetoPreview.afterTime, title: vetoPreview.replacement }
            : activity;

        return (
          <div className={`routeStop stop-${index + 1}`} key={activity.id}>
            <span className="routePin">{index + 1}</span>
            <div>
              <strong>{displayedActivity.title}</strong>
              <small>Day {selectedDay} · {displayedActivity.startTime ?? "Flexible"}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TripStudio({ trip }: TripStudioProps) {
  const [activeTrip, setActiveTrip] = useState(trip);
  const [destination, setDestination] = useState(trip.constraints.destination);
  const [phase, setPhase] = useState<StudioPhase>("landing");
  const [source, setSource] = useState<PlanSource | null>(null);
  const [selectedDay, setSelectedDay] = useState(trip.days[0]?.day ?? 1);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    trip.days[0]?.activities[0]?.id ?? null,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canShowWorkspace = phase === "ready" && hasPlanningWorkspace(activeTrip);
  const vetoPreview = canShowWorkspace ? getVetoPreview(activeTrip) : undefined;

  async function requestPlan() {
    setPhase("generating");
    setErrorMessage("");

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelers: activeTrip.travelers,
          constraints: { ...activeTrip.constraints, destination },
        }),
      });
      const payload = (await response.json()) as PlanResponse;

      if (
        !response.ok ||
        !payload.trip ||
        (payload.source !== "demo" && payload.source !== "live" && payload.source !== "cache")
      ) {
        throw new Error(payload.error ?? "Unable to generate a plan");
      }

      const firstDay = payload.trip.days?.[0];

      setActiveTrip(payload.trip);
      setSelectedDay(firstDay?.day ?? 1);
      setSelectedActivityId(firstDay?.activities[0]?.id ?? null);
      setShowPreview(false);
      setSource(payload.source);
      setPhase("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate a plan");
      setPhase("error");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestPlan();
  }

  function selectDay(day: number) {
    setSelectedDay(day);
    setSelectedActivityId(getSelectedDay(activeTrip, day)?.activities[0]?.id ?? null);
  }

  if (phase !== "ready") {
    const isGenerating = phase === "generating";

    return (
      <main className={`studioShell studioShell-${phase}`}>
        <section className="landingHero" aria-labelledby="landing-title">
          <p className="landingKicker">TESSERA // GROUP TRIP NEGOTIATOR</p>
          <h1 id="landing-title">Build one trip everyone can live with.</h1>
          <p className="landingSubhead">
            Tell us where you are going. We make the tradeoffs clear before the group commits.
          </p>
          <TravelerChips phase={isGenerating ? "generating" : "landing"} trip={trip} />
          {phase === "error" ? (
            <p className="planError" role="alert">
              PLAN FAILED // {formatPlanError(errorMessage)}. RETRY.
            </p>
          ) : null}
          <form className="planForm" onSubmit={handleSubmit}>
            <label htmlFor="destination">Destination</label>
            <input
              id="destination"
              name="destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              disabled={isGenerating}
            />
            <button type="submit" disabled={isGenerating}>
              {isGenerating ? "Generating plan" : phase === "error" ? "Retry" : "Generate plan"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="studioShell studioShell-ready">
      <header className="generatedHeader">
        <p>{source === "demo" ? "PLAN GENERATED // DEMO" : "PLAN GENERATED // LIVE"}</p>
        <span>{activeTrip.constraints.destination}</span>
        <TravelerChips phase="ready" trip={activeTrip} />
      </header>

      <TradeoffPanel
        agreement={getAgreementEntries(activeTrip)}
        tradeoffs={activeTrip.tradeoffs}
        trip={activeTrip}
      />

      <section className="planningWorkspace" aria-label="Generated planning workspace">
        {canShowWorkspace && vetoPreview ? (
          <div className="studioWorkspace">
            <section className="mapWorkspace" aria-label="Tokyo itinerary map">
              <TripMap />
              <AtlasMotion />
              <AtlasStatus trip={activeTrip} />
              <RouteOverlay
                trip={activeTrip}
                selectedDay={selectedDay}
                selectedActivityId={selectedActivityId}
                vetoPreview={showPreview ? vetoPreview : undefined}
              />
              <div className="mapControls" aria-label="Map display controls">
                <span>2D</span>
                <span>◇</span>
                <span>⌾</span>
              </div>
              <ItineraryTray
                selectedDay={selectedDay}
                trip={activeTrip}
                vetoPreview={showPreview ? vetoPreview : undefined}
                onSelectDay={selectDay}
              />
            </section>

            <GroupAgreement
              agreement={getAgreementEntries(activeTrip)}
              preview={vetoPreview}
              showPreview={showPreview}
              trip={activeTrip}
              onTogglePreview={() => setShowPreview((visible) => !visible)}
            />
          </div>
        ) : (
          <p className="planState">PLAN GENERATED // ITINERARY DETAILS ARE NOT AVAILABLE.</p>
        )}
      </section>
    </main>
  );
}
