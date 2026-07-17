/**
 * svgImport — pragmatic SVG → polygons parser for the Builder.
 *
 * Supports the shapes typical architectural floorplan exports produce:
 *   - <rect x y width height>
 *   - <polygon points="x,y x,y ...">
 *   - <polyline points="x,y x,y ...">  (closed to a polygon)
 *   - <path d="M x y L x y L x y Z">   (M/L/Z + relative m/l/z only)
 *
 * Coordinates are treated as an arbitrary local frame. The caller
 * supplies a lat/lng anchor + a metres-per-SVG-unit scale, and this
 * module maps every point into geographic coords so the polygons land
 * at the desired position on the campus.
 *
 * Not supported (intentionally, to keep this tight):
 *   - <circle> / <ellipse>       (rare in floorplans, or would require faceting)
 *   - Bezier curves in <path>    (same reason)
 *   - <use> / <symbol> flattening
 *   - Transforms other than the top-level viewBox
 *
 * The parser is defensive — malformed shapes are skipped, not thrown.
 */
import type { LatLng, Polygon } from "@ksyk/shared";

/** What kind of entity a parsed shape becomes. Inferred from either
 *  the element's own `data-kind` / class / id or its containing
 *  `<g id="…">` group name. Defaults to "building" — the caller can
 *  reassign anything they don't like from the UI. */
export type ParsedShapeKind = "building" | "room" | "hallway" | "wall";

export interface ParsedShape {
  /** Free-form label extracted from `id` / `data-name` if present. */
  label: string | null;
  /** Kind we inferred from SVG metadata. See ParsedShapeKind. */
  kind: ParsedShapeKind;
  /** For polygons (buildings/rooms/walls): closed ring of corners.
   *  For lines (hallways/walls-as-line): sequential waypoints. Either
   *  way this array carries the geometry — consumers decide shape
   *  based on `kind` + `isLine`. */
  polygon: Polygon;
  /** True when the source SVG element was a polyline / <path> without
   *  a closing Z. Hallways use this to serialise as line segments. */
  isLine: boolean;
}

export interface SvgImportOptions {
  /** Where the SVG's local origin lands on the map. */
  anchor: LatLng;
  /** How many real-world metres one SVG unit represents. */
  metersPerUnit: number;
  /** Optional viewBox override if the SVG doesn't declare one. */
  fallbackViewBox?: { minX: number; minY: number; width: number; height: number };
}

export interface SvgImportResult {
  shapes: ParsedShape[];
  warnings: string[];
}

/** Entry point — parse an SVG string into a list of geographic polygons. */
export function parseSvgToPolygons(source: string, opts: SvgImportOptions): SvgImportResult {
  const warnings: string[] = [];
  const shapes: ParsedShape[] = [];

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(source, "image/svg+xml");
  } catch (err) {
    warnings.push(`Failed to parse SVG: ${(err as Error).message}`);
    return { shapes, warnings };
  }
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    warnings.push("SVG contained a parse error and may be incomplete.");
  }
  const root = doc.querySelector("svg");
  if (!root) {
    warnings.push("No <svg> root found.");
    return { shapes, warnings };
  }

  // ViewBox → local-frame extents. SVG y grows downward; we invert so
  // "north" of the anchor lines up with the visual top of the floorplan.
  const vb = parseViewBox(root, opts.fallbackViewBox);
  const toLatLng = (x: number, y: number): LatLng =>
    localToLatLng(x, y, vb, opts.anchor, opts.metersPerUnit);

  for (const el of Array.from(root.querySelectorAll("*"))) {
    const tag = el.tagName.toLowerCase();
    const label = extractLabel(el);
    const kind = inferKind(el);
    try {
      if (tag === "rect") {
        const pts = rectPoints(el, toLatLng);
        if (pts) shapes.push({ label, kind, polygon: pts, isLine: false });
      } else if (tag === "polygon") {
        const pts = pointListPoints(el, toLatLng);
        if (pts) shapes.push({ label, kind, polygon: pts, isLine: false });
      } else if (tag === "polyline") {
        const pts = pointListPoints(el, toLatLng);
        if (pts) {
          // Polylines default to hallways when no explicit kind was
          // provided — they're geometrically lines, not areas.
          const inferred: ParsedShapeKind = kind === "building" ? "hallway" : kind;
          shapes.push({ label, kind: inferred, polygon: pts, isLine: true });
        }
      } else if (tag === "path") {
        const parsed = pathPoints(el, toLatLng);
        if (parsed) {
          shapes.push({ label, kind, polygon: parsed.points, isLine: !parsed.closed });
        }
      }
    } catch (err) {
      warnings.push(`Skipped <${tag}${label ? ` id="${label}"` : ""}>: ${(err as Error).message}`);
    }
  }
  return { shapes, warnings };
}

/** Look at the element + its ancestors for a "kind" hint.
 *  Priority: data-kind attr → id/class prefix → containing <g id="…">.
 *  Everything unknown falls back to "building". */
function inferKind(el: Element): ParsedShapeKind {
  const directHint =
    el.getAttribute("data-kind") ??
    el.getAttribute("data-type") ??
    el.getAttribute("id") ??
    el.getAttribute("class") ??
    "";
  const directKind = matchKind(directHint);
  if (directKind) return directKind;
  // Walk up looking at parent <g> ids/classes — Illustrator and Figma
  // both emit named layer groups this way.
  let parent = el.parentElement;
  while (parent && parent.tagName.toLowerCase() !== "svg") {
    const hint = (parent.getAttribute("id") ?? "") + " " + (parent.getAttribute("class") ?? "");
    const parentKind = matchKind(hint);
    if (parentKind) return parentKind;
    parent = parent.parentElement;
  }
  return "building";
}

function matchKind(text: string): ParsedShapeKind | null {
  const t = text.toLowerCase();
  if (/\bwall/.test(t)) return "wall";
  if (/\b(hall|corridor|passage)/.test(t)) return "hallway";
  if (/\broom|classroom|lab|office|gym|toilet|bathroom/.test(t)) return "room";
  if (/\bbuilding|block|wing/.test(t)) return "building";
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────

function parseViewBox(
  root: Element,
  fallback?: SvgImportOptions["fallbackViewBox"],
): { minX: number; minY: number; width: number; height: number } {
  const raw = root.getAttribute("viewBox");
  if (raw) {
    const parts = raw.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
    }
  }
  const width = Number(root.getAttribute("width"));
  const height = Number(root.getAttribute("height"));
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { minX: 0, minY: 0, width, height };
  }
  return fallback ?? { minX: 0, minY: 0, width: 1000, height: 1000 };
}

function localToLatLng(
  x: number, y: number,
  vb: { minX: number; minY: number; width: number; height: number },
  anchor: LatLng,
  metersPerUnit: number,
): LatLng {
  // Centre-relative offsets. SVG y grows downward → negate for geo north.
  const centreX = vb.minX + vb.width / 2;
  const centreY = vb.minY + vb.height / 2;
  const dxMeters = (x - centreX) * metersPerUnit;
  const dyMeters = -(y - centreY) * metersPerUnit;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((anchor.lat * Math.PI) / 180);
  return {
    lat: anchor.lat + dyMeters / metersPerDegLat,
    lng: anchor.lng + dxMeters / metersPerDegLng,
  };
}

function extractLabel(el: Element): string | null {
  return el.getAttribute("data-name") || el.getAttribute("aria-label") || el.getAttribute("id") || null;
}

function rectPoints(el: Element, toLatLng: (x: number, y: number) => LatLng): Polygon | null {
  const x = Number(el.getAttribute("x") ?? 0);
  const y = Number(el.getAttribute("y") ?? 0);
  const w = Number(el.getAttribute("width") ?? 0);
  const h = Number(el.getAttribute("height") ?? 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || w <= 0 || h <= 0) return null;
  return [
    toLatLng(x, y),
    toLatLng(x + w, y),
    toLatLng(x + w, y + h),
    toLatLng(x, y + h),
  ];
}

function pointListPoints(el: Element, toLatLng: (x: number, y: number) => LatLng): Polygon | null {
  const raw = el.getAttribute("points") ?? "";
  const nums = raw.split(/[\s,]+/).map(Number).filter(Number.isFinite);
  if (nums.length < 6 || nums.length % 2 !== 0) return null;
  const out: Polygon = [];
  for (let i = 0; i < nums.length; i += 2) out.push(toLatLng(nums[i], nums[i + 1]));
  return out;
}

/** M/L/Z-only path parser. Ignores everything else (curves become
 *  straight segments from wherever they started to wherever they end).
 *  Ideal for the boxy floorplan shapes users usually import.
 *
 *  Returns null on empty input; otherwise `{ points, closed }` where
 *  `closed` reflects whether the path ended with `Z`/`z`. Consumers
 *  use `closed` to route open paths to hallway/wall imports instead
 *  of treating them as room polygons. */
function pathPoints(el: Element, toLatLng: (x: number, y: number) => LatLng): { points: Polygon; closed: boolean } | null {
  const d = el.getAttribute("d") ?? "";
  if (!d.trim()) return null;
  const out: Polygon = [];
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cur: [number, number] = [0, 0];
  let cmd: string | null = null;
  let closed = false;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) { cmd = t; i++; continue; }
    if (!cmd) { i++; continue; }
    const takePair = (): [number, number] => {
      const x = Number(tokens[i]); const y = Number(tokens[i + 1]);
      i += 2;
      return [x, y];
    };
    switch (cmd) {
      case "M": case "L": {
        const [x, y] = takePair();
        cur = [x, y];
        out.push(toLatLng(x, y));
        // After M implicit subsequent pairs are L per SVG spec.
        if (cmd === "M") cmd = "L";
        break;
      }
      case "m": case "l": {
        const [dx, dy] = takePair();
        cur = [cur[0] + dx, cur[1] + dy];
        out.push(toLatLng(cur[0], cur[1]));
        if (cmd === "m") cmd = "l";
        break;
      }
      case "H": { const x = Number(tokens[i]); i++; cur = [x, cur[1]]; out.push(toLatLng(cur[0], cur[1])); break; }
      case "h": { const dx = Number(tokens[i]); i++; cur = [cur[0] + dx, cur[1]]; out.push(toLatLng(cur[0], cur[1])); break; }
      case "V": { const y = Number(tokens[i]); i++; cur = [cur[0], y]; out.push(toLatLng(cur[0], cur[1])); break; }
      case "v": { const dy = Number(tokens[i]); i++; cur = [cur[0], cur[1] + dy]; out.push(toLatLng(cur[0], cur[1])); break; }
      case "Z": case "z": {
        // Explicit close — flag the path as closed so consumers can
        // decide whether it should render as a polygon or line.
        closed = true;
        break;
      }
      default: {
        // Unknown / curve command — skip its arguments defensively so we
        // don't get stuck. Consume until the next command letter.
        while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) i++;
        break;
      }
    }
  }
  if (out.length < 2) return null;
  return { points: out, closed };
}
