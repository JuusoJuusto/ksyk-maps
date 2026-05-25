/**
 * KSYK campus building outlines from floor-plan photos (outline only).
 * Wings: A, U, K, M, R, B
 */

export type OutlinePoint = { x: number; y: number };

export type BuildingOutlinePreset = {
  letter: string;
  nameEn: string;
  nameFi: string;
  floors: number;
  stroke: string;
  shape: OutlinePoint[];
};

/** Site-plan style footprints — stroke only on map */
export const KSYK_BUILDING_OUTLINES: Record<string, BuildingOutlinePreset> = {
  B: {
    letter: "B",
    nameEn: "B Wing",
    nameFi: "B-siipi",
    floors: 3,
    stroke: "#059669",
    shape: [
      { x: 80, y: 240 },
      { x: 380, y: 240 },
      { x: 380, y: 530 },
      { x: 80, y: 530 },
    ],
  },
  R: {
    letter: "R",
    nameEn: "R Wing",
    nameFi: "R-siipi",
    floors: 2,
    stroke: "#F59E0B",
    shape: [
      { x: 80, y: 50 },
      { x: 350, y: 50 },
      { x: 350, y: 220 },
      { x: 80, y: 220 },
    ],
  },
  K: {
    letter: "K",
    nameEn: "K Wing",
    nameFi: "K-siipi",
    floors: 4,
    stroke: "#DC2626",
    shape: [
      { x: 400, y: 190 },
      { x: 950, y: 190 },
      { x: 950, y: 510 },
      { x: 710, y: 510 },
      { x: 710, y: 370 },
      { x: 490, y: 370 },
      { x: 490, y: 510 },
      { x: 400, y: 510 },
    ],
  },
  M: {
    letter: "M",
    nameEn: "M Wing",
    nameFi: "M-siipi",
    floors: 2,
    stroke: "#EC4899",
    shape: [
      { x: 210, y: 560 },
      { x: 410, y: 560 },
      { x: 410, y: 700 },
      { x: 210, y: 700 },
    ],
  },
  U: {
    letter: "U",
    nameEn: "U Wing",
    nameFi: "U-siipi",
    floors: 4,
    stroke: "#2563EB",
    shape: [
      { x: 970, y: 130 },
      { x: 1320, y: 130 },
      { x: 1320, y: 490 },
      { x: 970, y: 490 },
    ],
  },
  A: {
    letter: "A",
    nameEn: "A Wing",
    nameFi: "A-siipi",
    floors: 4,
    stroke: "#7C3AED",
    shape: [
      { x: 1280, y: 190 },
      { x: 1520, y: 190 },
      { x: 1520, y: 620 },
      { x: 1280, y: 620 },
    ],
  },
};

export const KSYK_BUILDING_LETTERS = ["B", "R", "K", "M", "U", "A"] as const;

export function outlineToPath(points: OutlinePoint[]): string {
  if (points.length < 2) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(" ")} Z`;
}

export function getBuildingLetter(name: string): string | null {
  const n = (name || "").trim().toUpperCase();
  if ((KSYK_BUILDING_LETTERS as readonly string[]).includes(n)) return n;
  const first = n.charAt(0);
  if ((KSYK_BUILDING_LETTERS as readonly string[]).includes(first)) return first;
  return null;
}

/** Six wings as map data (outline shapes from floor plans) */
/** 3D viewer footprint boxes from outline presets */
export function outlinesAs3DBuildings(): Array<{
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
}> {
  return KSYK_BUILDING_LETTERS.map((letter) => {
    const preset = KSYK_BUILDING_OUTLINES[letter];
    const xs = preset.shape.map((p) => p.x);
    const ys = preset.shape.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return {
      id: `wing-${letter}`,
      name: letter,
      x: cx - 800,
      y: 0,
      z: cy - 400,
      width: maxX - minX,
      height: Math.max(preset.floors * 32, 48),
      depth: maxY - minY,
      color: preset.stroke,
    };
  });
}

export function outlinesAsMapBuildings(): Array<{
  id: string;
  name: string;
  nameEn: string;
  nameFi: string;
  floors: number;
  colorCode: string;
  description: string;
}> {
  return KSYK_BUILDING_LETTERS.map((letter) => {
    const p = KSYK_BUILDING_OUTLINES[letter];
    return {
      id: `wing-${letter}`,
      name: letter,
      nameEn: p.nameEn,
      nameFi: p.nameFi,
      floors: p.floors,
      colorCode: p.stroke,
      description: JSON.stringify({ customShape: p.shape }),
    };
  });
}
