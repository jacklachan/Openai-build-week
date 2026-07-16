"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";

import type { MapActivity } from "./trip-map";
import { OsmItineraryMap } from "./osm-itinerary-map";

type MapLibreItineraryMapProps = {
  activities: MapActivity[];
  destination: string;
  selectedActivityId: string | null;
  selectedDay: number;
};

type MappedActivity = MapActivity & { lat: number; lng: number };

const DEFAULT_TOKYO: [number, number] = [139.7671, 35.6812];
const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function hasCoordinates(activity: MapActivity): activity is MappedActivity {
  return Number.isFinite(activity.lat) && Number.isFinite(activity.lng);
}

function markerElement(activity: MappedActivity, index: number, selected: boolean, isLast: boolean) {
  const element = document.createElement("div");
  element.className = `map3dStop${selected ? " map3dStop-selected" : ""}${isLast ? " map3dStop-end" : ""}`;
  element.setAttribute("aria-label", `${index + 1}. ${activity.title}`);
  element.innerHTML = `<span>${index + 1}</span><strong>${activity.title}</strong>`;
  return element;
}

function fitMap(map: MapLibreMap, activities: MappedActivity[]) {
  if (!activities.length) {
    map.jumpTo({ center: DEFAULT_TOKYO, zoom: 13.7, pitch: 65, bearing: -24 });
    return;
  }

  const bounds = activities.reduce(
    (current, activity) => current.extend([activity.lng, activity.lat]),
    new maplibregl.LngLatBounds([activities[0]!.lng, activities[0]!.lat], [activities[0]!.lng, activities[0]!.lat]),
  );

  if (activities.length === 1) {
    map.jumpTo({ center: bounds.getCenter(), zoom: 14.8, pitch: 65, bearing: -24 });
    return;
  }

  map.fitBounds(bounds, {
    duration: 0,
    maxZoom: 15.1,
    padding: { top: 96, right: 124, bottom: 156, left: 124 },
  });
  map.setPitch(65);
  map.setBearing(-24);
}

export function MapLibreItineraryMap({
  activities,
  destination,
  selectedActivityId,
  selectedDay,
}: MapLibreItineraryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const mappedActivities = useMemo(() => activities.filter(hasCoordinates), [activities]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || failed) return;

    const map = new maplibregl.Map({
      attributionControl: false,
      bearing: -24,
      canvasContextAttributes: { antialias: true },
      center: DEFAULT_TOKYO,
      container,
      cooperativeGestures: true,
      maxPitch: 70,
      pitch: 65,
      style: OPEN_FREE_MAP_STYLE,
      zoom: 13.7,
    });
    const markers: Marker[] = [];
    let cancelled = false;

    map.on("load", () => {
      if (cancelled) return;
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: '&copy; <a href="https://openfreemap.org/">OpenFreeMap</a> &middot; &copy; OpenStreetMap contributors',
        }),
      );

      if (map.getLayer("building-3d")) {
        if (map.getLayer("building")) map.setLayoutProperty("building", "visibility", "none");
        map.setLayerZoomRange("building-3d", 13, 24);
        map.setPaintProperty("building-3d", "fill-extrusion-color", "#6f86a1");
        map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.72);
      }

      if (mappedActivities.length > 1) {
        map.addSource("tessera-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: mappedActivities.map(({ lng, lat }) => [lng, lat]),
            },
          },
        });
        map.addLayer({
          id: "tessera-route-glow",
          source: "tessera-route",
          type: "line",
          paint: { "line-blur": 5, "line-color": "#5d18ff", "line-opacity": 0.72, "line-width": 9 },
        });
        map.addLayer({
          id: "tessera-route-line",
          source: "tessera-route",
          type: "line",
          paint: { "line-color": "#c4ff00", "line-dasharray": [0.75, 1.15], "line-width": 3.5 },
        });
      }

      mappedActivities.forEach((activity, index) => {
        const marker = new maplibregl.Marker({
          anchor: "bottom",
          element: markerElement(
            activity,
            index,
            activity.id === selectedActivityId,
            index === mappedActivities.length - 1,
          ),
        })
          .setLngLat([activity.lng, activity.lat])
          .addTo(map);
        markers.push(marker);
      });

      fitMap(map, mappedActivities);
    });

    map.on("error", (event) => {
      if (event.error && !cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [failed, mappedActivities, selectedActivityId]);

  if (failed) {
    return (
      <OsmItineraryMap
        activities={activities}
        destination={destination}
        selectedActivityId={selectedActivityId}
        selectedDay={selectedDay}
      />
    );
  }

  return (
    <section className="mapLibreItineraryMap" aria-label={`Interactive 3D map for day ${selectedDay} in ${destination}`}>
      <div ref={containerRef} className="mapLibreCanvas" />
      <div className="map3dHud">
        <span>LIVE 3D CITY MAP</span>
        <strong>{destination}</strong>
        <span>{`DAY ${String(selectedDay).padStart(2, "0")} // ${mappedActivities.length} STOPS`}</span>
      </div>
      <p className="map3dHint">Drag to orbit &middot; scroll to zoom</p>
    </section>
  );
}
