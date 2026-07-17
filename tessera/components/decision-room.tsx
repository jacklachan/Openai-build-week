"use client";

import { useMemo, useState } from "react";

import type { AgreementEntry } from "../lib/studio";
import { createPactCardSvg, getPactCardFilename } from "../lib/pact-card";
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

/** A short, legible handoff for a real group chat. It contains no private chat export. */
export function createGroupShareText(trip: Trip, agreement: AgreementEntry[]) {
  const promises = agreement.map((entry) => `${entry.traveler.name}: ${entry.mustDo}`).join(" · ");
  return `Tessera pact for ${trip.constraints.destination} is ready. ${promises}. Review the trade-offs before booking.`;
}

export function getWhatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
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

function downloadPactCard(trip: Trip, agreement: AgreementEntry[]) {
  const blob = new Blob([createPactCardSvg(trip, agreement)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getPactCardFilename(trip.constraints.destination);
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
  const [shareStatus, setShareStatus] = useState("");
  const summary = useMemo(() => getDecisionRoomSummary(agreement, decisions), [agreement, decisions]);
  const shareText = useMemo(() => createGroupShareText(trip, agreement), [agreement, trip]);

  async function sharePact() {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, title: `Tessera pact — ${trip.constraints.destination}` });
        setShareStatus("Share sheet opened.");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShareStatus("Pact summary copied.");
    } catch {
      setShareStatus("Sharing was cancelled. Download or copy the pact instead.");
    }
  }

  function shareToWhatsApp() {
    window.open(getWhatsAppShareUrl(shareText), "_blank", "noopener,noreferrer");
    setShareStatus("Choose the group in WhatsApp to send the pact.");
  }

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
        <div className="pactShareActions">
          <button className="briefButton" onClick={() => void sharePact()} type="button">Share with group</button>
          <button className="briefButton briefButton-whatsapp" onClick={shareToWhatsApp} type="button">WhatsApp</button>
          <button className="briefButton" onClick={() => downloadAgreementBrief(trip, agreement)} type="button">
            {summary.unanimous ? "Download signed pact" : "Download brief"}
          </button>
          {summary.unanimous ? (
            <button className="briefButton briefButton-card" onClick={() => downloadPactCard(trip, agreement)} type="button">
              Download pact card
            </button>
          ) : null}
          {shareStatus ? <span className="pactShareStatus" role="status">{shareStatus}</span> : null}
        </div>
      </footer>
    </section>
  );
}
