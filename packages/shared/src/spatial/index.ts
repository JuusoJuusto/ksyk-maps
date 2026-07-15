/**
 * @ksyk/shared/spatial — bbox-based spatial index for viewport culling.
 *
 * A grid partitioning strategy: the world lat/lng plane is divided into
 * fixed-size cells (default ~50 m at KSYK's latitude). Each indexed
 * entity is bucketed by every cell its bbox overlaps. Query =
 * enumerate cells the query bbox overlaps → union of candidates →
 * filter by exact bbox overlap.
 *
 * Why a uniform grid and not an R-tree:
 *   - Campus data lives in a small, dense window (~a few hundred metres
 *     of extent). A uniform grid keeps bucketing O(1) per insert and
 *     query and dodges the R-tree rebalancing tax.
 *   - Insert + query are amortised O(1). Total memory is bounded by
 *     entity count × avg cells overlapped (small — most rooms fit in a
 *     single cell).
 *
 * Adapters:
 *   - `insert(id, bbox)` — index an entity.
 *   - `queryBBox(bbox)` — ids whose bbox overlaps the query bbox.
 *   - `queryPoint(latLng)` — ids whose bbox contains the point.
 *   - `remove(id)` / `clear()`.
 */
import type { BBox, LatLng } from "../types";

/** Approx metres per degree of latitude at temperate latitudes. */
const METRES_PER_DEG_LAT = 111_320;

/** Default cell size in metres. 50 m is a good bucket for classroom-
 *  scale features — small enough that few queries hit >100 buckets, big
 *  enough that most rooms fit in 1-2 cells. */
const DEFAULT_CELL_METRES = 50;

export interface SpatialIndexOptions {
  /** Cell size in metres. Larger = fewer cells, more candidates per
   *  query. Default 50 m. */
  cellSizeMeters?: number;
}

export class SpatialIndex {
  private cells = new Map<string, Set<string>>();
  /** id → the set of cell keys it occupies (needed by `remove`). */
  private cellsOfId = new Map<string, string[]>();
  /** id → its indexed bbox (needed by the exact-overlap filter). */
  private bboxOfId = new Map<string, BBox>();
  private cellSizeDegLat: number;
  /** Cell size in longitude degrees. Approximated using cos(centre lat)
   *  once, at first insert — good enough for a campus-scale extent. */
  private cellSizeDegLng: number | null = null;

  constructor(opts: SpatialIndexOptions = {}) {
    const cellM = opts.cellSizeMeters ?? DEFAULT_CELL_METRES;
    this.cellSizeDegLat = cellM / METRES_PER_DEG_LAT;
  }

  get size(): number { return this.bboxOfId.size; }

  insert(id: string, bbox: BBox): void {
    if (this.bboxOfId.has(id)) this.remove(id);
    if (this.cellSizeDegLng == null) {
      const midLat = (bbox.minLat + bbox.maxLat) / 2;
      const dpm = METRES_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
      // Guard against zero when the caller inserts a point on a pole.
      const cellM = this.cellSizeDegLat * METRES_PER_DEG_LAT;
      this.cellSizeDegLng = cellM / Math.max(dpm, 1);
    }
    const cells = this.cellsFor(bbox);
    for (const c of cells) {
      let bucket = this.cells.get(c);
      if (!bucket) {
        bucket = new Set();
        this.cells.set(c, bucket);
      }
      bucket.add(id);
    }
    this.cellsOfId.set(id, cells);
    this.bboxOfId.set(id, bbox);
  }

  remove(id: string): void {
    const cells = this.cellsOfId.get(id);
    if (!cells) return;
    for (const c of cells) {
      const bucket = this.cells.get(c);
      if (!bucket) continue;
      bucket.delete(id);
      if (bucket.size === 0) this.cells.delete(c);
    }
    this.cellsOfId.delete(id);
    this.bboxOfId.delete(id);
  }

  clear(): void {
    this.cells.clear();
    this.cellsOfId.clear();
    this.bboxOfId.clear();
    this.cellSizeDegLng = null;
  }

  /** Ids whose indexed bbox overlaps `query`. Sorted by id for a stable
   *  return order (helps callers dedupe further passes). */
  queryBBox(query: BBox): string[] {
    const cells = this.cellsFor(query);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of cells) {
      const bucket = this.cells.get(c);
      if (!bucket) continue;
      for (const id of bucket) {
        if (seen.has(id)) continue;
        seen.add(id);
        const b = this.bboxOfId.get(id)!;
        if (bboxOverlapsInline(b, query)) out.push(id);
      }
    }
    out.sort();
    return out;
  }

  /** Ids whose indexed bbox contains `pt`. */
  queryPoint(pt: LatLng): string[] {
    return this.queryBBox({
      minLat: pt.lat, maxLat: pt.lat, minLng: pt.lng, maxLng: pt.lng,
    });
  }

  /** Enumerate cell keys touching `bbox`. */
  private cellsFor(bbox: BBox): string[] {
    if (this.cellSizeDegLng == null) {
      // First-ever insert didn't happen yet; approximate assuming the
      // bbox itself sits at a temperate latitude.
      const midLat = (bbox.minLat + bbox.maxLat) / 2;
      const dpm = METRES_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
      const cellM = this.cellSizeDegLat * METRES_PER_DEG_LAT;
      this.cellSizeDegLng = cellM / Math.max(dpm, 1);
    }
    const cLng = this.cellSizeDegLng;
    const cLat = this.cellSizeDegLat;
    const minX = Math.floor(bbox.minLng / cLng);
    const maxX = Math.floor(bbox.maxLng / cLng);
    const minY = Math.floor(bbox.minLat / cLat);
    const maxY = Math.floor(bbox.maxLat / cLat);
    const out: string[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) out.push(`${x},${y}`);
    }
    return out;
  }
}

/** Inline (no import) bbox overlap. Duplicated from `geo/index.ts` so
 *  the spatial module has no cross-file dependency inside `shared`. */
function bboxOverlapsInline(a: BBox, b: BBox): boolean {
  return (
    a.minLng <= b.maxLng &&
    a.maxLng >= b.minLng &&
    a.minLat <= b.maxLat &&
    a.maxLat >= b.minLat
  );
}
