"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { getActiveVetoPreview, getSelectedDay, type VetoPreview } from "../lib/studio";
import type { Activity, TransportLeg, Trip } from "../lib/types";

const MapLibreItineraryMap = dynamic(
  () => import("./maplibre-itinerary-map").then((module) => module.MapLibreItineraryMap),
  { ssr: false },
);

type LatLng = { lat: number; lng: number };
type RouteTravelMode = "DRIVING" | "TRANSIT" | "WALKING";
type MapState =
  | "loading"
  | "ready"
  | "missing-key"
  | "location-error"
  | "partial-route"
  | "error";

type GoogleMap = {
  fitBounds: (bounds: GoogleBounds) => void;
  setCenter: (location: LatLng) => void;
  setZoom: (zoom: number) => void;
};

type GoogleBounds = {
  extend: (location: LatLng) => void;
};

type GoogleMarker = {
  setMap: (map: GoogleMap | null) => void;
};

type GooglePolyline = {
  setMap: (map: GoogleMap | null) => void;
};

type GoogleRoute = {
  path?: LatLng[];
};

type GoogleMapsNamespace = {
  Geocoder?: new () => {
    geocode: (request: { address: string }) => Promise<{
      results?: Array<{
        geometry?: { location?: { lat: () => number; lng: () => number } };
      }>;
    }>;
  };
  LatLngBounds?: new () => GoogleBounds;
  Map?: new (
    element: HTMLElement,
    options: {
      center: LatLng;
      disableDefaultUI?: boolean;
      fullscreenControl?: boolean;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      zoom: number;
    },
  ) => GoogleMap;
  Marker?: new (options: {
    label: string;
    map: GoogleMap;
    position: LatLng;
    title: string;
  }) => GoogleMarker;
  Polyline?: new (options: {
    map: GoogleMap;
    path: LatLng[];
    strokeColor: string;
    strokeOpacity: number;
    strokeWeight: number;
  }) => GooglePolyline;
  importLibrary?: (library: string) => Promise<unknown>;
};

type GoogleRoutesLibrary = {
  Route: {
    computeRoutes: (request: {
      destination: LatLng;
      fields: string[];
      origin: LatLng;
      travelMode: RouteTravelMode;
    }) => Promise<{ routes?: GoogleRoute[] }>;
  };
};

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsNamespace;
    };
  }
}

export type MapActivity = Pick<Activity, "id" | "lat" | "lng" | "title">;

export type MapRouteSegment = {
  destination: MapActivity;
  origin: MapActivity;
  travelMode: RouteTravelMode;
};

const geocodeCache = new Map<string, Promise<LatLng | null>>();
const routeCache = new Map<string, Promise<GoogleRoute | null>>();
let mapsScriptPromise: Promise<void> | null = null;

/** Builds the browser-only Maps JavaScript API address without exposing a key in source. */
export function getMapScriptUrl(browserKey: string): string | null {
  if (!browserKey.trim()) {
    return null;
  }

  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(browserKey)}&v=weekly`;
}

/** Gives the setup state a generic explanation without tying it to a fixture destination. */
export function getMapFallbackMessage(
  state: "missing-key" | "location-error" | "partial-route" | "error",
): string {
  if (state === "missing-key") {
    return "Add NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY to display this trip map.";
  }

  if (state === "location-error") {
    return "No mappable locations could be resolved for this trip.";
  }

  if (state === "partial-route") {
    return "One or more route segments could not be rendered. Available trip locations remain visible.";
  }

  return "The trip map could not be loaded. Check the browser key and Maps API configuration.";
}

/** Returns the narrow browser API route mode required for each itinerary transport leg. */
export function getRouteTravelMode(
  mode?: TransportLeg["mode"],
): RouteTravelMode | null {
  switch (mode) {
    case "flight":
      return null;
    case "taxi":
      return "DRIVING";
    case "bus":
    case "ferry":
    case "metro":
    case "train":
      return "TRANSIT";
    case "walk":
    default:
      return "WALKING";
  }
}

/** Pairs adjacent activities with their declared leg, using a safe walk when a leg is absent. */
export function getMapRouteSegments(
  activities: MapActivity[],
  transportLegs: TransportLeg[],
): MapRouteSegment[] {
  return activities.slice(1).flatMap((destination, index) => {
    const origin = activities[index];
    const travelMode = getRouteTravelMode(transportLegs[index]?.mode);

    return origin && travelMode ? [{ destination, origin, travelMode }] : [];
  });
}

/** Adds the actual destination to a title only when browser geocoding is needed. */
export function getActivityMapQuery(activity: Pick<Activity, "title">, destination: string): string {
  return `${activity.title}, ${destination}`;
}

/** Derives one day of real map inputs and scopes preview copy to the matching Veto source. */
export function getSelectedMapDay(
  trip: Trip,
  selectedDay: number,
  selectedActivityId: string | null,
  vetoPreview?: VetoPreview,
): { activities: MapActivity[]; destination: string; transportLegs: TransportLeg[] } {
  const day = getSelectedDay(trip, selectedDay);
  const activeVetoPreview = getActiveVetoPreview(vetoPreview, selectedDay, selectedActivityId);
  const replacement = activeVetoPreview
    ? day?.activities.find(
        (activity) =>
          activity.id !== activeVetoPreview.activityId && activity.title === activeVetoPreview.replacement,
      )
    : undefined;
  const replacementCoordinates =
    replacement && hasFiniteCoordinates(replacement)
      ? { lat: replacement.lat, lng: replacement.lng }
      : undefined;

  return {
    activities:
      day?.activities.map((activity) =>
        activeVetoPreview && activity.id === activeVetoPreview.activityId
          ? {
              ...activity,
              lat: replacementCoordinates?.lat,
              lng: replacementCoordinates?.lng,
              title: activeVetoPreview.replacement,
            }
          : activity,
      ) ?? [],
    destination: trip.constraints.destination,
    transportLegs: day?.transportLegs ?? [],
  };
}

function hasFiniteCoordinates(activity: MapActivity): activity is MapActivity & LatLng {
  return Number.isFinite(activity.lat) && Number.isFinite(activity.lng);
}

export function getMapResultState(
  destinationLocation: LatLng | null,
  activityLocations: Array<LatLng | null>,
  routeIncomplete: boolean,
): "location-error" | "partial-route" | "ready" {
  if (!destinationLocation && !activityLocations.some((location) => location)) {
    return "location-error";
  }

  return routeIncomplete ? "partial-route" : "ready";
}

export function clearMapCanvas(container: Pick<HTMLElement, "replaceChildren">): void {
  container.replaceChildren();
}

function geocodeLocation(maps: GoogleMapsNamespace, address: string): Promise<LatLng | null> {
  const key = address.trim().toLocaleLowerCase();
  const cached = geocodeCache.get(key);

  if (cached) {
    return cached;
  }

  if (!maps.Geocoder || !key) {
    return Promise.resolve(null);
  }

  const request = new maps.Geocoder()
    .geocode({ address })
    .then(({ results }) => {
      const location = results?.[0]?.geometry?.location;
      return location ? { lat: location.lat(), lng: location.lng() } : null;
    })
    .catch(() => null);

  geocodeCache.set(key, request);
  return request;
}

export function resolveActivityLocation(
  maps: GoogleMapsNamespace,
  activity: MapActivity,
  destination: string,
): Promise<LatLng | null> {
  return hasFiniteCoordinates(activity)
    ? Promise.resolve({ lat: activity.lat, lng: activity.lng })
    : geocodeLocation(maps, getActivityMapQuery(activity, destination));
}

export function computeRoute(
  Route: GoogleRoutesLibrary["Route"],
  segment: MapRouteSegment,
  origin: LatLng,
  destination: LatLng,
): Promise<GoogleRoute | null> {
  const key = [
    segment.travelMode,
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
  ].join(":");
  const cached = routeCache.get(key);

  if (cached) {
    return cached;
  }

  const request = Route.computeRoutes({
    destination,
    fields: ["path"],
    origin,
    travelMode: segment.travelMode,
  })
    .then(({ routes }) => routes?.[0] ?? null)
    .catch(() => null);

  routeCache.set(key, request);
  return request;
}

export async function drawMapRoutes(
  Route: GoogleRoutesLibrary["Route"],
  segments: MapRouteSegment[],
  locations: Map<MapActivity, LatLng>,
  map: GoogleMap,
  Polyline: NonNullable<GoogleMapsNamespace["Polyline"]>,
  isCancelled: () => boolean,
  polylines: GooglePolyline[],
): Promise<"cancelled" | "partial-route" | "ready"> {
  let routeIncomplete = false;

  for (const segment of segments) {
    if (isCancelled()) {
      return "cancelled";
    }

    const origin = locations.get(segment.origin);
    const destination = locations.get(segment.destination);

    if (!origin || !destination) {
      routeIncomplete = true;
      continue;
    }

    const route = await computeRoute(Route, segment, origin, destination);

    if (isCancelled()) {
      return "cancelled";
    }

    if (!route?.path?.length) {
      routeIncomplete = true;
      continue;
    }

    polylines.push(
      new Polyline({
        map,
        path: route.path,
        strokeColor: "#f25222",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      }),
    );
  }

  return routeIncomplete ? "partial-route" : "ready";
}

export function loadGoogleMaps(url: string): Promise<void> {
  if (window.google?.maps?.Map) {
    return Promise.resolve();
  }

  if (mapsScriptPromise) {
    return mapsScriptPromise;
  }

  document
    .querySelector<HTMLScriptElement>('script[data-tessera-google-maps="true"]')
    ?.remove();

  const script = document.createElement("script");
  script.src = url;
  script.async = true;
  script.dataset.tesseraGoogleMaps = "true";

  let resolveScript: () => void;
  let rejectScript: (reason: Error) => void;
  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    resolveScript = resolve;
    rejectScript = reject;
  });
  script.addEventListener("load", () => resolveScript(), { once: true });
  script.addEventListener(
    "error",
    () => {
      script.remove();
      mapsScriptPromise = null;
      rejectScript(new Error("Google Maps could not be loaded."));
    },
    { once: true },
  );
  document.head.append(script);

  return mapsScriptPromise;
}

interface TripMapProps {
  selectedActivityId: string | null;
  selectedDay: number;
  trip: Trip;
  vetoPreview?: VetoPreview;
}

export function TripMap({ selectedActivityId, selectedDay, trip, vetoPreview }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptUrl = getMapScriptUrl(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "");
  const mapDay = useMemo(
    () => getSelectedMapDay(trip, selectedDay, selectedActivityId, vetoPreview),
    [selectedActivityId, selectedDay, trip, vetoPreview],
  );
  const [mapState, setMapState] = useState<MapState>(() =>
    scriptUrl ? "loading" : "missing-key",
  );
  const showGeneratedTerrain =
    mapState === "missing-key" ||
    mapState === "location-error" ||
    mapState === "partial-route" ||
    mapState === "error";

  useEffect(() => {
    if (!scriptUrl) {
      return;
    }

    const mapScriptUrl = scriptUrl;
    let cancelled = false;
    const markers: GoogleMarker[] = [];
    const polylines: GooglePolyline[] = [];

    async function initialiseMap() {
      try {
        setMapState("loading");
        await loadGoogleMaps(mapScriptUrl);

        if (cancelled) {
          return;
        }

        const google = window.google;

        if (
          !google?.maps?.Map ||
          !google.maps.LatLngBounds ||
          !google.maps.Marker ||
          !google.maps.Polyline ||
          !google.maps.importLibrary ||
          !containerRef.current
        ) {
          throw new Error("The Google Maps browser library is unavailable.");
        }

        const maps = google.maps;
        const Bounds = maps.LatLngBounds!;
        const Marker = maps.Marker!;
        const Polyline = maps.Polyline!;
        const importLibrary = maps.importLibrary!;
        const [destinationLocation, activityLocations] = await Promise.all([
          geocodeLocation(maps, mapDay.destination),
          Promise.all(
            mapDay.activities.map((activity) => resolveActivityLocation(maps, activity, mapDay.destination)),
          ),
        ]);

        const container = containerRef.current;

        if (cancelled || !container) {
          return;
        }

        const resolvedState = getMapResultState(destinationLocation, activityLocations, false);

        if (resolvedState === "location-error") {
          clearMapCanvas(container);
          setMapState(resolvedState);
          return;
        }

        clearMapCanvas(container);
        const map = new google.maps.Map(container, {
          center: { lat: 0, lng: 0 },
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoom: 2,
        });

        const bounds = new Bounds();
        const locations = new Map<MapActivity, LatLng>();

        if (destinationLocation) {
          bounds.extend(destinationLocation);
        }

        activityLocations.forEach((location, index) => {
          const activity = mapDay.activities[index];

          if (!activity || !location) {
            return;
          }

          locations.set(activity, location);
          bounds.extend(location);
          markers.push(
            new Marker({
              label: String(index + 1),
              map,
              position: location,
              title: activity.title,
            }),
          );
        });

        if (locations.size > 1 || (locations.size === 1 && destinationLocation)) {
          map.fitBounds(bounds);
        } else if (locations.size === 1) {
          map.setCenter([...locations.values()][0]!);
          map.setZoom(13);
        } else if (destinationLocation) {
          map.setCenter(destinationLocation);
          map.setZoom(11);
        }

        const routeSegments = getMapRouteSegments(mapDay.activities, mapDay.transportLegs);

        if (!routeSegments.length) {
          setMapState(resolvedState);
          return;
        }

        try {
          const { Route } = (await importLibrary("routes")) as GoogleRoutesLibrary;

          if (cancelled) {
            return;
          }

          if (!Route?.computeRoutes) {
            setMapState("partial-route");
            return;
          }

          const routeState = await drawMapRoutes(
            Route,
            routeSegments,
            locations,
            map,
            Polyline,
            () => cancelled,
            polylines,
          );

          if (cancelled || routeState === "cancelled") {
            return;
          }

          setMapState(
            getMapResultState(
              destinationLocation,
              activityLocations,
              routeState === "partial-route",
            ),
          );
        } catch {
          if (!cancelled) {
            setMapState("partial-route");
          }
        }
      } catch {
        if (!cancelled) {
          setMapState("error");
        }
      }
    }

    void initialiseMap();

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.setMap(null));
      polylines.forEach((polyline) => polyline.setMap(null));
    };
  }, [mapDay, scriptUrl]);

  return (
    <div className="mapScene mapSurface" aria-label={`Day ${selectedDay} Trip map`}>
      <div ref={containerRef} className={`mapCanvas${showGeneratedTerrain ? " mapCanvas-hidden" : ""}`} />
      {showGeneratedTerrain ? (
        <MapLibreItineraryMap
          activities={mapDay.activities}
          destination={mapDay.destination}
          selectedActivityId={selectedActivityId}
          selectedDay={selectedDay}
        />
      ) : null}
      {mapState !== "missing-key" && showGeneratedTerrain ? (
        <p className="mapNotice">{getMapFallbackMessage(mapState)}</p>
      ) : null}
      {mapState === "loading" ? <p className="mapLoading">Loading trip map…</p> : null}
    </div>
  );
}
