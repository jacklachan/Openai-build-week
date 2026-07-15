"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { AtlasMotion } from "./atlas-motion";
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

export function getPlanSelection(trip: Trip) {
  const firstDay = Array.isArray(trip.days) ? trip.days[0] : undefined;

  return {
    activityId: Array.isArray(firstDay?.activities) ? firstDay.activities[0]?.id ?? null : null,
    day: firstDay?.day ?? 1,
  };
}

export function GenerationTimeline({ days }: { days: number }) {
  return (
    <ol className="generationTimeline" aria-label="Generating itinerary days">
      {Array.from({ length: days }, (_, index) => (
        <li
          className="generationTimelineRow"
          key={`generation-day-${index + 1}`}
          style={{ "--timeline-index": index } as CSSProperties}
        >
          {`D${String(index + 1).padStart(2, "0")}`}
        </li>
      ))}
    </ol>
  );
}

export function getVetoPreviewForTrip(trip: Trip) {
  const vetoActivity = trip.days
    .flatMap((day) => day.activities)
    .find((activity) => activity.id === "mount-takao");

  return vetoActivity ? getVetoPreview(trip) : undefined;
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
  const hasSelectedRoute = selectedPlan?.day === selectedDay;

  return (
    <div
      className="routeOverlay"
      aria-label={`Day ${selectedDay} highlighted itinerary`}
      data-selected-activity={selectedActivityId ?? undefined}
    >
      <svg className="routeLine" viewBox="0 0 500 340" aria-hidden="true" preserveAspectRatio="none">
        <path
          className={`inkRoute${hasSelectedRoute ? " dataSelectedRoute" : ""}`}
          d="M92 266 C180 236, 162 167, 284 175 S349 93, 427 74"
        />
      </svg>
      {routeStops.map((activity, index) => {
        const displayedActivity =
          vetoPreview && activity.id === "mount-takao"
            ? { ...activity, startTime: vetoPreview.afterTime, title: vetoPreview.replacement }
            : activity;

        return (
          <div className={`routeStop squareMarkerStop stop-${index + 1}`} key={activity.id}>
            <span className="routePin squareMarker">{index + 1}</span>
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
  const initialSelection = getPlanSelection(trip);
  const [activeTrip, setActiveTrip] = useState(trip);
  const [destination, setDestination] = useState(trip.constraints.destination);
  const [phase, setPhase] = useState<StudioPhase>("landing");
  const [source, setSource] = useState<PlanSource | null>(null);
  const [selectedDay, setSelectedDay] = useState(initialSelection.day);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    initialSelection.activityId,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canShowWorkspace = phase === "ready" && hasPlanningWorkspace(activeTrip);
  const vetoPreview = canShowWorkspace ? getVetoPreviewForTrip(activeTrip) : undefined;

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

      const selection = getPlanSelection(payload.trip);

      setActiveTrip(payload.trip);
      setSelectedDay(selection.day);
      setSelectedActivityId(selection.activityId);
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
            Everyone wants something different. Get a plan that says who gave up what.
          </p>
          <TravelerChips phase={isGenerating ? "generating" : "landing"} trip={trip} />
          {isGenerating ? <GenerationTimeline days={activeTrip.constraints.days} /> : null}
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
        {canShowWorkspace ? (
          <div className="studioWorkspace">
            <section className="mapWorkspace" aria-label="Tokyo itinerary map">
              <TripMap />
              <AtlasMotion />
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
                selectedActivityId={selectedActivityId}
                selectedDay={selectedDay}
                trip={activeTrip}
                vetoPreview={showPreview ? vetoPreview : undefined}
                onSelectActivity={setSelectedActivityId}
                onSelectDay={selectDay}
              />
            </section>

            <GroupAgreement
              agreement={getAgreementEntries(activeTrip)}
              preview={vetoPreview}
              showPreview={vetoPreview ? showPreview : false}
              trip={activeTrip}
              onTogglePreview={vetoPreview ? () => setShowPreview((visible) => !visible) : undefined}
            />
          </div>
        ) : (
          <p className="planState">PLAN GENERATED // ITINERARY DETAILS ARE NOT AVAILABLE.</p>
        )}
      </section>
    </main>
  );
}
