"use client";

import { useState } from "react";
import { GroupAgreement } from "./group-agreement";
import { ItineraryTray } from "./itinerary-tray";
import { TripMap } from "./trip-map";
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

function TesseraMark() {
  return (
    <svg className="tesseraMark" viewBox="0 0 34 24" aria-hidden="true">
      <path d="M2 5.5 8.3 2l6.3 3.5v5.2l-6.3 3.6L2 10.7Z" fill="currentColor" opacity=".78" />
      <path d="m11 12.2 6.2-3.5 6.3 3.5v5.2l-6.3 3.6-6.2-3.6Z" fill="currentColor" />
      <path d="m17.3 3.5 6.2-3.5 6.3 3.5v5.2l-6.3 3.6-6.2-3.6Z" fill="currentColor" opacity=".58" />
    </svg>
  );
}

function RouteOverlay({
  trip,
  selectedDay,
  vetoPreview,
}: {
  trip: Trip;
  selectedDay: number;
  vetoPreview?: VetoPreview;
}) {
  const selectedPlan = getSelectedDay(trip, selectedDay);
  const routeStops = selectedPlan?.activities.slice(0, 3) ?? [];

  return (
    <div className="routeOverlay" aria-label={`Day ${selectedDay} highlighted itinerary`}>
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
  const [selectedDay, setSelectedDay] = useState(trip.days[0]?.day ?? 1);
  const [showPreview, setShowPreview] = useState(false);
  const destination = trip.constraints.destination.split(",")[0] ?? trip.constraints.destination;
  const vetoPreview = getVetoPreview(trip);

  return (
    <main className="studioShell">
      <header className="appHeader">
        <div className="brandLockup" aria-label="Tessera">
          <TesseraMark />
          <span>TESSERA</span>
        </div>
        <div className="tripSelector">
          <strong>{destination}</strong>
          <span>·</span>
          <button type="button">{trip.constraints.days} days⌄</button>
        </div>
        <div className="headerActions">
          <span className="demoReady"><i /> Demo ready</span>
          <button type="button" className="iconButton" aria-label="View group travelers">
            ♧ <span>{trip.travelers.length}</span>
          </button>
          <button type="button" className="iconButton" aria-label="Open trip preferences">☷</button>
        </div>
      </header>

      <div className="studioWorkspace">
        <section className="mapWorkspace" aria-label="Tokyo itinerary map">
          <TripMap />
          <RouteOverlay
            trip={trip}
            selectedDay={selectedDay}
            vetoPreview={showPreview ? vetoPreview : undefined}
          />
          <div className="mapControls" aria-label="Map display controls">
            <span>2D</span>
            <span>◇</span>
            <span>⌾</span>
          </div>
          <ItineraryTray
            selectedDay={selectedDay}
            trip={trip}
            vetoPreview={showPreview ? vetoPreview : undefined}
            onSelectDay={setSelectedDay}
          />
        </section>

        <GroupAgreement
          agreement={getAgreementEntries(trip)}
          preview={vetoPreview}
          showPreview={showPreview}
          trip={trip}
          onTogglePreview={() => setShowPreview((visible) => !visible)}
        />
      </div>
    </main>
  );
}
