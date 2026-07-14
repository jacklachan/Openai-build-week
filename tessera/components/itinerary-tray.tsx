import type { CSSProperties } from "react";
import type { VetoPreview } from "../lib/studio";
import type { Trip } from "../lib/types";
import { getActivityTone, getTimelineDays } from "./presentation";

interface ItineraryTrayProps {
  selectedActivityId: string | null;
  selectedDay: number;
  trip: Trip;
  vetoPreview?: VetoPreview;
  onSelectActivity: (activityId: string) => void;
  onSelectDay: (day: number) => void;
}

export function ItineraryTray({
  selectedActivityId,
  selectedDay,
  trip,
  vetoPreview,
  onSelectActivity,
  onSelectDay,
}: ItineraryTrayProps) {
  const timelineDays = Array.isArray(trip.days) ? getTimelineDays(trip) : [];
  const selectedPlan = timelineDays.find(({ day }) => day.day === selectedDay)?.day;
  const activities = Array.isArray(selectedPlan?.activities) ? selectedPlan.activities : [];
  const selectedActivity = activities.find(({ id }) => id === selectedActivityId);

  return (
    <section className="itineraryTray" aria-label="Trip itinerary by day">
      <nav className="timelineDayControls" aria-label="Select itinerary day">
        {timelineDays.map(({ day, label }) => {
          const isSelected = day.day === selectedDay;

          return (
            <button
              className={`timelineDay${isSelected ? " timelineDay-selected" : ""}`}
              key={day.day}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectDay(day.day)}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {activities.length ? (
        <ol className="activityTimeline">
          {activities.map((activity, index) => {
            const displayedActivity =
              vetoPreview && activity.id === "mount-takao"
                ? { ...activity, startTime: vetoPreview.afterTime, title: vetoPreview.replacement }
                : activity;
            const isSelected = activity.id === selectedActivityId;

            return (
              <li
                className="activityTimelineRow"
                key={activity.id}
                style={{ "--timeline-index": index } as CSSProperties}
              >
                {displayedActivity.startTime ? (
                  <time className="timelineHour" dateTime={displayedActivity.startTime}>
                    {displayedActivity.startTime}
                  </time>
                ) : (
                  <span className="timelineHour">UNSCHEDULED</span>
                )}
                <button
                  className={`timelineActivity activityTone-${getActivityTone(activity)}${
                    isSelected ? " timelineActivity-selected" : ""
                  }`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectActivity(activity.id)}
                >
                  {displayedActivity.title}
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="planState">PLAN GENERATED // ITINERARY DETAILS ARE NOT AVAILABLE.</p>
      )}

      {selectedActivity ? (
        <section className="rationalePanel dataFill boneText cornerBrackets" aria-live="polite">
          <p>{selectedActivity.rationale}</p>
        </section>
      ) : null}
    </section>
  );
}
