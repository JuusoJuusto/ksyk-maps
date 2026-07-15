# @ksyk/renderer

The rendering engine interface + adapters for KSYK Maps.

## Why an interface?

Right now the app uses MapLibre GL for the base map. Long-term we may
want:
- A **PixiJS/WebGL** renderer for GPU-accelerated indoor overlays with
  thousands of rooms
- An **SVG** renderer for print/export
- A **Canvas 2D** fallback for very old browsers

All three should be interchangeable. Callers use `RendererHandle`; the
engine picks an adapter per platform capability.

## Structure

- `src/types.ts` — `RendererHandle` interface (add/remove features, hit
  test, camera control, event listeners)
- `src/adapters/maplibre.ts` — first concrete adapter. Wraps a MapLibre
  `Map` and translates renderer ops into MapLibre source/layer calls.
- `src/adapters/svg.ts` (planned) — SVG renderer for export
- `src/adapters/pixi.ts` (planned M3.2) — PixiJS for indoor-heavy loads

## Consumer example

```ts
import { createRenderer } from "@ksyk/renderer";
const renderer = createRenderer("maplibre", { container: divEl });
renderer.addFeature({ id: "b1", type: "polygon", coords: [...] });
renderer.on("click", (feat) => console.log(feat.id));
```

## Roadmap

- **M3.0 (now)** — interface + MapLibre adapter
- **M3.1** — SVG adapter for print
- **M3.2** — PixiJS adapter for indoor scenes
- **M3.3** — Chunked spatial index (quadtree) for 10k+ features
