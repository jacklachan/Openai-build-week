"use client";

import { useMemo, useState } from "react";

import type { AgreementEntry } from "../lib/studio";
import type { Trip } from "../lib/types";

type Decision = "ready" | "needs-change" | "unanswered";

function getDecisionLabel(decision: Decision) {
  if (decision === "ready") return "Ready";
  if (decision === "needs-change") return "Needs a change";
  return "Waiting";
}

export function getDecisionRoomSummary(entries: AgreementEntry[], decisions: Record<string, Decision>) {
  const ready = entries.filter((entry) => decisions[entry.traveler.id] === "ready").length;
  const needsChange = entries.filter((entry) => decisions[entry.traveler.id] === "needs-change").length;

  return {
    needsChange,
    ready,
    total: entries.length,
    unanimous: entries.length > 0 && ready === entries.length,
  };
}

export function createAgreementBrief(trip: Trip, agreement: AgreementEntry[]) {
  const currency = trip.constraints.currency;
  const total = new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(trip.budget.total);
  const lines = agreement.flatMap((entry) => [
    `${entry.traveler.name} keeps: ${entry.mustDo}`,
    `${entry.traveler.name} trade-off: ${entry.concession}`,
  ]);

  return [
    `Tessera group agreement — ${trip.constraints.destination}`,
    `${trip.constraints.days}-day trip · estimated total ${total}`,
    "",
    ...lines,
    "",
    `Plan version ${trip.version}`,
  ].join("\n");
}

function downloadAgreementBrief(trip: Trip, agreement: AgreementEntry[]) {
  const blob = new Blob([createAgreementBrief(trip, agreement)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tessera-${trip.constraints.destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-agreement.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DecisionRoom({
  agreement,
  onRequestChange,
  trip,
}: {
  agreement: AgreementEntry[];
  onRequestChange?: () => void;
  trip: Trip;
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const summary = useMemo(() => getDecisionRoomSummary(agreement, decisions), [agreement, decisions]);

  return (
    <section className="decisionRoom" aria-labelledby="decision-room-title">
      <header className="decisionRoomHeading">
        <div>
          <p>GROUP CHECK-IN</p>
          <h3 id="decision-room-title">
            {summary.unanimous ? "Everyone is ready to book." : "Is this plan actually a yes?"}
          </h3>
        </div>
        <span className={summary.unanimous ? "decisionCount decisionCount-ready" : "decisionCount"}>
          {`${summary.ready}/${summary.total} READY`}
        </span>
      </header>

      <div className="decisionVotes">
        {agreement.map((entry, index) => {
          const decision = decisions[entry.traveler.id] ?? "unanswered";
          return (
            <div className="decisionVote" key={entry.traveler.id}>
              <div className="decisionTraveler">
                <span className="decisionTravelerIndex">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{entry.traveler.name}</strong>
                  <p>{entry.mustDo}</p>
                </div>
              </div>
              <div className="decisionResponse">
                <span>{getDecisionLabel(decision)}</span>
                <div className="decisionActions">
                <button
                  aria-pressed={decision === "ready"}
                  className={decision === "ready" ? "decisionButton decisionButton-active" : "decisionButton"}
                  onClick={() => setDecisions((current) => ({ ...current, [entry.traveler.id]: "ready" }))}
                  type="button"
                >
                  I&apos;m in
                </button>
                <button
                  aria-pressed={decision === "needs-change"}
                  className={decision === "needs-change" ? "decisionButton decisionButton-warning" : "decisionButton"}
                  onClick={() => {
                    setDecisions((current) => ({ ...current, [entry.traveler.id]: "needs-change" }));
                    onRequestChange?.();
                  }}
                  type="button"
                >
                  Flag a concern
                </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="decisionRoomFooter">
        <p>
          {summary.needsChange
            ? `${summary.needsChange} traveler${summary.needsChange === 1 ? "" : "s"} flagged a concern. The map is ready for a visible alternative.`
            : summary.unanimous
              ? "All travelers are in. Take the signed pact with you."
              : "Each traveler can accept their promise or surface a concern."}
        </p>
        <button className="briefButton" onClick={() => downloadAgreementBrief(trip, agreement)} type="button">
          {summary.unanimous ? "Download signed pact" : "Download brief"}
        </button>
      </footer>
    </section>
  );
}
