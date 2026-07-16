import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import seedTrip from "../data/seed-demo-trip.json";
import * as tripMap from "../components/trip-map";
import { getVetoPreview } from "../lib/studio";
import type { Trip } from "../lib/types";

const trip = seedTrip as Trip;

type DrawMapRoutes = (
  Route: {
    computeRoutes: (request: Record<string, unknown>) => Promise<{
      routes: Array<{ path: Array<{ lat: number; lng: number }> }>;
    }>;
  },
  segments: Array<{
    destination: object;
    origin: object;
    travelMode: "DRIVING" | "TRANSIT" | "WALKING";
  }>,
  locations: Map<object, { lat: number; lng: number }>,
  map: object,
  Polyline: new (options: Record<string, unknown>) => { setMap: (map: object | null) => void },
  isCancelled: () => boolean,
  polylines: Array<{ setMap: (map: object | null) => void }>,
) => Promise<"cancelled" | "partial-route" | "ready">;

test("uses a 2D Maps API and removes the static map route presentation", async () => {
  const [mapSource, studioSource] = await Promise.all([
    readFile(new URL("../components/trip-map.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/trip-studio.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(mapSource, /new google\.maps\.Map/);
  assert.match(mapSource, /Route\.computeRoutes/);
  assert.doesNotMatch(mapSource, /Map3DElement|maps3d|Tokyo|DirectionsService/);
  assert.doesNotMatch(studioSource, /RouteOverlay|Demo itinerary map/);
});

test("derives markers and routes from only the selected day and matching Veto source", () => {
  const getSelectedMapDay = (tripMap as Record<string, unknown>).getSelectedMapDay;
  const preview = getVetoPreview(trip);

  assert.equal(typeof getSelectedMapDay, "function");
  assert.ok(preview);

  const selectMapDay = getSelectedMapDay as (
    value: Trip,
    selectedDay: number,
    selectedActivityId: string | null,
    vetoPreview: NonNullable<ReturnType<typeof getVetoPreview>>,
  ) => { activities: Array<{ id: string; title: string }>; transportLegs: Trip["days"][number]["transportLegs"] };
  const previewDay = trip.days.find((day) => day.day === preview.day)!;
  const selected = selectMapDay(trip, preview.day, preview.activityId, preview);
  const anotherDay = selectMapDay(trip, preview.day + 1, preview.activityId, preview);

  assert.deepEqual(
    selected.activities.map((activity) => activity.id),
    previewDay.activities.map((activity) => activity.id),
  );
  assert.equal(
    selected.activities.find((activity) => activity.id === preview.activityId)?.title,
    preview.replacement,
  );
  assert.equal(
    anotherDay.activities.some((activity) => activity.title === preview.replacement),
    false,
  );
});

test("uses only a complete finite Veto replacement coordinate pair", () => {
  const preview = {
    activityId: "vetoed-stop",
    afterTime: "12:30",
    beforeTime: "09:00",
    day: 1,
    removedActivity: "Removed stop",
    replacement: "Replacement stop",
  };
  const sourceDay = trip.days[0]!;
  const vetoedActivity = {
    ...sourceDay.activities[0]!,
    id: preview.activityId,
    lat: 10,
    lng: 20,
    title: preview.removedActivity,
  };
  const mapTrip = (coordinates: { lat?: number; lng?: number }) =>
    ({
      ...trip,
      days: [
        {
          ...sourceDay,
          activities: [
            vetoedActivity,
            {
              ...sourceDay.activities[1]!,
              id: "replacement-stop",
              title: preview.replacement,
              ...coordinates,
            },
          ],
        },
      ],
    }) as Trip;

  for (const [coordinates, expected] of [
    [{ lat: 0, lng: -73 }, { lat: 0, lng: -73 }],
    [{ lat: 30 }, { lat: undefined, lng: undefined }],
    [{ lng: 40 }, { lat: undefined, lng: undefined }],
    [{ lat: Number.NaN, lng: 40 }, { lat: undefined, lng: undefined }],
    [{ lat: 30, lng: Number.POSITIVE_INFINITY }, { lat: undefined, lng: undefined }],
  ] as const) {
    const displayed = tripMap.getSelectedMapDay(mapTrip(coordinates), 1, preview.activityId, preview)
      .activities[0]!;

    assert.deepEqual({ lat: displayed.lat, lng: displayed.lng }, expected);
  }

  const unmatched = tripMap.getSelectedMapDay(
    mapTrip({ lat: 30, lng: 40 }),
    1,
    preview.activityId,
    { ...preview, replacement: "No matching replacement" },
  ).activities[0]!;

  assert.deepEqual({ lat: unmatched.lat, lng: unmatched.lng }, { lat: undefined, lng: undefined });
});

test("does not substitute duplicate activity IDs or transport legs across selected days", () => {
  const getSelectedMapDay = (tripMap as Record<string, unknown>).getSelectedMapDay;
  const getMapRouteSegments = (tripMap as Record<string, unknown>).getMapRouteSegments;
  const duplicateIdTrip = {
    ...trip,
    days: [
      {
        ...trip.days[0]!,
        activities: [
          { ...trip.days[0]!.activities[0]!, id: "shared-activity", title: "Day one veto" },
          { ...trip.days[0]!.activities[1]!, id: "day-one-option", title: "Day one option" },
        ],
        day: 1,
        transportLegs: [{ fromName: "Day one", mode: "walk" as const, toName: "Day one option" }],
      },
      {
        ...trip.days[1]!,
        activities: [
          { ...trip.days[1]!.activities[0]!, id: "shared-activity", title: "Day two original" },
          { ...trip.days[1]!.activities[1]!, id: "day-two-option", title: "Day two option" },
        ],
        day: 2,
        transportLegs: [{ fromName: "Day two", mode: "taxi" as const, toName: "Day two option" }],
      },
    ],
  };
  const preview = {
    activityId: "shared-activity",
    afterTime: "12:30",
    beforeTime: "09:00",
    day: 1,
    removedActivity: "Day one veto",
    replacement: "Day one option",
  };

  assert.equal(typeof getSelectedMapDay, "function");
  assert.equal(typeof getMapRouteSegments, "function");

  const selectMapDay = getSelectedMapDay as (
    value: Trip,
    selectedDay: number,
    selectedActivityId: string | null,
    vetoPreview: typeof preview,
  ) => { activities: Array<{ id: string; title: string }>; transportLegs: Trip["days"][number]["transportLegs"] };
  const routeSegments = getMapRouteSegments as (
    activities: Array<{ id: string; title: string }>,
    transportLegs: Trip["days"][number]["transportLegs"],
  ) => Array<{ travelMode: "DRIVING" | "TRANSIT" | "WALKING" }>;
  const dayTwo = selectMapDay(duplicateIdTrip, 2, "shared-activity", preview);

  assert.equal(dayTwo.activities[0]?.title, "Day two original");
  assert.deepEqual(routeSegments(dayTwo.activities, dayTwo.transportLegs), [
    { destination: dayTwo.activities[1], origin: dayTwo.activities[0], travelMode: "DRIVING" },
  ]);
});

test("maps transport modes, skips flights, and walks missing segments", () => {
  const getRouteTravelMode = (tripMap as Record<string, unknown>).getRouteTravelMode;
  const getMapRouteSegments = (tripMap as Record<string, unknown>).getMapRouteSegments;

  assert.equal(typeof getRouteTravelMode, "function");
  assert.equal(typeof getMapRouteSegments, "function");

  const routeMode = getRouteTravelMode as (mode?: Trip["days"][number]["transportLegs"][number]["mode"]) =>
    | "DRIVING"
    | "TRANSIT"
    | "WALKING"
    | null;
  const routeSegments = getMapRouteSegments as (
    activities: Trip["days"][number]["activities"],
    transportLegs: Trip["days"][number]["transportLegs"],
  ) => Array<{ travelMode: "DRIVING" | "TRANSIT" | "WALKING" }>;
  const activities = trip.days[0]!.activities.slice(0, 3);
  const legs = [
    { fromName: "A", mode: "walk" as const, toName: "B" },
    { fromName: "B", mode: "flight" as const, toName: "C" },
  ];

  assert.equal(routeMode("walk"), "WALKING");
  assert.equal(routeMode("taxi"), "DRIVING");
  assert.equal(routeMode("train"), "TRANSIT");
  assert.equal(routeMode("metro"), "TRANSIT");
  assert.equal(routeMode("bus"), "TRANSIT");
  assert.equal(routeMode("ferry"), "TRANSIT");
  assert.equal(routeMode("flight"), null);
  assert.equal(routeMode(), "WALKING");
  assert.deepEqual(
    routeSegments(activities, legs).map(({ travelMode }) => ({ travelMode })),
    [{ travelMode: "WALKING" }],
  );
  assert.deepEqual(
    routeSegments(activities.slice(0, 2), []).map(({ travelMode }) => ({ travelMode })),
    [{ travelMode: "WALKING" }],
  );
});

test("retains finite coordinates and dedupes title-plus-destination browser geocoding", async () => {
  const resolveActivityLocation = (tripMap as Record<string, unknown>).resolveActivityLocation;
  const calls: string[] = [];

  assert.equal(typeof resolveActivityLocation, "function");

  const resolve = resolveActivityLocation as (
    maps: {
      Geocoder: new () => {
        geocode: (request: { address: string }) => Promise<{
          results: Array<{
            geometry: { location: { lat: () => number; lng: () => number } };
          }>;
        }>;
      };
    },
    activity: { id: string; lat?: number; lng?: number; title: string },
    destination: string,
  ) => Promise<{ lat: number; lng: number } | null>;
  const maps = {
    Geocoder: class {
      geocode({ address }: { address: string }) {
        calls.push(address);
        return Promise.resolve({
          results: [
            {
              geometry: {
                location: { lat: () => 26.925, lng: () => 75.823 },
              },
            },
          ],
        });
      }
    },
  };

  assert.deepEqual(
    await resolve(maps, { id: "fixed", lat: 18.52, lng: 73.856, title: "Already mapped" }, "Pune, India"),
    { lat: 18.52, lng: 73.856 },
  );
  assert.deepEqual(
    await Promise.all([
      resolve(maps, { id: "geocoded", title: "Hawa Mahal" }, "Jaipur, India"),
      resolve(maps, { id: "geocoded", title: "Hawa Mahal" }, "Jaipur, India"),
    ]),
    [
      { lat: 26.925, lng: 75.823 },
      { lat: 26.925, lng: 75.823 },
    ],
  );
  assert.deepEqual(calls, ["Hawa Mahal, Jaipur, India"]);
});

test("dedupes real Routes-library calls after flight segments are removed", async () => {
  const computeRoute = (tripMap as Record<string, unknown>).computeRoute;
  const getMapRouteSegments = (tripMap as Record<string, unknown>).getMapRouteSegments;
  const calls: Array<Record<string, unknown>> = [];

  assert.equal(typeof computeRoute, "function");
  assert.equal(typeof getMapRouteSegments, "function");

  const cachedComputeRoute = computeRoute as (
    Route: {
      computeRoutes: (request: Record<string, unknown>) => Promise<{
        routes: Array<{ path: Array<{ lat: number; lng: number }> }>;
      }>;
    },
    segment: {
      destination: { id: string; title: string };
      origin: { id: string; title: string };
      travelMode: "DRIVING" | "TRANSIT" | "WALKING";
    },
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ) => Promise<{ path?: Array<{ lat: number; lng: number }> } | null>;
  const routeSegments = getMapRouteSegments as (
    activities: Array<{ id: string; title: string }>,
    transportLegs: Array<{ fromName: string; mode: "flight"; toName: string }>,
  ) => Array<unknown>;
  const Route = {
    computeRoutes: async (request: Record<string, unknown>) => {
      calls.push(request);
      return { routes: [{ path: [{ lat: 19.076, lng: 72.878 }, { lat: 18.52, lng: 73.856 }] }] };
    },
  };
  const segment = {
    destination: { id: "pune", title: "Pune" },
    origin: { id: "mumbai", title: "Mumbai" },
    travelMode: "DRIVING" as const,
  };
  const origin = { lat: 19.076, lng: 72.878 };
  const destination = { lat: 18.52, lng: 73.856 };

  await Promise.all([
    cachedComputeRoute(Route, segment, origin, destination),
    cachedComputeRoute(Route, segment, origin, destination),
  ]);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    destination,
    fields: ["path"],
    origin,
    travelMode: "DRIVING",
  });
  assert.deepEqual(
    routeSegments(
      [segment.origin, segment.destination],
      [{ fromName: "Mumbai", mode: "flight", toName: "Pune" }],
    ),
    [],
  );
});

test("does not attach a stale route polyline after cancellation", async () => {
  const drawMapRoutes = (tripMap as Record<string, unknown>).drawMapRoutes;

  assert.equal(typeof drawMapRoutes, "function");

  const origin = { id: "stale-origin", title: "Stale origin" };
  const destination = { id: "stale-destination", title: "Stale destination" };
  const segment = { destination, origin, travelMode: "WALKING" as const };
  const locations = new Map<object, { lat: number; lng: number }>([
    [origin, { lat: 101, lng: 101 }],
    [destination, { lat: 102, lng: 102 }],
  ]);
  let resolveRoute:
    | ((value: { routes: Array<{ path: Array<{ lat: number; lng: number }> }> }) => void)
    | undefined;
  let routeCalls = 0;
  let polylineCount = 0;
  let cancelled = false;

  class FakePolyline {
    constructor(options: Record<string, unknown>) {
      void options;
      polylineCount += 1;
    }

    setMap(map: object | null) {
      void map;
    }
  }

  const draw = drawMapRoutes as DrawMapRoutes;
  const polylines: Array<{ setMap: (map: object | null) => void }> = [];
  const drawing = draw(
    {
      computeRoutes: () => {
        routeCalls += 1;
        return new Promise((resolve) => {
          resolveRoute = resolve;
        });
      },
    },
    [segment],
    locations,
    {},
    FakePolyline,
    () => cancelled,
    polylines,
  );

  assert.equal(routeCalls, 1);
  cancelled = true;
  resolveRoute!({
    routes: [{ path: [{ lat: 101, lng: 101 }, { lat: 102, lng: 102 }] }],
  });

  assert.equal(await drawing, "cancelled");
  assert.equal(polylineCount, 0);
  assert.deepEqual(polylines, []);
});

test("treats all-null geocoding as a mappable-location error", async () => {
  const getMapResultState = (tripMap as Record<string, unknown>).getMapResultState;
  const geocodeCalls: string[] = [];

  assert.equal(typeof getMapResultState, "function");

  const maps = {
    Geocoder: class {
      geocode({ address }: { address: string }) {
        geocodeCalls.push(address);
        return Promise.resolve({ results: [] });
      }
    },
  };
  const [destinationLocation, activityLocation] = await Promise.all([
    tripMap.resolveActivityLocation(
      maps,
      { id: "empty-destination", title: "Unmapped destination" },
      "",
    ),
    tripMap.resolveActivityLocation(
      maps,
      { id: "empty-activity", title: "Unmapped activity" },
      "Unmapped destination",
    ),
  ]);
  const mapState = getMapResultState as (
    destination: { lat: number; lng: number } | null,
    activities: Array<{ lat: number; lng: number } | null>,
    routeIncomplete: boolean,
  ) => string;

  assert.deepEqual([destinationLocation, activityLocation], [null, null]);
  assert.equal(geocodeCalls.length, 2);
  assert.equal(mapState(destinationLocation, [activityLocation], false), "location-error");
});

test("clears a previous map canvas before showing a location error", () => {
  const clearMapCanvas = (tripMap as Record<string, unknown>).clearMapCanvas;

  assert.equal(typeof clearMapCanvas, "function");

  const canvas = {
    children: ["previous day map"],
    replaceChildren() {
      this.children = [];
    },
  };

  (clearMapCanvas as (value: typeof canvas) => void)(canvas);

  assert.deepEqual(canvas.children, []);
});

test("keeps usable map locations in a partial route state", async () => {
  const drawMapRoutes = (tripMap as Record<string, unknown>).drawMapRoutes;
  const getMapResultState = (tripMap as Record<string, unknown>).getMapResultState;
  const getMapFallbackMessage = (tripMap as Record<string, unknown>).getMapFallbackMessage;

  assert.equal(typeof drawMapRoutes, "function");
  assert.equal(typeof getMapResultState, "function");
  assert.equal(typeof getMapFallbackMessage, "function");

  const origin = { id: "unavailable-origin", title: "Available origin" };
  const destination = { id: "unavailable-destination", title: "Available destination" };
  const locations = new Map<object, { lat: number; lng: number }>([
    [origin, { lat: 201, lng: 201 }],
    [destination, { lat: 202, lng: 202 }],
  ]);
  const draw = drawMapRoutes as DrawMapRoutes;
  const polylines: Array<{ setMap: (map: object | null) => void }> = [];
  const routeState = await draw(
    {
      computeRoutes: async () => {
        throw new Error("Routes library unavailable");
      },
    },
    [{ destination, origin, travelMode: "TRANSIT" }],
    locations,
    {},
    class {
      setMap(map: object | null) {
        void map;
      }
    },
    () => false,
    polylines,
  );
  const mapState = getMapResultState as (
    destination: { lat: number; lng: number } | null,
    activities: Array<{ lat: number; lng: number } | null>,
    routeIncomplete: boolean,
  ) => string;
  const fallbackMessage = getMapFallbackMessage as (state: "partial-route") => string;

  assert.equal(routeState, "partial-route");
  assert.equal(
    mapState(
      { lat: 201, lng: 201 },
      [{ lat: 201, lng: 201 }, { lat: 202, lng: 202 }],
      true,
    ),
    "partial-route",
  );
  assert.deepEqual(polylines, []);
  assert.match(fallbackMessage("partial-route"), /route segments? could not be rendered/i);
  assert.doesNotMatch(fallbackMessage("partial-route"), /map could not be loaded/i);
});

test("uses generic fallback copy for missing keys and loading failures", () => {
  const getMapFallbackMessage = (tripMap as Record<string, unknown>).getMapFallbackMessage;

  assert.equal(typeof getMapFallbackMessage, "function");

  const fallbackMessage = getMapFallbackMessage as (state: "missing-key" | "error") => string;
  assert.match(fallbackMessage("missing-key"), /NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY/);
  assert.match(fallbackMessage("error"), /could not be loaded/i);
  assert.doesNotMatch(fallbackMessage("missing-key"), /Tokyo|3D/);
  assert.doesNotMatch(fallbackMessage("error"), /Tokyo|3D/);
});

test("retries an errored Maps script instead of waiting on terminal script events", async () => {
  const loadGoogleMaps = (tripMap as Record<string, unknown>).loadGoogleMaps;

  assert.equal(typeof loadGoogleMaps, "function");

  const priorDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const scripts: FakeScript[] = [];
  let created = 0;

  class FakeScript {
    async = false;
    dataset: Record<string, string> = {};
    src = "";
    private readonly listeners = new Map<string, Array<() => void>>();

    addEventListener(event: string, listener: () => void) {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    }

    emit(event: string) {
      this.listeners.get(event)?.forEach((listener) => listener());
    }

    remove() {
      const index = scripts.indexOf(this);
      if (index >= 0) scripts.splice(index, 1);
    }
  }

  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => {
        created += 1;
        return new FakeScript();
      },
      head: {
        append: (script: FakeScript) => {
          scripts.push(script);
          queueMicrotask(() => script.emit("error"));
        },
      },
      querySelector: () => scripts[0] ?? null,
    },
  });

  try {
    const load = loadGoogleMaps as (url: string) => Promise<void>;

    await assert.rejects(load("https://maps.example.test/one"));
    const secondAttempt = await Promise.race([
      load("https://maps.example.test/two").then(
        () => "resolved",
        () => "rejected",
      ),
      new Promise((resolve) => setTimeout(() => resolve("timed-out"), 50)),
    ]);

    assert.equal(secondAttempt, "rejected");
    assert.equal(created, 2);
  } finally {
    if (priorDocument) {
      Object.defineProperty(globalThis, "document", priorDocument);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
    if (priorWindow) {
      Object.defineProperty(globalThis, "window", priorWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
