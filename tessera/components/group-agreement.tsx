import type { Trip } from "../lib/types";
import type { AgreementEntry, VetoPreview } from "../lib/studio";

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

function getTravelerStyle(id: string) {
  return `avatar avatar-${id}`;
}

export function GroupAgreement({
  agreement,
  preview,
  showPreview,
  trip,
  onTogglePreview,
}: GroupAgreementProps) {
  const budgetCeiling = trip.budget.ceiling ?? trip.budget.total;
  const budgetRatio = Math.min(100, Math.round((trip.budget.total / budgetCeiling) * 100));
  const priya = agreement.find((entry) => entry.traveler.id === "priya")?.traveler;

  return (
    <aside className="agreementRail" aria-labelledby="agreement-title">
      <div className="agreementHeading">
        <div>
          <p className="eyebrow">Live consensus</p>
          <h1 id="agreement-title">Group Agreement</h1>
        </div>
        <span className="agreementStatus">In balance</span>
      </div>

      <div className="agreementList">
        {agreement.map(({ concession, mustDo, traveler }) => (
          <article className="agreementCard" key={traveler.id}>
            <div className="travelerHeading">
              <span className={getTravelerStyle(traveler.id)} aria-hidden="true">
                {traveler.name.charAt(0)}
              </span>
              <div>
                <h2>{traveler.name}</h2>
                <div className="travelerTags">
                  <span>{traveler.interests[0]}</span>
                  <span>{traveler.pace} pace</span>
                </div>
              </div>
            </div>
            <dl className="agreementPromises">
              <div>
                <dt>
                  <span className="checkMark" aria-hidden="true">✓</span>
                  Must-do
                </dt>
                <dd>{mustDo}</dd>
              </div>
              <div>
                <dt>
                  <span className="tradeMark" aria-hidden="true">↳</span>
                  Concession
                </dt>
                <dd>{concession}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <section className="budgetSummary" aria-label="Group budget">
        <div className="budgetTopline">
          <span>Group budget</span>
          <span>{budgetRatio}% committed</span>
        </div>
        <p>
          <strong>{formatCurrency(trip.budget.total, trip.constraints.currency)}</strong>
          <span> / {formatCurrency(budgetCeiling, trip.constraints.currency)}</span>
        </p>
        <div className="budgetTrack" aria-hidden="true">
          <span style={{ width: `${budgetRatio}%` }} />
        </div>
      </section>

      <section className={`vetoCard${showPreview ? " isPreviewing" : ""}`} aria-live="polite">
        <div className="vetoHeading">
          <span className="vetoShield" aria-hidden="true">✦</span>
          <div>
            <p>{priya?.name ?? "A traveler"} vetoes the early start</p>
            <span>Protecting slow mornings</span>
          </div>
          <button type="button" onClick={onTogglePreview}>
            {showPreview ? "Reset" : "Preview change"}
          </button>
        </div>
        {showPreview ? (
          <div className="vetoRoute">
            <div>
              <span>Before</span>
              <strong>{preview.removedActivity}</strong>
              <small>Day 2 · {preview.beforeTime}</small>
            </div>
            <span className="routeArrow" aria-hidden="true">→</span>
            <div>
              <span>Proposed</span>
              <strong>{preview.replacement}</strong>
              <small>Day 2 · {preview.afterTime}</small>
            </div>
          </div>
        ) : (
          <p className="vetoHint">Preview a later Day 2 start before applying a revision.</p>
        )}
      </section>

      <div className="planComposer">
        <label className="srOnly" htmlFor="plan-request">Plan chat connects to the trip logic</label>
        <input id="plan-request" disabled placeholder="Plan chat connects here" />
        <span aria-hidden="true">↑</span>
      </div>
    </aside>
  );
}
