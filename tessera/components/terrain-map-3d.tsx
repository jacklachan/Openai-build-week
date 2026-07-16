import type { MapActivity } from "./trip-map";

type TerrainMap3DProps = {
  activities: MapActivity[];
  destination: string;
  selectedActivityId: string | null;
  selectedDay: number;
};

type TerrainPoint = MapActivity & { x: number; y: number };

const FALLBACK_POINTS = [
  { x: 220, y: 310 },
  { x: 460, y: 210 },
  { x: 720, y: 330 },
  { x: 580, y: 470 },
];

const BUILDINGS = [
  [110, 160, 1], [210, 120, 2], [330, 170, 3], [445, 115, 2], [560, 155, 4], [690, 120, 2],
  [790, 185, 3], [135, 310, 2], [285, 300, 4], [395, 350, 1], [525, 310, 3], [650, 390, 2],
  [805, 330, 4], [190, 490, 3], [340, 470, 2], [475, 520, 4], [640, 500, 2], [770, 495, 3],
] as const;

/** Projects itinerary coordinates into a bounded local terrain without a map service. */
export function getTerrainPoints(activities: MapActivity[]): TerrainPoint[] {
  const valid = activities.filter(
    (activity): activity is MapActivity & { lat: number; lng: number } =>
      Number.isFinite(activity.lat) && Number.isFinite(activity.lng),
  );
  const lngs = valid.map((activity) => activity.lng);
  const lats = valid.map((activity) => activity.lat);
  const lngRange = Math.max(...lngs, 1) - Math.min(...lngs, 0);
  const latRange = Math.max(...lats, 1) - Math.min(...lats, 0);

  return activities.map((activity, index) => {
    const fallback = FALLBACK_POINTS[index % FALLBACK_POINTS.length]!;
    const lat = activity.lat;
    const lng = activity.lng;
    if (
      lat === undefined ||
      lng === undefined ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      valid.length < 2
    ) {
      return { ...activity, ...fallback };
    }

    return {
      ...activity,
      x: 150 + ((lng - Math.min(...lngs)) / (lngRange || 1)) * 690,
      y: 180 + (1 - (lat - Math.min(...lats)) / (latRange || 1)) * 310,
    };
  });
}

function Building({ x, y, height }: { x: number; y: number; height: number }) {
  const roofY = y - height * 17;

  return (
    <g className="terrainBuilding" transform={`translate(${x} ${y})`}>
      <path className="terrainBuildingSide" d={`M0 24 34 5 68 24 34 43Z`} />
      <path className="terrainBuildingFront" d={`M0 24 34 43 34 ${43 - height * 17} 0 ${24 - height * 17}Z`} />
      <path className="terrainBuildingRight" d={`M34 43 68 24 68 ${24 - height * 17} 34 ${43 - height * 17}Z`} />
      <path className="terrainBuildingRoof" d={`M0 ${24 - height * 17} 34 ${5 - height * 17} 68 ${24 - height * 17} 34 ${43 - height * 17}Z`} />
      {height > 2 ? <circle className="terrainBuildingLight" cx="34" cy={roofY + 18} r="2" /> : null}
    </g>
  );
}

export function TerrainMap3D({
  activities,
  destination,
  selectedActivityId,
  selectedDay,
}: TerrainMap3DProps) {
  const points = getTerrainPoints(activities);
  const route = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <section className="terrainMap3d" aria-label={`Generated 3D itinerary terrain for day ${selectedDay}`}>
      <div className="terrainHud">
        <span>GENERATED TERRAIN</span>
        <strong>{destination}</strong>
        <span>{`DAY ${String(selectedDay).padStart(2, "0")} // ${points.length} STOPS`}</span>
      </div>
      <svg className="terrainSvg" role="img" viewBox="0 0 1000 640">
        <defs>
          <linearGradient id="terrain-ground" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#10243d" />
            <stop offset="1" stopColor="#06101d" />
          </linearGradient>
          <filter id="terrain-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="terrain-grid" width="52" height="52" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
            <path d="M 52 0 L 0 0 0 52" fill="none" stroke="#2c4b6b" strokeOpacity=".38" strokeWidth="1" />
          </pattern>
        </defs>
        <rect className="terrainGround" width="1000" height="640" />
        <rect className="terrainGrid" width="1000" height="640" />
        <path className="terrainRiver" d="M-80 500 C180 350 280 670 510 470 S840 190 1100 320" />
        <path className="terrainRoad terrainRoad-major" d="M-40 220 C260 370 330 60 605 230 S830 460 1100 310" />
        <path className="terrainRoad" d="M90 590 C270 390 470 590 580 330 S820 210 940 60" />
        <g aria-hidden="true">
          {BUILDINGS.map(([x, y, height]) => <Building height={height} key={`${x}-${y}`} x={x} y={y} />)}
        </g>
        {route ? <polyline className="terrainRouteGlow" points={route} /> : null}
        {route ? <polyline className="terrainRoute" points={route} /> : null}
        {points.map((point, index) => {
          const selected = point.id === selectedActivityId;
          return (
            <g className={`terrainStop${selected ? " terrainStop-selected" : ""}`} key={point.id} transform={`translate(${point.x} ${point.y})`}>
              <circle className="terrainStopHalo" r={selected ? 27 : 20} />
              <circle className="terrainStopCore" r={selected ? 10 : 8} />
              <text className="terrainStopNumber" dy="4">{index + 1}</text>
              <foreignObject height="44" width="180" x="16" y="-48">
                <div className="terrainStopLabel">{point.title}</div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <p className="terrainCaption">Local 3D route surface generated from this itinerary&apos;s stops. No map key or external tiles.</p>
    </section>
  );
}
