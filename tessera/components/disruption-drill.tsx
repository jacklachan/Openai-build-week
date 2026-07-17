"use client";

import { useState } from "react";

import { getDecisionReceipt } from "./decision-replay";
import type { ProposalOption } from "../lib/proposal-arena";
import { getDisruptionScenarios } from "../lib/disruption";
import type { Trip } from "../lib/types";

type DisruptionDrillProps = {
  baseTrip: Trip;
  currency: string;
  onClose: () => void;
  onOpenOptions: () => void;
  onSelect: (proposal: ProposalOption) => void;
  proposals: ProposalOption[];
};

/** A no-key resilience test that makes a disruption and its human cost inspectable. */
export function DisruptionDrill({
  baseTrip,
  currency,
  onClose,
  onOpenOptions,
  onSelect,
  proposals,
}: DisruptionDrillProps) {
  const scenarios = getDisruptionScenarios(baseTrip, proposals);
  const [activeScenarioId, setActiveScenarioId] = useState<"budget" | "weather">("weather");
  const drill = scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0];

  if (!drill) return null;

  const receipt = drill.solution
    ? getDecisionReceipt(baseTrip, drill.solution, currency)
    : undefined;

  return (
    <section className="disruptionDrill" aria-labelledby="disruption-drill-title">
      <header className="disruptionDrillHeader">
        <div>
          <p>SIMULATED DISRUPTION DRILL</p>
          <h2 id="disruption-drill-title">Can this pact survive a bad day?</h2>
        </div>
        <button onClick={onClose} type="button">Close drill</button>
      </header>

      <div className="disruptionCondition">
        <span>Condition changed</span>
        <strong>{drill.condition}</strong>
        <p>{drill.question}</p>
      </div>

      <div className="disruptionScenarioPicker" aria-label="Choose a disruption to test">
        {scenarios.map((scenario) => (
          <button
            aria-pressed={scenario.id === drill.id}
            className={scenario.id === drill.id ? "disruptionScenario-active" : undefined}
            key={scenario.id}
            onClick={() => setActiveScenarioId(scenario.id)}
            type="button"
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="disruptionHumanCost">
        <span>Who carries the cost?</span>
        <p>{drill.risk}</p>
      </div>

      <div className="disruptionChoices">
        <button className="disruptionChoice disruptionChoice-hold" onClick={onClose} type="button">
          <span>Hold the original pact</span>
          <strong>Keep {drill.affectedActivity}</strong>
          <small>The group accepts the weather risk rather than quietly taking away {drill.affectedTraveler}&apos;s promise.</small>
        </button>
        {drill.solution ? (
          <button className="disruptionChoice disruptionChoice-swap" onClick={() => onSelect(drill.solution!)} type="button">
            <span>Change the pact visibly</span>
            <strong>Switch to {drill.solution.summary}</strong>
            <small>{receipt?.changed} {receipt?.budget}</small>
          </button>
        ) : null}
      </div>

      <footer className="disruptionDrillFooter">
        <p>Nothing here is live weather data. It is a pressure-test of the agreement before the group relies on it.</p>
        <button onClick={onOpenOptions} type="button">Explore every compromise</button>
      </footer>
    </section>
  );
}
