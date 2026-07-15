/**
 * @ksyk/renderer — public interface.
 *
 * Backend-agnostic. Every adapter (MapLibre, SVG, PixiJS) implements
 * `RendererHandle` so consumers don't care about the underlying tech.
 */
import type { LatLng, Polygon, BBox } from "@ksyk/shared";

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
}

/** A drawable feature — the smallest unit the renderer knows about. */
export interface RenderFeature {
  id: string;
  kind: FeatureKind;
  /** Polygon: outer ring corners. Line: waypoints. Point/label: a single
   *  point in coords[0]. */
  coords: LatLng[];
  /** Rendered on top of the feature (label features only render the
   *  label; other kinds render `label` as an overlay). */
  label?: string;
  style?: FeatureStyle;
  /** Draw order — higher = drawn on top. Same z as source order otherwise. */
  z?: number;
  /** Free-form metadata returned to click/hover handlers. */
  data?: Record<string, unknown>;
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
  /** Add or replace a feature. */
  addFeature(feature: RenderFeature): void;
  /** Add many features in one batch — adapters may collapse this to a
   *  single source update. */
  addFeatures(features: RenderFeature[]): void;
  /** Remove a single feature by id. */
  removeFeature(id: string): void;
  /** Remove ALL features. Useful when switching floors. */
  clearFeatures(): void;

  /** Camera control. */
  flyTo(center: LatLng, zoom?: number, opts?: { duration?: number }): void;
  fitBBox(bbox: BBox, opts?: { padding?: number; duration?: number }): void;
  setBearing(deg: number, opts?: { animate?: boolean }): void;
  setPitch(deg: number, opts?: { animate?: boolean }): void;
  getCamera(): CameraState;

  /** Hit test — returns the feature at a screen point (or null). */
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
  initialCamera?: Partial<CameraState>;
  /** For "maplibre": a MapLibre style URL or spec object. Ignored by
   *  other adapters. */
  style?: unknown;
}
