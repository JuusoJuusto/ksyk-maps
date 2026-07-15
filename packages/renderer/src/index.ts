/**
 * @ksyk/renderer — factory + type re-exports.
 */
import type {
  CreateRendererOptions,
  RendererHandle,
  RendererKind,
} from "./types";
import { createMaplibreRenderer } from "./adapters/maplibre";

export * from "./types";
export * from "./scene";

/** Factory — creates a `RendererHandle` backed by the requested adapter. */
export function createRenderer(
  kind: RendererKind,
  opts: CreateRendererOptions,
): RendererHandle {
  switch (kind) {
    case "maplibre":
      return createMaplibreRenderer(opts);
    case "svg":
      throw new Error("[renderer] SVG adapter not implemented yet (planned M3.1)");
    case "pixi":
      throw new Error("[renderer] PixiJS adapter not implemented yet (planned M3.2)");
    default:
      throw new Error(`[renderer] Unknown adapter: ${kind}`);
  }
}
