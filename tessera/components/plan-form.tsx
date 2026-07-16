"use client";

import { useState, type FormEvent } from "react";

import type { Interest, TravelerProfile, TripConstraints } from "../lib/types";

export const MIN_DAYS = 1;
export const MAX_DAYS = 14;
export const MIN_TRAVELERS = 1;
export const MAX_TRAVELERS = 8;

const interestOptions: Interest[] = [
  "nature",
  "city",
  "food",
  "adventure",
  "relaxation",
  "culture",
  "nightlife",
  "shopping",
  "anime",
  "beach",
  "history",
];

export interface TravelerDraft {
  id: string;
  name: string;
  budgetContribution: string;
  pace: TravelerProfile["pace"];
  interests: Interest[];
  dietary: string;
  accessibility: string;
  mustDo: string;
  dealbreakers: string;
}

export interface PlanDraft {
  destination: string;
  startDate: string;
  days: string;
  currency: string;
  budgetCeiling: string;
  originCity: string;
  travelers: TravelerDraft[];
}

export interface PlanRequestPayload {
  travelers: TravelerProfile[];
  constraints: TripConstraints;
}

export interface PlanFormProps {
  disabled?: boolean;
  draft: PlanDraft;
  onDraftChange: (draft: PlanDraft) => void;
  onSubmit: (request: PlanRequestPayload) => void;
  submitLabel?: string;
}

function createTravelerDraft(id: string): TravelerDraft {
  return {
    id,
    name: "",
    budgetContribution: "",
    pace: "moderate",
    interests: [],
    dietary: "",
    accessibility: "",
    mustDo: "",
    dealbreakers: "",
  };
}

function nextTravelerId(travelers: TravelerDraft[]) {
  const largestId = travelers.reduce((largest, traveler) => {
    const match = /^traveler-(\d+)$/.exec(traveler.id);
    return match ? Math.max(largest, Number(match[1])) : largest;
  }, 0);

  return `traveler-${largestId + 1}`;
}

function optionalText(value: string) {
  return value.trim() || undefined;
}

function listFromText(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalMoney(value: string, label: string) {
  const text = value.trim();
  if (!text) return undefined;

  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be a finite non-negative amount.`);
  }

  return amount;
}

export function createPlanDraft(): PlanDraft {
  return {
    destination: "",
    startDate: "",
    days: "3",
    currency: "USD",
    budgetCeiling: "",
    originCity: "",
    travelers: [createTravelerDraft("traveler-1")],
  };
}

export function addTravelerDraft(draft: PlanDraft): PlanDraft {
  if (draft.travelers.length >= MAX_TRAVELERS) return draft;

  return {
    ...draft,
    travelers: [...draft.travelers, createTravelerDraft(nextTravelerId(draft.travelers))],
  };
}

export function removeTravelerDraft(draft: PlanDraft, travelerId: string): PlanDraft {
  if (draft.travelers.length <= MIN_TRAVELERS) return draft;

  return {
    ...draft,
    travelers: draft.travelers.filter((traveler) => traveler.id !== travelerId),
  };
}

export function normalizePlanDraft(draft: PlanDraft): PlanRequestPayload {
  const destination = draft.destination.trim();
  if (!destination) throw new Error("Destination is required.");

  const days = Number(draft.days);
  if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
    throw new Error(`Days must be between ${MIN_DAYS} and ${MAX_DAYS}.`);
  }

  if (draft.travelers.length < MIN_TRAVELERS || draft.travelers.length > MAX_TRAVELERS) {
    throw new Error(`Travelers must be between ${MIN_TRAVELERS} and ${MAX_TRAVELERS}.`);
  }

  const currency = draft.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Currency must use a three-letter code.");

  const ids = new Set<string>();
  const travelers = draft.travelers.map((draftTraveler) => {
    const id = draftTraveler.id.trim();
    const name = draftTraveler.name.trim();
    if (!id) throw new Error("Traveler id is required.");
    if (ids.has(id)) throw new Error("Traveler ids must be unique.");
    if (!name) throw new Error("Traveler name is required.");
    ids.add(id);

    const budgetContribution = optionalMoney(
      draftTraveler.budgetContribution,
      `${name}'s contribution`,
    );

    return {
      id,
      name,
      ...(budgetContribution === undefined ? {} : { budgetContribution }),
      pace: draftTraveler.pace,
      interests: draftTraveler.interests,
      dietary: listFromText(draftTraveler.dietary),
      accessibility: listFromText(draftTraveler.accessibility),
      mustDo: listFromText(draftTraveler.mustDo),
      dealbreakers: listFromText(draftTraveler.dealbreakers),
    };
  });

  const startDate = optionalText(draft.startDate);
  const budgetCeiling = optionalMoney(draft.budgetCeiling, "Budget");
  const originCity = optionalText(draft.originCity);

  return {
    travelers,
    constraints: {
      destination,
      days,
      currency,
      ...(startDate === undefined ? {} : { startDate }),
      ...(budgetCeiling === undefined ? {} : { budgetCeiling }),
      ...(originCity === undefined ? {} : { originCity }),
    },
  };
}

export function PlanForm({
  disabled = false,
  draft,
  onDraftChange,
  onSubmit,
  submitLabel = "Generate plan",
}: PlanFormProps) {
  const [errorMessage, setErrorMessage] = useState("");

  function updateDraft<Field extends Exclude<keyof PlanDraft, "travelers">>(
    field: Field,
    value: PlanDraft[Field],
  ) {
    onDraftChange({ ...draft, [field]: value });
  }

  function updateTraveler(
    travelerId: string,
    field: keyof TravelerDraft,
    value: TravelerDraft[keyof TravelerDraft],
  ) {
    onDraftChange({
      ...draft,
      travelers: draft.travelers.map((traveler) =>
        traveler.id === travelerId ? { ...traveler, [field]: value } : traveler,
      ),
    });
  }

  function toggleInterest(travelerId: string, interest: Interest) {
    onDraftChange({
      ...draft,
      travelers: draft.travelers.map((traveler) => {
        if (traveler.id !== travelerId) return traveler;

        return {
          ...traveler,
          interests: traveler.interests.includes(interest)
            ? traveler.interests.filter((selected) => selected !== interest)
            : [...traveler.interests, interest],
        };
      }),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const request = normalizePlanDraft(draft);
      setErrorMessage("");
      onSubmit(request);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Check the trip details and try again.");
    }
  }

  return (
    <form className="planForm" onSubmit={handleSubmit}>
      <label htmlFor="destination">Destination</label>
      <input
        id="destination"
        name="destination"
        required
        value={draft.destination}
        onChange={(event) => updateDraft("destination", event.target.value)}
        disabled={disabled}
      />

      <label htmlFor="days">Days</label>
      <input
        id="days"
        name="days"
        type="number"
        min={MIN_DAYS}
        max={MAX_DAYS}
        required
        value={draft.days}
        onChange={(event) => updateDraft("days", event.target.value)}
        disabled={disabled}
      />

      <label htmlFor="start-date">Start date (optional)</label>
      <input
        id="start-date"
        name="startDate"
        type="date"
        value={draft.startDate}
        onChange={(event) => updateDraft("startDate", event.target.value)}
        disabled={disabled}
      />

      <label htmlFor="currency">Currency</label>
      <input
        id="currency"
        name="currency"
        pattern="[A-Za-z]{3}"
        maxLength={3}
        required
        value={draft.currency}
        onChange={(event) => updateDraft("currency", event.target.value)}
        disabled={disabled}
      />

      <label htmlFor="budget">Budget ceiling (optional)</label>
      <input
        id="budget"
        name="budgetCeiling"
        type="number"
        min="0"
        step="any"
        value={draft.budgetCeiling}
        onChange={(event) => updateDraft("budgetCeiling", event.target.value)}
        disabled={disabled}
      />

      <label htmlFor="origin">Origin city (optional)</label>
      <input
        id="origin"
        name="originCity"
        value={draft.originCity}
        onChange={(event) => updateDraft("originCity", event.target.value)}
        disabled={disabled}
      />

      {draft.travelers.map((traveler, index) => (
        <fieldset key={traveler.id} disabled={disabled}>
          <legend>{`Traveler ${index + 1}`}</legend>

          <label htmlFor={`${traveler.id}-name`}>Name</label>
          <input
            id={`${traveler.id}-name`}
            name={`traveler-${index + 1}-name`}
            required
            value={traveler.name}
            onChange={(event) => updateTraveler(traveler.id, "name", event.target.value)}
          />

          <label htmlFor={`${traveler.id}-pace`}>Pace</label>
          <select
            id={`${traveler.id}-pace`}
            name={`traveler-${index + 1}-pace`}
            value={traveler.pace}
            onChange={(event) =>
              updateTraveler(traveler.id, "pace", event.target.value as TravelerProfile["pace"])
            }
          >
            <option value="slow">Slow</option>
            <option value="moderate">Moderate</option>
            <option value="packed">Packed</option>
          </select>

          <p>Interests</p>
          <div aria-label={`${traveler.name || `Traveler ${index + 1}`} interests`}>
            {interestOptions.map((interest) => {
              const selected = traveler.interests.includes(interest);

              return (
                <button
                  key={interest}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleInterest(traveler.id, interest)}
                >
                  {interest}
                </button>
              );
            })}
          </div>

          <label htmlFor={`${traveler.id}-dietary`}>Dietary (comma-separated)</label>
          <input
            id={`${traveler.id}-dietary`}
            name={`traveler-${index + 1}-dietary`}
            value={traveler.dietary}
            onChange={(event) => updateTraveler(traveler.id, "dietary", event.target.value)}
          />

          <label htmlFor={`${traveler.id}-accessibility`}>Accessibility (comma-separated)</label>
          <input
            id={`${traveler.id}-accessibility`}
            name={`traveler-${index + 1}-accessibility`}
            value={traveler.accessibility}
            onChange={(event) => updateTraveler(traveler.id, "accessibility", event.target.value)}
          />

          <label htmlFor={`${traveler.id}-must-do`}>Must-do (comma-separated)</label>
          <input
            id={`${traveler.id}-must-do`}
            name={`traveler-${index + 1}-must-do`}
            value={traveler.mustDo}
            onChange={(event) => updateTraveler(traveler.id, "mustDo", event.target.value)}
          />

          <label htmlFor={`${traveler.id}-dealbreakers`}>Dealbreakers (comma-separated)</label>
          <input
            id={`${traveler.id}-dealbreakers`}
            name={`traveler-${index + 1}-dealbreakers`}
            value={traveler.dealbreakers}
            onChange={(event) => updateTraveler(traveler.id, "dealbreakers", event.target.value)}
          />

          <label htmlFor={`${traveler.id}-contribution`}>Contribution (optional)</label>
          <input
            id={`${traveler.id}-contribution`}
            name={`traveler-${index + 1}-contribution`}
            type="number"
            min="0"
            step="any"
            value={traveler.budgetContribution}
            onChange={(event) => updateTraveler(traveler.id, "budgetContribution", event.target.value)}
          />

          <button
            type="button"
            onClick={() => onDraftChange(removeTravelerDraft(draft, traveler.id))}
            disabled={draft.travelers.length <= MIN_TRAVELERS}
          >
            Remove traveler
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => onDraftChange(addTravelerDraft(draft))}
        disabled={disabled || draft.travelers.length >= MAX_TRAVELERS}
      >
        Add traveler
      </button>
      {errorMessage ? (
        <p className="planError" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </form>
  );
}
