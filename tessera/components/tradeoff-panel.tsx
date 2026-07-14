import { getTravelerTone, type ActivityTone } from "./presentation";
import type { AgreementEntry } from "../lib/studio";
import type { Trip } from "../lib/types";

interface TradeoffPanelProps {
  agreement: AgreementEntry[];
  tradeoffs: Trip["tradeoffs"];
  trip: Trip;
}

export function getTradeoffEntryTone(trip: Trip, entry: AgreementEntry): ActivityTone {
  if (!Array.isArray(trip.days) || !trip.days.every((day) => Array.isArray(day.activities))) {
    return "neutral";
  }

  return getTravelerTone(trip, entry.traveler.id);
}

function getNetLabel(tone: ActivityTone) {
  if (tone === "tension") return "TRADEOFF ACTIVE";
  if (tone === "satisfied") return "MUST-DO MET";
  return "OPEN";
}

export function TradeoffPanel({ agreement, tradeoffs, trip }: TradeoffPanelProps) {
  return (
    <section className="tradeoffPanel" aria-labelledby="tradeoff-panel-title">
      <div className="tradeoffPanelHeading">
        <p>GROUP AGREEMENT</p>
        <h2 id="tradeoff-panel-title">What each traveler gets—and gives up.</h2>
      </div>

      <div className="tradeoffLedger" role="table" aria-label="Traveler tradeoff ledger">
        <div className="tradeoffLedgerHeader" role="row">
          <span role="columnheader">TRAVELER</span>
          <span role="columnheader">GOT</span>
          <span role="columnheader">GAVE UP</span>
          <span role="columnheader">NET</span>
        </div>
        {agreement.map((entry, index) => {
          const tone = getTradeoffEntryTone(trip, entry);

          return (
            <div className="tradeoffLedgerRow" key={entry.traveler.id} role="row">
              <span data-label="TRAVELER" role="cell">
                {`T${String(index + 1).padStart(2, "0")} // ${entry.traveler.name}`}
              </span>
              <span className="tradeoffGot" data-label="GOT" role="cell">
                {entry.mustDo}
              </span>
              <span className="tradeoffGaveUp" data-label="GAVE UP" role="cell">
                {entry.concession}
              </span>
              <span className={`tradeoffNet tradeoffNet-${tone}`} data-label="NET" role="cell">
                {getNetLabel(tone)}
              </span>
            </div>
          );
        })}
      </div>

      {tradeoffs.length ? <p className="tradeoffNarration">{tradeoffs.join(" ")}</p> : null}
    </section>
  );
}
