/* eslint-disable @next/next/no-img-element */

import type { MapActivity } from "./trip-map";

type OsmItineraryMapProps = {
  activities: MapActivity[];
  destination: string;
  selectedActivityId: string | null;
  selectedDay: number;
};

type PixelPoint = MapActivity & { x: number; y: number };

const TILE_SIZE = 256;
const DEFAULT_ZOOM = 13;
const MIN_ZOOM = 8;
const MAX_ZOOM = 13;
const TILE_SPAN = 3;
const DEFAULT_TOKYO = { lat: 35.6812, lng: 139.7671 };

function worldPixel(lat: number, lng: number, zoom = DEFAULT_ZOOM) {
  const scale = TILE_SIZE * 2 ** zoom;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sinLatitude = Math.sin((clampedLat * Math.PI) / 180);

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale,
  };
}

function normaliseTileX(tileX: number, zoom: number) {
  const count = 2 ** zoom;
  return ((tileX % count) + count) % count;
}

function validActivity(activity: MapActivity): activity is MapActivity & { lat: number; lng: number } {
  return Number.isFinite(activity.lat) && Number.isFinite(activity.lng);
}

function getViewportZoom(activities: Array<MapActivity & { lat: number; lng: number }>) {
  if (activities.length < 2) return DEFAULT_ZOOM;

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const pixels = activities.map(({ lat, lng }) => worldPixel(lat, lng, zoom));
    const xValues = pixels.map(({ x }) => x);
    const yValues = pixels.map(({ y }) => y);
    const widestSpan = Math.max(Math.max(...xValues) - Math.min(...xValues), Math.max(...yValues) - Math.min(...yValues));

    // Reserve enough room for the stop labels as well as the coordinates themselves.
    if (widestSpan <= TILE_SIZE * TILE_SPAN * 0.42) return zoom;
  }

  return MIN_ZOOM;
}

/** Builds a small, normal-view OSM tile set; it never prefetches maps or zoom levels. */
export function getOsmViewport(activities: MapActivity[]) {
  const mappedActivities = activities.filter(validActivity);
  const zoom = getViewportZoom(mappedActivities);
  const latitudes = mappedActivities.map(({ lat }) => lat);
  const longitudes = mappedActivities.map(({ lng }) => lng);
  const centerLat = mappedActivities.length
    ? (Math.min(...latitudes) + Math.max(...latitudes)) / 2
    : DEFAULT_TOKYO.lat;
  const centerLng = mappedActivities.length
    ? (Math.min(...longitudes) + Math.max(...longitudes)) / 2
    : DEFAULT_TOKYO.lng;
  const centerPixel = worldPixel(centerLat, centerLng, zoom);
  const originTileX = Math.floor(centerPixel.x / TILE_SIZE) - 1;
  const originTileY = Math.floor(centerPixel.y / TILE_SIZE) - 1;
  const originPixelX = originTileX * TILE_SIZE;
  const originPixelY = originTileY * TILE_SIZE;

  const tiles = Array.from({ length: TILE_SPAN * TILE_SPAN }, (_, index) => {
    const x = originTileX + (index % TILE_SPAN);
    const y = originTileY + Math.floor(index / TILE_SPAN);
    return { x: normaliseTileX(x, zoom), y, z: zoom };
  });

  return {
    points: activities.map((activity, index): PixelPoint => {
      if (!validActivity(activity)) {
        return { ...activity, x: 30 + (index % 3) * 20, y: 45 + Math.floor(index / 3) * 15 };
      }
      const pixel = worldPixel(activity.lat, activity.lng, zoom);
      return {
        ...activity,
        x: ((pixel.x - originPixelX) / (TILE_SIZE * TILE_SPAN)) * 100,
        y: ((pixel.y - originPixelY) / (TILE_SIZE * TILE_SPAN)) * 100,
      };
    }),
    tiles,
  };
}

export function OsmItineraryMap({
  activities,
  destination,
  selectedActivityId,
  selectedDay,
}: OsmItineraryMapProps) {
  const { points, tiles } = getOsmViewport(activities);
  const route = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <section className="osmItineraryMap" aria-label={`Real map for day ${selectedDay} in ${destination}`}>
      <div className="osmTileGrid" aria-hidden="true">
        {tiles.map(({ x, y, z }) => (
          <img alt="" decoding="async" key={`${z}-${x}-${y}`} loading="lazy" src={`https://tile.openstreetmap.org/${z}/${x}/${y}.png`} />
        ))}
      </div>
      <svg className="osmRouteLayer" viewBox="0 0 100 100" preserveAspectRatio="none">
        {route ? <polyline className="osmRouteGlow" points={route} /> : null}
        {route ? <polyline className="osmRoute" points={route} /> : null}
      </svg>
      {points.map((point, index) => {
        const selected = point.id === selectedActivityId;
        return (
          <div
            className={`osmStop${selected ? " osmStop-selected" : ""}`}
            key={point.id}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <span>{index + 1}</span>
            <strong style={{ transform: `translateY(${index % 2 === 0 ? "-1.35rem" : "1.35rem"})` }}>
              {point.title}
            </strong>
          </div>
        );
      })}
      <div className="osmMapHud">
        <span>LIVE STREET MAP</span>
        <strong>{destination}</strong>
        <span>{`DAY ${String(selectedDay).padStart(2, "0")} // ${points.length} STOPS`}</span>
      </div>
      <p className="osmAttribution">
        &copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer" target="_blank">OpenStreetMap</a> contributors
      </p>
    </section>
  );
}
