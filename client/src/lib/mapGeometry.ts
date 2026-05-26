export interface MapPoint {
  x: number;
  y: number;
}

export interface BuildingMapData {
  id: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  floors: number;
  colorCode?: string;
  mapPositionX?: number;
  mapPositionY?: number;
  description?: string | null;
}

const DEFAULT_BUILDING_SIZE = { width: 200, height: 150 };

export function parseBuildingShape(building: BuildingMapData): MapPoint[] {
  if (building.description) {
    try {
      const parsed = JSON.parse(building.description);
      if (Array.isArray(parsed?.customShape) && parsed.customShape.length >= 3) {
        return parsed.customShape.map((p: MapPoint) => ({
          x: Number(p.x) || 0,
          y: Number(p.y) || 0,
        }));
      }
    } catch {
      /* use default rect */
    }
  }

  const x = building.mapPositionX ?? 0;
  const y = building.mapPositionY ?? 0;
  const w = DEFAULT_BUILDING_SIZE.width;
  const h = DEFAULT_BUILDING_SIZE.height;
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/**
 * Geometric centroid of a polygon — correct for L-shapes and other concave footprints
 * where the bounding-box center sits in the notch.
 */
export function polygonCentroid(points: MapPoint[]): MapPoint {
  if (points.length < 3) return { x: 0, y: 0 };
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    area += cross;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    // Degenerate polygon — fall back to bbox center.
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

/** True if (px,py) is inside polygon (ray-casting). */
export function isPointInPolygon(px: number, py: number, points: MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * A label anchor that's guaranteed to sit inside the polygon. Uses the polygon
 * centroid; falls back to the bbox center, then to the first vertex if needed.
 */
export function getLabelAnchor(points: MapPoint[]): MapPoint {
  const c = polygonCentroid(points);
  if (isPointInPolygon(c.x, c.y, points)) return c;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const bbox = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  if (isPointInPolygon(bbox.x, bbox.y, points)) return bbox;
  return points[0];
}

export function getShapeBounds(points: MapPoint[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
    centerY: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

export function pointsToSvgPath(points: MapPoint[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(" ")} Z`;
}

export function computeCampusViewBox(
  buildings: BuildingMapData[],
  padding = 120
): string {
  if (buildings.length === 0) {
    return "0 0 1200 800";
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const building of buildings) {
    const bounds = getShapeBounds(parseBuildingShape(building));
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
}

export function getBuildingLabel(building: BuildingMapData, lang: string): string {
  if (lang === "fi" && building.nameFi) return building.nameFi;
  if (building.nameEn) return building.nameEn;
  return building.name;
}

export function parseViewBox(viewBox: string) {
  const [x, y, w, h] = viewBox.split(" ").map(Number);
  return { x, y, w, h };
}

export function formatViewBox(v: { x: number; y: number; w: number; h: number }) {
  return `${v.x} ${v.y} ${v.w} ${v.h}`;
}
