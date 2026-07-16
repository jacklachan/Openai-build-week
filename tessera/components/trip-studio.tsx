"use client";

import { useState, type CSSProperties } from "react";

import { AtlasMotion } from "./atlas-motion";
import { GroupAgreement } from "./group-agreement";
import { ItineraryTray } from "./itinerary-tray";
import { createPlanDraft, PlanForm, type PlanRequestPayload } from "./plan-form";
import { ReplanAudit } from "./replan-audit";
import { TradeoffPanel } from "./tradeoff-panel";
import { TripMap } from "./trip-map";
import { TravelerChips } from "./traveler-chips";
import {
  getActiveVetoPreview,
  getAgreementEntries,
  getDemoVetoPreview,
  getSelectedDay,
  getVetoPreview,
  type VetoPreview,
} from "../lib/studio";
import type { Trip } from "../lib/types";
import { diffTrips, type PlanDiff } from "../lib/replan";

export { getActiveVetoPreview } from "../lib/studio";

export type PlanSource = "demo" | "live" | "cache";
type StudioPhase = "landing" | "generating" | "ready" | "error";

type PlanResponse = {
  error?: string;
  source?: PlanSource;
  trip?: Trip;
};

type EditResponse = PlanResponse & {
  diff?: PlanDiff;
};

export type JudgeDemoStep = "load" | "preview" | "apply" | "complete";

/** Keeps the no-key judge path explicit and deterministic for a live demo. */
export function getJudgeDemoStep(
  hasTrip: boolean,
  hasPreview: boolean,
  hasAppliedVeto: boolean,
): JudgeDemoStep {
  if (!hasTrip) return "load";
  if (hasAppliedVeto) return "complete";
  return hasPreview ? "apply" : "preview";
}

/** A trip loaded from the fixture must never spend credits when its veto is applied. */
export function usesDeterministicDemoReplan(source: PlanSource | null) {
  return source === "demo";
}

/** Judge Mode is reserved for the fixture source, not a live or cached plan. */
export function isJudgeModeSource(source: PlanSource | null) {
  return source === "demo";
}

function getJudgeStepLabel(step: JudgeDemoStep) {
  return {
    apply: "Apply the veto",
    complete: "Restart the Tokyo demo",
    load: "Load the Tokyo demo",
    preview: "Preview the conflict",
  }[step];
}

function hasPlanningWorkspace(trip: Trip | null): trip is Trip {
  return (
    trip !== null &&
    Array.isArray(trip.days) &&
    trip.days.length > 0 &&
    trip.days.every((day) => Array.isArray(day.activities))
  );
}

/** Allows every valid ready plan to render its workspace without inspecting its source. */
export function canRenderTripWorkspace(phase: StudioPhase, trip: Trip | null): trip is Trip {
  return phase === "ready" && hasPlanningWorkspace(trip);
}

function formatPlanError(message: string) {
  return message.replace(/[.]+$/, "");
}

export function getPlanSelection(trip?: Trip) {
  const firstDay = Array.isArray(trip?.days) ? trip.days[0] : undefined;

  return {
    activityId: Array.isArray(firstDay?.activities) ? firstDay.activities[0]?.id ?? null : null,
    day: firstDay?.day ?? 1,
  };
}

export function createPlanRequestBody(request: PlanRequestPayload) {
  return JSON.stringify({ travelers: request.travelers, constraints: request.constraints });
}

export function getVetoPreviewSelection(preview: VetoPreview) {
  return { selectedActivityId: preview.activityId, selectedDay: preview.day };
}

export function GenerationTimeline({ days }: { days: number }) {
  return (
    <ol className="generationTimeline" aria-label="Generating itinerary days">
      {Array.from({ length: days }, (_, index) => (
        <li
          className="generationTimelineRow"
          key={`generation-day-${index + 1}`}
          style={{ "--timeline-index": index } as CSSProperties}
        >
          {`D${String(index + 1).padStart(2, "0")}`}
        </li>
      ))}
    </ol>
  );
}

export function getVetoPreviewForTrip(trip: Trip) {
  return getVetoPreview(trip);
}

export function TripStudio() {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [planDraft, setPlanDraft] = useState(createPlanDraft);
  const [pendingPlan, setPendingPlan] = useState<PlanRequestPayload | null>(null);
  const [phase, setPhase] = useState<StudioPhase>("landing");
  const [source, setSource] = useState<PlanSource | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<VetoPreview | null>(null);
  const [replanAudit, setReplanAudit] = useState<PlanDiff | null>(null);
  const [isApplyingVeto, setIsApplyingVeto] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canShowWorkspace = canRenderTripWorkspace(phase, activeTrip);
  const vetoPreview =
    hasPlanningWorkspace(activeTrip) && !replanAudit
      ? source === "demo"
        ? getDemoVetoPreview(activeTrip)
        : getVetoPreviewForTrip(activeTrip)
      : undefined;
  const visibleVetoPreview = getActiveVetoPreview(activePreview, selectedDay, selectedActivityId);
  const showsJudgeMode = isJudgeModeSource(source);
  const judgeStep = getJudgeDemoStep(Boolean(activeTrip), Boolean(visibleVetoPreview), Boolean(replanAudit));

  async function requestPlan(request: PlanRequestPayload) {
    setPendingPlan(request);
    setPhase("generating");
    setErrorMessage("");

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: createPlanRequestBody(request),
      });
      const payload = (await response.json()) as PlanResponse;

      if (
        !response.ok ||
        !payload.trip ||
        (payload.source !== "demo" && payload.source !== "live" && payload.source !== "cache")
      ) {
        throw new Error(payload.error ?? "Unable to generate a plan");
      }

      const selection = getPlanSelection(payload.trip);

      setActiveTrip(payload.trip);
      setSelectedDay(selection.day);
      setSelectedActivityId(selection.activityId);
      setActivePreview(null);
      setReplanAudit(null);
      setSource(payload.source);
      setPhase("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate a plan");
      setPhase("error");
    }
  }

  function selectDay(day: number) {
    setActivePreview(null);
    setSelectedDay(day);
    setSelectedActivityId(activeTrip ? getSelectedDay(activeTrip, day)?.activities[0]?.id ?? null : null);
  }

  async function loadDemo() {
    setPendingPlan(null);
    setPhase("generating");
    setErrorMessage("");

    try {
      const response = await fetch("/api/demo");
      const payload = (await response.json()) as PlanResponse;
      if (!response.ok || !payload.trip || payload.source !== "demo") {
        throw new Error(payload.error ?? "Unable to load the demo plan");
      }

      const selection = getPlanSelection(payload.trip);
      setActiveTrip(payload.trip);
      setSelectedDay(selection.day);
      setSelectedActivityId(selection.activityId);
      setActivePreview(null);
      setReplanAudit(null);
      setSource(payload.source);
      setPhase("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load the demo plan");
      setPhase("error");
    }
  }

  function selectActivity(activityId: string) {
    setActivePreview(null);
    setSelectedActivityId(activityId);
  }

  function toggleVetoPreview() {
    if (!vetoPreview) return;
    if (visibleVetoPreview) {
      setActivePreview(null);
      return;
    }

    const selection = getVetoPreviewSelection(vetoPreview);
    setSelectedDay(selection.selectedDay);
    setSelectedActivityId(selection.selectedActivityId);
    setActivePreview(vetoPreview);
  }

  async function applyVeto() {
    if (!activeTrip || !vetoPreview) return;

    setIsApplyingVeto(true);
    setErrorMessage("");
    try {
      if (usesDeterministicDemoReplan(source)) {
        const response = await fetch("/api/demo?version=2");
        const payload = (await response.json()) as PlanResponse;
        if (!response.ok || !payload.trip || payload.source !== "demo") {
          throw new Error(payload.error ?? "Unable to apply the demo veto");
        }

        const selection = getPlanSelection(payload.trip);
        setActiveTrip(payload.trip);
        setSelectedDay(selection.day);
        setSelectedActivityId(selection.activityId);
        setActivePreview(null);
        setReplanAudit(diffTrips(activeTrip, payload.trip));
        setSource("demo");
        return;
      }

      const command = `${activeTrip.travelers[0]?.name ?? "A traveler"} vetoes ${vetoPreview.removedActivity}. Replace it with ${vetoPreview.replacement} at ${vetoPreview.afterTime}.`;
      const response = await fetch("/api/edit", {
        body: JSON.stringify({ command, trip: activeTrip }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as EditResponse;
      if (!response.ok || !payload.trip || (payload.source !== "demo" && payload.source !== "live")) {
        throw new Error(payload.error ?? "Unable to apply the veto");
      }

      const selection = getPlanSelection(payload.trip);
      setActiveTrip(payload.trip);
      setSelectedDay(selection.day);
      setSelectedActivityId(selection.activityId);
      setActivePreview(null);
      setReplanAudit(payload.diff ?? null);
      setSource(payload.source);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to apply the veto");
    } finally {
      setIsApplyingVeto(false);
    }
  }

  function advanceJudgeDemo() {
    if (judgeStep === "load" || judgeStep === "complete") {
      void loadDemo();
      return;
    }
    if (judgeStep === "preview") {
      toggleVetoPreview();
      return;
    }
    void applyVeto();
  }

  if (phase !== "ready") {
    const isGenerating = phase === "generating";

    return (
      <main className={`studioShell studioShell-${phase}`}>
        <section className="landingHero" aria-labelledby="landing-title">
          <p className="landingKicker">TESSERA // GROUP TRIP NEGOTIATOR</p>
          <h1 id="landing-title">Build one trip everyone can live with.</h1>
          <p className="landingSubhead">
            Everyone wants something different. Get a plan that says who gave up what.
          </p>
          {isGenerating && pendingPlan ? (
            <TravelerChips phase="generating" travelers={pendingPlan.travelers} />
          ) : null}
          {isGenerating && pendingPlan ? <GenerationTimeline days={pendingPlan.constraints.days} /> : null}
          {phase === "error" ? (
            <p className="planError" role="alert">
              PLAN FAILED // {formatPlanError(errorMessage)}. RETRY.
            </p>
          ) : null}
          <PlanForm
            disabled={isGenerating}
            draft={planDraft}
            onDraftChange={setPlanDraft}
            onSubmit={(request) => void requestPlan(request)}
            submitLabel={isGenerating ? "Generating plan" : phase === "error" ? "Retry" : "Generate plan"}
          />
          <button className="demoButton" disabled={isGenerating} onClick={() => void loadDemo()} type="button">
            {getJudgeStepLabel("load")}
          </button>
          <p className="judgeModeIntro">JUDGE MODE // A deterministic, no-key walkthrough: load → veto → audit.</p>
        </section>
      </main>
    );
  }

  if (!activeTrip) return null;

  return (
    <main className="studioShell studioShell-ready">
      <header className="generatedHeader">
        <p>{`PLAN GENERATED // ${source?.toUpperCase() ?? "LIVE"}`}</p>
        <span>{activeTrip.constraints.destination}</span>
        <TravelerChips phase="ready" travelers={activeTrip.travelers} trip={activeTrip} />
      </header>

      {showsJudgeMode ? (
      <section className="judgeGuide" aria-labelledby="judge-guide-title">
        <div>
          <p>JUDGE MODE // NO KEY REQUIRED</p>
          <h2 id="judge-guide-title">Test one disagreement from start to finish.</h2>
        </div>
        <ol aria-label="Judge demo steps">
          <li aria-current={judgeStep === "load" ? "step" : undefined} className={judgeStep === "load" ? "judgeStep-active" : "judgeStep-complete"}>01 // Load</li>
          <li aria-current={judgeStep === "preview" ? "step" : undefined} className={judgeStep === "preview" ? "judgeStep-active" : judgeStep === "load" ? "" : "judgeStep-complete"}>02 // Veto</li>
          <li aria-current={judgeStep === "apply" ? "step" : undefined} className={judgeStep === "apply" ? "judgeStep-active" : judgeStep === "complete" ? "judgeStep-complete" : ""}>03 // Audit</li>
        </ol>
        <button className="judgeAction" disabled={isApplyingVeto} onClick={advanceJudgeDemo} type="button">
          {isApplyingVeto ? "Applying veto" : getJudgeStepLabel(judgeStep)}
        </button>
      </section>
      ) : null}

      <TradeoffPanel
        agreement={getAgreementEntries(activeTrip)}
        tradeoffs={activeTrip.tradeoffs}
        trip={activeTrip}
      />
      {replanAudit ? <ReplanAudit currency={activeTrip.constraints.currency} diff={replanAudit} /> : null}
      {errorMessage ? (
        <p className="replanError" role="alert">
          {formatPlanError(errorMessage)}. Try the demo again.
        </p>
      ) : null}

      <section className="planningWorkspace" aria-label="Generated planning workspace">
        {canShowWorkspace ? (
          <div className="studioWorkspace">
            <section className="mapWorkspace" aria-label="Trip itinerary map">
              <TripMap
                selectedActivityId={selectedActivityId}
                selectedDay={selectedDay}
                trip={activeTrip}
                vetoPreview={visibleVetoPreview}
              />
              <AtlasMotion />
              <ItineraryTray
                selectedActivityId={selectedActivityId}
                selectedDay={selectedDay}
                trip={activeTrip}
                vetoPreview={visibleVetoPreview}
                onSelectActivity={selectActivity}
                onSelectDay={selectDay}
              />
            </section>

            <GroupAgreement
              agreement={getAgreementEntries(activeTrip)}
              preview={vetoPreview}
              showPreview={Boolean(visibleVetoPreview)}
              trip={activeTrip}
              isApplyingVeto={isApplyingVeto}
              onApplyVeto={visibleVetoPreview ? () => void applyVeto() : undefined}
              onTogglePreview={vetoPreview ? toggleVetoPreview : undefined}
            />
          </div>
        ) : (
          <p className="planState" role="status">
            ITINERARY DATA IS UNAVAILABLE.
          </p>
        )}
      </section>
    </main>
  );
}
