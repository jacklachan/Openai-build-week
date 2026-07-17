import { getDecisionReceipt } from "./decision-replay";
import type { ProposalOption } from "../lib/proposal-arena";
import { getDisruptionDrill } from "../lib/disruption";
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
  const drill = getDisruptionDrill(baseTrip, proposals);

  if (!drill) return null;

  const receipt = drill.swapProposal
    ? getDecisionReceipt(baseTrip, drill.swapProposal, currency)
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
        {drill.swapProposal ? (
          <button className="disruptionChoice disruptionChoice-swap" onClick={() => onSelect(drill.swapProposal!)} type="button">
            <span>Change the pact visibly</span>
            <strong>Switch to {drill.swapProposal.summary}</strong>
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
