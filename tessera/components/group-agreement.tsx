import type { AgreementEntry, VetoPreview } from "../lib/studio";
import type { Trip } from "../lib/types";
import { getBudgetState } from "./presentation";

interface GroupAgreementProps {
  agreement: AgreementEntry[];
  preview?: VetoPreview;
  showPreview?: boolean;
  trip: Trip;
  isApplyingVeto?: boolean;
  onApplyVeto?: () => void;
  onTogglePreview?: () => void;
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
  isApplyingVeto = false,
  onApplyVeto,
  onTogglePreview,
}: GroupAgreementProps) {
  const budgetState = getBudgetState(trip.budget);
  const budgetCeiling = trip.budget.ceiling;
  const currency = trip.constraints.currency;
  const veto =
    preview && onTogglePreview
      ? { day: preview.day, onTogglePreview, preview }
      : undefined;

  return (
    <aside className="agreementTranscript" aria-labelledby="agreement-title">
      <header className="transcriptHeading">
        <p className="sectionKicker">THE TRIP PACT</p>
        <h2 id="agreement-title">Everyone gets a win.</h2>
      </header>

      <div className="transcriptTurns">
        {agreement.map(({ concession, mustDo, traveler }) => (
          <article className="transcriptTurn" key={traveler.id}>
            <p className="transcriptSpeaker">TRAVELER // {traveler.name.toUpperCase()}</p>
            <p className="transcriptWin">{mustDo}</p>
            <p className="transcriptSpeaker">THE TRADE-OFF</p>
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

      {veto ? (
        <section className="vetoPanel" aria-live="polite">
          <p className="vetoLabel">{`VETO // DAY ${String(veto.day).padStart(2, "0")}`}</p>
          <p className="vetoSummary">
            {showPreview ? "Vetoed // later start proposed" : "Preview a later start proposal"}
          </p>
          <button
            className={showPreview ? "inkButton" : "signalButton"}
            type="button"
            onClick={veto.onTogglePreview}
          >
            {showPreview ? "Vetoed" : "Veto"}
          </button>
          {showPreview ? (
            <div className="vetoPreview">
              <p>
                {`BEFORE // ${veto.preview.removedActivity} // `}
                <data value={veto.preview.beforeTime}>{veto.preview.beforeTime}</data>
              </p>
              <p>
                {`PROPOSED // ${veto.preview.replacement} // `}
                <data value={veto.preview.afterTime}>{veto.preview.afterTime}</data>
              </p>
            </div>
          ) : null}
          {showPreview && onApplyVeto ? (
            <button
              className="signalButton"
              disabled={isApplyingVeto}
              onClick={onApplyVeto}
              type="button"
            >
              {isApplyingVeto ? "Re-negotiating" : "Apply veto"}
            </button>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
