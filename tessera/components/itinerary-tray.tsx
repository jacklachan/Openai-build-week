import type { Trip } from "../lib/types";

interface ItineraryTrayProps {
  selectedDay: number;
  trip: Trip;
  onSelectDay: (day: number) => void;
}

function activityVisual(category: string) {
  const visuals: Record<string, { glyph: string; tone: string }> = {
    adventure: { glyph: "↗", tone: "amber" },
    anime: { glyph: "✦", tone: "violet" },
    city: { glyph: "▦", tone: "blue" },
    culture: { glyph: "◌", tone: "rose" },
    food: { glyph: "◒", tone: "orange" },
    nature: { glyph: "◒", tone: "green" },
    shopping: { glyph: "◇", tone: "pink" },
  };

  return visuals[category] ?? { glyph: "•", tone: "slate" };
}

export function ItineraryTray({ selectedDay, trip, onSelectDay }: ItineraryTrayProps) {
  return (
    <nav className="itineraryTray" aria-label="Trip itinerary by day">
      {trip.days.map((day) => {
        const feature = day.activities[0];
        const visual = activityVisual(feature?.category ?? "");
        const isSelected = selectedDay === day.day;

        return (
          <button
            className={`itineraryDay${isSelected ? " isSelected" : ""}`}
            key={day.day}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectDay(day.day)}
          >
            <span className="dayLabel">Day {day.day}</span>
            <span className={`activityVisual ${visual.tone}`} aria-hidden="true">{visual.glyph}</span>
            <span className="dayCopy">
              <strong>{feature?.title ?? day.summary}</strong>
              <small>{feature?.startTime ?? "Flexible"} · {feature?.category ?? "shared"}</small>
            </span>
            <span className="dayCount">{day.activities.length}/3</span>
          </button>
        );
      })}
    </nav>
  );
}
