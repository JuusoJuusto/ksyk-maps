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
