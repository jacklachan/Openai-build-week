import type { ProposalId, ProposalOption } from "../lib/proposal-arena";
import { diffTrips } from "../lib/replan";
import type { Trip } from "../lib/types";
import type { TravelerProfile } from "../lib/types";

export type ReplayStep = "choice" | "conflict" | "pact" | "question" | "ripple";

type DecisionReplayProps = {
  activeProposalId: ProposalId;
  baseTrip: Trip;
  currency: string;
  onChallenge: () => void;
  onChoose: (proposal: ProposalOption) => void;
  onFinish: () => void;
  onNext: () => void;
  onShowOptions: () => void;
  proposals: ProposalOption[];
  step: ReplayStep;
  travelers: TravelerProfile[];
};

export type DecisionReceipt = {
  budget: string;
  changed: string;
  protected: string;
};

const replayCopy: Record<ProposalId, { consequence: string; title: string }> = {
  budget: {
    consequence: "Priya keeps the shared dinner ritual; the group releases money for the moments nobody will compromise on.",
    title: "The premium dinner changes. The ritual stays.",
  },
  fairness: {
    consequence: "Ravi keeps his summit, Priya keeps one exceptional dinner, and Mei still gets Tokyo after dark.",
    title: "Everyone keeps the thing they named.",
  },
  pace: {
    consequence: "Priya gets a humane start and a lower-impact day. Ravi gives up the hardest stop for a shared indoor highlight.",
    title: "The early summit becomes a late shared moment.",
  },
};

const protectedCopy: Record<ProposalId, string> = {
  budget: "The shared dinner ritual, with more room for the group budget.",
  fairness: "Every named must-do stays in the agreement.",
  pace: "Priya's later, lower-friction day and a shared highlight.",
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Math.abs(value));
}

/** Turns a proposal into a concrete receipt, so the replay never hand-waves the consequence. */
export function getDecisionReceipt(baseTrip: Trip, proposal: ProposalOption, currency: string): DecisionReceipt {
  const diff = diffTrips(baseTrip, proposal.trip);
  const removed = diff.removedActivities[0]?.title;
  const added = diff.addedActivities[0]?.title;
  const budget = diff.budget.delta;

  return {
    budget: budget === 0
      ? `Total holds at ${formatCurrency(diff.budget.after, currency)}.`
      : budget < 0
        ? `${formatCurrency(budget, currency)} stays in reserve.`
        : `${formatCurrency(budget, currency)} is added to the total.`,
    changed: removed && added
      ? `${removed} becomes ${added}.`
      : "No named stop is removed from the route.",
    protected: protectedCopy[proposal.id],
  };
}

function getTravelerNeed(traveler: TravelerProfile) {
  return (traveler.mustDo[0] ?? traveler.interests.slice(0, 2).join(" and ")) || "A trip that feels like theirs";
}

export function DecisionReplay({
  activeProposalId,
  baseTrip,
  currency,
  onChallenge,
  onChoose,
  onFinish,
  onNext,
  onShowOptions,
  proposals,
  step,
  travelers,
}: DecisionReplayProps) {
  const activeCopy = replayCopy[activeProposalId];
  const activeProposal = proposals.find((proposal) => proposal.id === activeProposalId) ?? proposals[0];
  const receipt = activeProposal ? getDecisionReceipt(baseTrip, activeProposal, currency) : undefined;

  return (
    <section className="decisionReplay" aria-labelledby="decision-replay-title">
      <div className="decisionReplayBackdrop" aria-hidden="true" />
      <div className="decisionReplayPanel">
        <header className="decisionReplayHeader">
          <p>Tokyo decision replay</p>
          <button className="decisionReplaySkip" onClick={onFinish} type="button">
            Skip replay
          </button>
        </header>

        <ol className="decisionReplayProgress" aria-label="Decision replay progress">
          {(["conflict", "question", "ripple", "pact"] as ReplayStep[]).map((item, index) => (
            <li aria-current={item === step ? "step" : undefined} className={item === step ? "decisionReplayProgress-active" : undefined} key={item}>
              <span>{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>

        {step === "conflict" ? (
          <div className="decisionReplayScene" key="conflict">
            <p className="decisionReplayEyebrow">Before there is a route, there is a conflict.</p>
            <h2 id="decision-replay-title">Three people asked for a different Tokyo.</h2>
            <div className="decisionReplayPeople">
              {travelers.map((traveler) => (
                <article key={traveler.id}>
                  <span>{traveler.name.slice(0, 1)}</span>
                  <div>
                    <strong>{traveler.name}</strong>
                    <p>{getTravelerNeed(traveler)}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="decisionReplayConflict">
              Ravi wants a summit. Priya cannot start at dawn. Mei wants the city after dark. A normal itinerary has no way to make that trade visible.
            </p>
            <button className="decisionReplayPrimary" onClick={onNext} type="button">
              Ask the one question
            </button>
          </div>
        ) : null}

        {step === "question" ? (
          <div className="decisionReplayScene decisionReplayQuestion" key="question">
            <p className="decisionReplayEyebrow">The one answer that changes this trip.</p>
            <h2 id="decision-replay-title">Priya, would you take one 08:30 start?</h2>
            <p className="decisionReplayLead">
              That one answer decides whether Ravi keeps Mount Takao—and whether the group has to make Priya carry the hidden cost of the plan.
            </p>
            <div className="decisionQuestionSignal">
              <span>Silent-loser check</span>
              <p>Without an explicit answer, Priya absorbs the early start while everyone else gets what they asked for.</p>
            </div>
            <div className="decisionQuestionAnswers">
              <button
                className="decisionQuestionAnswer decisionQuestionAnswer-keep"
                onClick={() => {
                  const proposal = proposals.find((item) => item.id === "fairness");
                  if (proposal) onChoose(proposal);
                }}
                type="button"
              >
                <span>Yes — protect Ravi&apos;s hike</span>
                <strong>Ravi keeps Mount Takao. Priya keeps her special dinner.</strong>
                <small>The route starts once at 08:30; the compromise is written into the pact.</small>
              </button>
              <button
                className="decisionQuestionAnswer decisionQuestionAnswer-pace"
                onClick={() => {
                  const proposal = proposals.find((item) => item.id === "pace");
                  if (proposal) onChoose(proposal);
                }}
                type="button"
              >
                <span>No — protect Priya&apos;s pace</span>
                <strong>Priya gets a later start. Ravi trades the summit for teamLab.</strong>
                <small>The map changes immediately, so the cost of this answer stays visible.</small>
              </button>
            </div>
            <button className="decisionReplayTextButton" onClick={onShowOptions} type="button">
              Show all three deals instead
            </button>
          </div>
        ) : null}

        {step === "choice" ? (
          <div className="decisionReplayScene" key="choice">
            <p className="decisionReplayEyebrow">One morning cannot satisfy both Ravi and Priya.</p>
            <h2 id="decision-replay-title">What should the group protect?</h2>
            <p className="decisionReplayLead">Choose the principle. Tessera exposes the human cost instead of hiding it behind a generic itinerary.</p>
            <div className="decisionReplayChoices">
              {proposals.map((proposal) => (
                <button
                  aria-pressed={proposal.id === activeProposalId}
                  className={proposal.id === activeProposalId ? "decisionReplayChoice decisionReplayChoice-active" : "decisionReplayChoice"}
                  key={proposal.id}
                  onClick={() => onChoose(proposal)}
                  type="button"
                >
                  <span>{proposal.label}</span>
                  <strong>{proposal.summary}</strong>
                  <small>{proposal.tradeoff}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === "ripple" ? (
          <div className="decisionReplayScene" key="ripple">
            <p className="decisionReplayEyebrow">The city has already changed behind this card.</p>
            <h2 id="decision-replay-title">{activeCopy.title}</h2>
            {receipt ? (
              <dl className="decisionReceipt" aria-label="Decision receipt">
                <div>
                  <dt>Protected</dt>
                  <dd>{receipt.protected}</dd>
                </div>
                <div>
                  <dt>Route shift</dt>
                  <dd>{receipt.changed}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{receipt.budget}</dd>
                </div>
              </dl>
            ) : null}
            <div className="decisionReplayRipple">
              <span>Visible consequence</span>
              <p>{activeCopy.consequence}</p>
            </div>
            <p className="decisionReplayLead">The route, timeline, and budget now reflect this choice. Nothing is silently optimized away.</p>
            <button className="decisionReplayPrimary" onClick={onNext} type="button">
              Turn it into a pact
            </button>
          </div>
        ) : null}

        {step === "pact" ? (
          <div className="decisionReplayScene" key="pact">
            <p className="decisionReplayEyebrow">A plan is not an agreement until people can challenge it.</p>
            <h2 id="decision-replay-title">This trip comes with receipts.</h2>
            <ul className="decisionReplayPact">
              <li>Every traveler keeps a named must-do.</li>
              <li>Every concession is written in plain language.</li>
              <li>Any person can veto one promise and see the ripple before committing.</li>
            </ul>
            <div className="decisionReplayActions">
              <button className="decisionReplayPrimary" onClick={onFinish} type="button">
                Open the trip pact
              </button>
              <button className="decisionReplaySecondary" onClick={onChallenge} type="button">
                Challenge one promise
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
