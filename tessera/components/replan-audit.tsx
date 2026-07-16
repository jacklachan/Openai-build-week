import type { PlanDiff } from "../lib/replan";

interface ReplanAuditProps {
  currency: string;
  diff: PlanDiff;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDelta(value: number, currency: string) {
  const amount = new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Math.abs(value));

  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${amount}`;
}

function ActivityList({ activities, emptyLabel }: { activities: PlanDiff["addedActivities"]; emptyLabel: string }) {
  if (!activities.length) return <p className="auditEmpty">{emptyLabel}</p>;

  return (
    <ul className="auditActivityList">
      {activities.map((activity) => (
        <li key={activity.id}>{activity.title}</li>
      ))}
    </ul>
  );
}

/** An API-backed, compact record of exactly what changed after a veto. */
export function ReplanAudit({ currency, diff }: ReplanAuditProps) {
  return (
    <section className="replanAudit" aria-labelledby="replan-audit-title" aria-live="polite">
      <header className="replanAuditHeading">
        <p>VETO APPLIED // AUDIT TRAIL</p>
        <h2 id="replan-audit-title">The plan changed in plain sight.</h2>
        <span>{`VERSION ${diff.previousVersion} → ${diff.nextVersion}`}</span>
      </header>
      <div className="replanAuditGrid">
        <section aria-label="Removed activities">
          <p>REMOVED</p>
          <ActivityList activities={diff.removedActivities} emptyLabel="No activity removed." />
        </section>
        <section aria-label="Added activities">
          <p>ADDED</p>
          <ActivityList activities={diff.addedActivities} emptyLabel="No activity added." />
        </section>
        <section aria-label="Budget impact">
          <p>BUDGET CHANGE</p>
          <strong>{formatDelta(diff.budget.delta, currency)}</strong>
          <span>{`TOTAL ${formatCurrency(diff.budget.before, currency)} → ${formatCurrency(diff.budget.after, currency)}`}</span>
        </section>
        <section aria-label="Tradeoff impact">
          <p>TRADEOFFS</p>
          <strong>{diff.changedTradeoffs ? "UPDATED" : "UNCHANGED"}</strong>
          <span>{diff.changedTradeoffs ? "The group agreement was recalculated." : "The agreement still holds."}</span>
        </section>
      </div>
    </section>
  );
}
