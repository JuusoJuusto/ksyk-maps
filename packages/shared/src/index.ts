/**
 * @ksyk/shared — barrel export.
 *
 * Import everything from the package root:
 *   import type { Building, Room, LatLng } from "@ksyk/shared";
 *   import { haversineMeters, polygonBounds } from "@ksyk/shared";
 */
export * from "./types";
export * from "./geo";
export * from "./search";
export * from "./search/rooms";
export * from "./spatial";
export * from "./validation";
export * from "./io";
export * from "./poi/categories";
export * as schema from "./schema";
