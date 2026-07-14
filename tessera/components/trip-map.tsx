"use client";

import { useEffect, useRef, useState } from "react";

type GoogleMapsLibrary = {
  Map3DElement: new (options: Record<string, unknown>) => HTMLElement;
};

type GoogleMapsNamespace = {
  importLibrary?: (library: string) => Promise<unknown>;
};

type MapState = "loading" | "ready" | "missing-key" | "error";

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsNamespace;
    };
  }
}

/** Builds the browser-only Maps JavaScript API address without exposing a key in source. */
export function getMapScriptUrl(browserKey: string): string | null {
  if (!browserKey.trim()) {
    return null;
  }

  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(browserKey)}&v=weekly`;
}

/** Gives the setup state an honest explanation for either map failure mode. */
export function getMapFallbackMessage(state: "missing-key" | "error"): string {
  if (state === "missing-key") {
    return "Add NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY for the live Tokyo 3D map.";
  }

  return "The Tokyo 3D map could not be loaded. Check the browser key and Maps API configuration.";
}

function loadGoogleMaps(url: string): Promise<void> {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-tessera-google-maps="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Maps could not be loaded.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.tesseraGoogleMaps = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google Maps could not be loaded.")),
      { once: true },
    );
    document.head.append(script);
  });
}

export function TripMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptUrl = getMapScriptUrl(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "");
  const [mapState, setMapState] = useState<MapState>(() =>
    scriptUrl ? "loading" : "missing-key",
  );

  useEffect(() => {
    if (!scriptUrl) {
      return;
    }

    const mapScriptUrl = scriptUrl;
    let cancelled = false;

    async function initialiseMap() {
      try {
        await loadGoogleMaps(mapScriptUrl);
        const maps = window.google?.maps;

        if (!maps?.importLibrary || !containerRef.current) {
          throw new Error("The Google Maps 3D library is unavailable.");
        }

        const library = (await maps.importLibrary("maps3d")) as GoogleMapsLibrary;
        const map = new library.Map3DElement({
          center: { altitude: 900, lat: 35.6762, lng: 139.6503 },
          defaultUIHidden: true,
          heading: 12,
          mode: "HYBRID",
          range: 12000,
          tilt: 62,
        });

        if (!cancelled && containerRef.current) {
          containerRef.current.replaceChildren(map);
          setMapState("ready");
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
    };
  }, [scriptUrl]);

  return (
    <div className="mapScene" aria-label="Aerial Tokyo trip map">
      <div ref={containerRef} className="mapCanvas" />
      {mapState !== "ready" ? <div className="mapFallback" aria-hidden="true" /> : null}
      <div className="mapShade" aria-hidden="true" />
      {mapState === "missing-key" || mapState === "error" ? (
        <p className="mapNotice">{getMapFallbackMessage(mapState)}</p>
      ) : null}
      {mapState === "loading" ? <p className="mapLoading">Loading Tokyo in 3D…</p> : null}
    </div>
  );
}
