import type { AgreementEntry, VetoPreview } from "../lib/studio";
import type { Trip } from "../lib/types";
import { getBudgetState } from "./presentation";

interface GroupAgreementProps {
  agreement: AgreementEntry[];
  preview: VetoPreview;
  showPreview: boolean;
  trip: Trip;
  onTogglePreview: () => void;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function GroupAgreement({
  agreement,
  preview,
  showPreview,
  trip,
  onTogglePreview,
}: GroupAgreementProps) {
  const budgetState = getBudgetState(trip.budget);
  const budgetCeiling = trip.budget.ceiling;
  const currency = trip.constraints.currency;

  return (
    <aside className="agreementTranscript" aria-labelledby="agreement-title">
      <header className="transcriptHeading">
        <p className="sectionKicker">GROUP AGREEMENT</p>
        <h2 id="agreement-title">Negotiation transcript</h2>
      </header>

      <div className="transcriptTurns">
        {agreement.map(({ concession, mustDo, traveler }) => (
          <article className="transcriptTurn" key={traveler.id}>
            <p className="transcriptSpeaker">TRAVELER // {traveler.name.toUpperCase()}</p>
            <p className="transcriptBody">{mustDo}</p>
            <p className="transcriptSpeaker">SYSTEM // CONCESSION</p>
            <p className="transcriptBody dataLeftRule">{concession}</p>
          </article>
        ))}
      </div>

      <section className="budgetBar" aria-label="Group budget">
        {budgetState.kind === "neutral" || budgetCeiling === undefined ? (
          <>
            <p className="budgetLabels">SPENT</p>
            <data className="budgetValue" value={trip.budget.total}>
              {formatCurrency(trip.budget.total, currency)}
            </data>
            <div className="budgetTrack budgetTrack-neutral" aria-hidden="true" />
          </>
        ) : (
          <>
            <p className="budgetLabels">SPENT // CEILING // DELTA</p>
            <p className="budgetValues">
              <data value={trip.budget.total}>{formatCurrency(trip.budget.total, currency)}</data>
              <span aria-hidden="true">{" // "}</span>
              <data value={budgetCeiling}>{formatCurrency(budgetCeiling, currency)}</data>
              <span aria-hidden="true">{" // "}</span>
              <data value={budgetState.delta}>{formatCurrency(budgetState.delta, currency)}</data>
            </p>
            <div className={`budgetTrack budgetTrack-${budgetState.kind}`} aria-hidden="true">
              <span style={{ width: `${budgetState.ratio}%` }} />
            </div>
          </>
        )}
      </section>

      <section className="vetoPanel" aria-live="polite">
        <p className="vetoLabel">VETO // DAY 02</p>
        <p className="vetoSummary">
          {showPreview ? "Vetoed // later start proposed" : "Preview a later start proposal"}
        </p>
        <button className="signalButton" type="button" onClick={onTogglePreview}>
          {showPreview ? "Vetoed" : "Veto"}
        </button>
        {showPreview ? (
          <div className="vetoPreview">
            <p>
              {`BEFORE // ${preview.removedActivity} // `}
              <data value={preview.beforeTime}>{preview.beforeTime}</data>
            </p>
            <p>
              {`PROPOSED // ${preview.replacement} // `}
              <data value={preview.afterTime}>{preview.afterTime}</data>
            </p>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
