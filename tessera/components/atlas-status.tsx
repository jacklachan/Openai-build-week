import { getAtlasSignals } from "../lib/studio";
import type { Trip } from "../lib/types";

interface AtlasStatusProps {
  trip: Trip;
}

/** A truthful, provider-agnostic status layer for the approved Atlas map direction. */
export function AtlasStatus({ trip }: AtlasStatusProps) {
  const signals = getAtlasSignals(trip);

  return (
    <section className="atlasSignals" aria-label="Trip operating signals">
      <div className="atlasSignalsHeader">
        <div>
          <p>Atlas status</p>
          <strong>Seed plan active</strong>
        </div>
        <span className="statusPulse">Demo-safe</span>
      </div>
      <ul>
        <li>
          <span className="signalGlyph signalGlyph-agreement" aria-hidden="true">+</span>
          <div>
            <strong>{signals.agreementCount} promises captured</strong>
            <small>One for each traveler</small>
          </div>
        </li>
        <li>
          <span className="signalGlyph signalGlyph-budget" aria-hidden="true">%</span>
          <div>
            <strong>{signals.budgetRatio}% budget allocated</strong>
            <small>From the trip contract</small>
          </div>
        </li>
        <li>
          <span className="signalGlyph signalGlyph-map" aria-hidden="true">E</span>
          <div>
            <strong>Earth layer ready</strong>
            <small>Connect a Maps browser key to render it</small>
          </div>
        </li>
      </ul>
      <p className="nextStop"><span>First shared stop</span>{signals.nextStop}</p>
    </section>
  );
}
