import type { ProposalId, ProposalOption } from "../lib/proposal-arena";

interface ProposalArenaProps {
  activeProposalId: ProposalId;
  onSelect: (proposal: ProposalOption) => void;
  proposals: ProposalOption[];
}

export function ProposalArena({ activeProposalId, onSelect, proposals }: ProposalArenaProps) {
  return (
    <section className="proposalArena" aria-labelledby="proposal-arena-title">
      <header className="proposalArenaHeading">
        <div>
          <p>PROPOSAL ARENA</p>
          <h2 id="proposal-arena-title">Choose the compromise you can defend.</h2>
        </div>
        <p>SIMULATOR ESTIMATES // MAP UPDATES WITH EACH ROUTE</p>
      </header>

      <div className="proposalGrid">
        {proposals.map((proposal) => {
          const selected = proposal.id === activeProposalId;
          return (
            <article className={`proposalCard${selected ? " proposalCard-selected" : ""}`} key={proposal.id}>
              <div className="proposalCardTopline">
                <span>{proposal.label}</span>
                {selected ? <span>ACTIVE</span> : null}
              </div>
              <h3>{proposal.summary}</h3>
              <p>{proposal.tradeoff}</p>
              <dl className="proposalScores">
                <div><dt>FAIR</dt><dd>{proposal.scores.fairness}</dd></div>
                <div><dt>BUDGET</dt><dd>{proposal.scores.budget}</dd></div>
                <div><dt>PACE</dt><dd>{proposal.scores.pace}</dd></div>
              </dl>
              <button onClick={() => onSelect(proposal)} type="button">
                {selected ? "Viewing route" : "View this route"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
