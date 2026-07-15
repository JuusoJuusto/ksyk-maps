/**
 * @ksyk/renderer — public interface.
 *
 * Backend-agnostic. Every adapter (MapLibre today; SVG + PixiJS planned)
 * implements `RendererHandle`. Consumers of the renderer never touch a
 * MapLibre/Pixi/DOM type directly.
 */
import type { LatLng, BBox, MapTheme } from "@ksyk/shared";

/** Kinds of features a renderer can draw. */
export type FeatureKind = "polygon" | "line" | "point" | "label";

/** Style options for a feature. Not every renderer honours everything;
 *  adapters fall back to sensible defaults for anything unsupported. */
export interface FeatureStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  /** For "label" features. */
  textColor?: string;
  textSize?: number;
  textHaloColor?: string;
  textHaloWidth?: number;
  /** For "point" features. */
  radius?: number;
  /** Dashed line pattern — array of on/off pixel lengths. */
  dashArray?: number[];
}

/** A drawable feature. */
export interface RenderFeature {
  id: string;
  kind: FeatureKind;
  /** Polygon: outer ring corners. Line: waypoints. Point/label: a
   *  single point in `coords[0]`. */
  coords: LatLng[];
  label?: string;
  style?: FeatureStyle;
  /** Draw order — higher = drawn on top. */
  z?: number;
  /** Free-form metadata returned to click/hover handlers. */
  data?: Record<string, unknown>;
  /** Which floor this feature belongs to. `null` = campus-wide
   *  (buildings, outdoor). */
  floor?: number | null;
  /** Whether this feature is selectable (hit-testing + click emission). */
  selectable?: boolean;
}

/** Camera state. */
export interface CameraState {
  center: LatLng;
  zoom: number;
  bearing: number;
  pitch: number;
}

/** Events the renderer emits. */
export type RendererEvent =
  | { type: "click"; feature: RenderFeature | null; latLng: LatLng }
  | { type: "hover"; feature: RenderFeature | null; latLng: LatLng }
  | { type: "camerachange"; camera: CameraState }
  | { type: "ready" }
  | { type: "error"; message: string };

export type RendererEventHandler = (e: RendererEvent) => void;

/** The single interface every adapter implements. */
export interface RendererHandle {
  addFeature(feature: RenderFeature): void;
  addFeatures(features: RenderFeature[]): void;
  removeFeature(id: string): void;
  clearFeatures(): void;

  /** Set the visible floor. `null` = show all floors (default). */
  setActiveFloor(floor: number | null): void;
  getActiveFloor(): number | null;

  /** Highlight a single feature (selection ring). Pass null to clear. */
  setSelection(featureId: string | null): void;
  getSelection(): string | null;

  /** Highlight a single feature (hover ring). Pass null to clear. */
  setHover(featureId: string | null): void;

  flyTo(center: LatLng, zoom?: number, opts?: { duration?: number }): void;
  fitBBox(bbox: BBox, opts?: { padding?: number; duration?: number }): void;
  setBearing(deg: number, opts?: { animate?: boolean }): void;
  setPitch(deg: number, opts?: { animate?: boolean }): void;
  getCamera(): CameraState;
  /** Apply theme colors (light/dark). */
  setTheme(theme: MapTheme): void;

  /** Hit test — feature at a screen point (or null). */
  featureAt(screenX: number, screenY: number): RenderFeature | null;

  /** Subscribe to events. Returns an unsubscribe function. */
  on(handler: RendererEventHandler): () => void;

  /** Tear down all resources. */
  destroy(): void;
}

/** Which adapter to use. */
export type RendererKind = "maplibre" | "svg" | "pixi";

export interface CreateRendererOptions {
  container: HTMLElement;
  /** Initial camera. If omitted the adapter uses the caller-provided
   *  `mapDefaults` from `@ksyk/shared` — no hardcoded fallback here. */
  initialCamera?: Partial<CameraState>;
  /** For "maplibre": a MapLibre style URL or spec object. */
  style?: unknown;
  /** Optional starting theme. */
  theme?: MapTheme;
}
