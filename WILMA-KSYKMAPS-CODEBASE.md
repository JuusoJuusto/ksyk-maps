# KSYK Maps — Complete Codebase Documentation

> **Current version:** 3.34.0 · **Date:** August 2026  
> This document covers every layer of the stack: client, server, shared packages, data model, API contract, and open TODOs.

---

## Table of Contents

1. [Architecture overview](#1-architecture-overview)
2. [Tech stack](#2-tech-stack)
3. [Data model](#3-data-model)
4. [Client](#4-client)
   - [App entry point & routing](#41-app-entry-point--routing)
   - [Public map pages](#42-public-map-pages)
   - [Builder page](#43-builder-page)
   - [Builder sub-components](#44-builder-sub-components)
   - [Shared map components](#45-shared-map-components)
   - [Hooks](#46-hooks)
   - [Contexts](#47-contexts)
   - [Libs / utilities](#48-libs--utilities)
5. [Server](#5-server)
   - [Entry & registration order](#51-entry--registration-order)
   - [Auth (simpleAuth)](#52-auth-simpleauth)
   - [routes.ts — general API](#53-routests--general-api)
   - [mapRoutes.ts — map & routing API](#54-maproutests--map--routing-api)
   - [firebaseStorage.ts — Firestore adapter](#55-firebasestoraggets--firestore-adapter)
   - [Other server files](#56-other-server-files)
6. [Shared packages](#6-shared-packages)
   - [@ksyk/shared](#61-ksykshared)
   - [@ksyk/routing](#62-ksykrouting)
   - [@ksyk/renderer (stub)](#63-ksykrenderer-stub)
7. [API reference](#7-api-reference)
8. [Data flow: public map](#8-data-flow-public-map)
9. [Data flow: Builder](#9-data-flow-builder)
10. [Publish flow](#10-publish-flow)
11. [Auth flow](#11-auth-flow)
12. [DONE — completed features](#12-done--completed-features)
13. [TODO — open work](#13-todo--open-work)

---

## 1. Architecture overview

```
Browser
  ├── Public map  (/): KSYKMapsHome → KSYKMapView → CampusMap + CampusOverlay
  ├── Builder    (/builder): BuilderPage → BuilderWorkspace → CampusMap + builder components
  └── Admin      (/admin): AdminDashboard + sub-panels

Express server (Vercel serverless, api/index.ts)
  ├── /api/buildings, /api/rooms, /api/hallways … — CRUD on live Firestore
  ├── /api/pois, /api/doors, /api/stairs, /api/elevators — point POIs
  ├── /api/map-package/published — published snapshot (read-only for public)
  ├── /api/route — A* / Dijkstra indoor routing
  └── Auth, admin, logs, telemetry, wilma, …

Firebase Firestore (live data)
  buildings / rooms / hallways / doors / stairs / elevators
  campus_pois / mapPackages / users / …
```

All map geometry lives in Firestore, not in the SQL database. `shared/schema.ts` defines Drizzle+Zod schemas that are used **only for TypeScript types and validation** — the actual storage backend is Firestore via `server/firebaseStorage.ts`.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript + Vite |
| Routing (client) | Wouter (lightweight, ~2 kB) |
| Data fetching | TanStack React Query v5 |
| Map engine | MapLibre GL JS (WebGL, open-source Mapbox fork) |
| Basemap tiles | CARTO Voyager (light) / CARTO Dark Matter (dark) |
| Styling | Tailwind CSS + shadcn/ui component library |
| Backend framework | Express.js |
| Database | Firebase Firestore (all campus map data) |
| Auth | bcrypt session cookies (`simpleAuth.ts`) |
| ORM / schema | Drizzle ORM + Zod (types only, not used for actual DB calls) |
| Hosting | Vercel (serverless edge functions) |
| Monorepo packages | `@ksyk/shared`, `@ksyk/routing`, `@ksyk/renderer` |
| Build | Vite (client) + esbuild/tsx (server) |

---

## 3. Data model

All types are defined in `packages/shared/src/types/index.ts`.

### Building
```
id, name, nameEn?, nameFi?, description?, address?, colorCode?,
floors?, floorMin?, floorMax?, defaultFloor?, campus?,
points?: LatLng[],   ← polygon footprint
center?, bbox?, rotationDeg?, metadata?, theme?
```
A building footprint is a polygon drawn by the admin. `floorMin`/`floorMax` defines the floor range (e.g. `1..3`). Currently ONE polygon per building for all floors — per-floor polygons are a TODO.

### Room
```
id, buildingId, floor, roomNumber, name?, nameEn?, nameFi?,
displayName?, description?, type?: RoomType, capacity?, department?,
teacher?, aliases?, points?: LatLng[], rotationDeg?,
colorCode?, tags?, areaSquareMeters?, iconUrl?,
availabilityId?, photoUrl?, hours?, scheduleUrl?, scheduleLabel?,
metadata?
```
`type = "hallway"` marks a Corridor (filled walkable polygon drawn with the C tool) — these are stored in the `rooms` Firestore collection but filtered OUT of the Rooms tab in the Builder sidebar and shown in the Structure tab instead.

### Hallway
```
id, buildingId?, floor?, startX, startY, endX, endY,
points?: LatLng[],   ← polyline (multi-vertex path)
width?, surface?, directions?, accessible?
```
`surface = "wall"` marks a non-traversable wall segment. `surface = "concrete"/"carpet"/etc.` is a walkable path. The `points` array (multi-vertex) is the new format; `startX/Y + endX/Y` is legacy.

### Door
```
id, buildingId, floor, position: LatLng, connects: [string, string],
swing?, swingArcDeg?, widthMeters?, accessible?,
emergencyExit?, locked?, autoClose?, visible?
```
`connects` links two entity IDs (roomId, hallwayId, or roomA+roomB). Doors that haven't been wired yet arrive with an empty `connects` array from Firestore.

### Stair / Elevator
```
id, buildingId, floors: number[], position: LatLng, accessible?, directions?
// Elevator also: name?
```
`floors` lists every floor the staircase / elevator reaches. Must reach ≥ 2 floors for routing.

### Floor
```
id, buildingId, floorNumber, name?, nameEn?, nameFi?,
elevationMeters?, heightMeters?, backgroundImageUrl?,
outline?: LatLng[], defaultZoom?, defaultBearing?
```

### MapPackage
A versioned snapshot of the entire campus. Builder produces it on Publish; public map reads the latest. Contains: `manifest`, `mapDefaults`, `buildings`, `floors`, `rooms`, `hallways`, `doors`, `stairs`, `elevators`, `outdoorAreas?`, `layers?`, `navGraph?`.

### GenericPOI (campus_pois Firestore collection)
```
id, kind: string, position: LatLng, floor?, label?, metadata?
```
Free-form — `kind` is one of: `info`, `reception`, `parking`, `bike`, `restroom`, `restroom_m/f/a`, `cafe`, `vending`, `water`, `first_aid`, `defibrillator`, `printer`, `meeting_point`.

---

## 4. Client

### 4.1 App entry point & routing

**`client/src/App.tsx`**

Root of the React tree. Mounts providers in this order:
1. `ErrorBoundary` — catches React render crashes, shows fallback
2. `QueryClientProvider` — TanStack React Query
3. `SplashScreen` — boot animation (reads query cache for readiness)
4. `ThemeProvider` → `DarkModeProvider` — CSS variables + dark mode
5. `TooltipProvider` — shadcn tooltip context
6. `HelpProvider` → `HelpBubble` — floating help system
7. `AccessibilityClasses` — `large-text` / `high-contrast` CSS classes
8. `CookieConsent` — GDPR banner
9. `Toaster` — toast notification outlet
10. `CommandPalette` — global ⌘K action launcher
11. `Router` — Wouter switch

**Routes:**

| Path | Component | Notes |
|---|---|---|
| `/` | `KSYKMapsHome` | Public campus map |
| `/admin` | `Admin` | Login + dashboard (single route) |
| `/admin/forgot-password` | `AdminForgotPassword` | Password reset request |
| `/admin/reset-password` | `AdminResetPassword` | Token-gated reset form |
| `/builder` | `BuilderPage` | Map editor (admin-only gate) |
| `/hsl` | `HSL` | Helsinki bus/tram timetables |
| `/lunch` | `Lunch` | School cafeteria menu |
| `/features` | `Features` | App feature showcase |
| `/owlapps` | `NordbyteStudio` | Nordbyte Studio partner page |
| `/secret-easter-egg` | `EasterEgg` | Hidden secret |
| `/konami-code-activated` | `KonamiEasterEgg` | ↑↑↓↓←→←→BA |
| `/dev-mode-secret` | `DevModeEasterEgg` | Developer mode |
| `/debug-buildings` | `DebugBuildings` | Dev helper |

Also: global error → `fetch("/api/logs")`, `initAnalytics()`, `initTelemetry()` on mount.

---

### 4.2 Public map pages

**`client/src/pages/ksykmaps-home.tsx`**  
Thin shell: renders the page header with search bar + `<KSYKMapView>`.

**`client/src/components/KSYKMapView.tsx`**  
Main campus map view. Wraps `CampusMap` with:
- **Floor selector** (top-right) — built from `buildings` array, extracts `floorMin..floorMax`
- **Zoom in / out** (bottom-right) — calls `handleRef.current.map.zoomIn/Out()`
- **3D toggle** — persisted in localStorage via `usePersistedState`; switches `CampusMap` pitch
- **Center / locate button** — flies map to campus bounding box
- **North reset** — appears only when map is rotated; snaps bearing to 0°
- **Search** — `SearchResultsDropdown` + `FeatureInfoSheet` + `FeatureHighlight`
- **Navigation panel** — `NavigationPanel` for A* routing
- **`CampusOverlay`** — the actual campus geometry layers

Floor is synced to `?floor=` URL query param so shared links open on the right level.

**`client/src/components/CampusOverlay.tsx`** (~1800 lines)  
Headless component. Receives a `MaplibreMap` reference and a `useCampusData()` result, then installs GeoJSON sources + layers:

| Layer id | Type | What |
|---|---|---|
| `campus-buildings-fill` | fill | Building footprint, tinted by `colorCode` |
| `campus-buildings-outline` | line | Building border |
| `campus-buildings-label` | symbol | Building name, top z-order |
| `campus-hallways-line` | line | Walkable corridor paths (amber) |
| `campus-walls-line` | line | Wall segments (light slate, `surface="wall"`) |
| `campus-rooms-fill` | fill | Room polygons filtered to `activeFloor` |
| `campus-rooms-outline` | line | Room outlines |
| `campus-rooms-label` | symbol | Room labels at centroid |
| `campus-buildings-extrude` | fill-extrusion | 3D building shells |
| `campus-buildings-roof` | fill | 3D roof cap |
| `campus-floor-slabs` | fill-extrusion | Per-floor slab slices |
| `campus-rooms-extrude` | fill-extrusion | Extruded room volumes |
| `campus-buildings-shadow` | fill | Fake ground shadow ring |
| `campus-stairs-tower` | fill-extrusion | 3D stair shaft |
| `campus-elevators-tower` | fill-extrusion | 3D elevator shaft |
| `campus-pois-chip` | symbol | POI label chips |
| `campus-pois-icon` | symbol | POI icons |
| `campus-pois-pillar-3d` | fill-extrusion | POI pillars in 3D mode |
| `campus-doors-marker` | fill | Door pads at ground level |
| `campus-entrances-marker` | fill | Entrance pads (green) |
| `campus-buildings-ao` | fill | Ambient occlusion ring |
| `campus-entrances-glow` | fill | Entrance/POI glow ring |
| `campus-sky` | sky | Sky gradient (3D only) |

`applyVisibility()` is called whenever `is3D` or `activeFloor` changes — hides/shows layers appropriately (e.g. `campus-rooms-fill` hidden in 3D; extruded layers hidden in 2D).

All data comes from `useCampusData()`. The overlay re-runs on every query update via React effects.

---

### 4.3 Builder page

**`client/src/pages/builder.tsx`** (~3500 lines)

The map editor. Split into:
- `BuilderPage` — auth gate (checks `ksyk_admin_logged_in` + `ksyk_admin_user.role`)
- `BuilderWorkspace` — the actual editor (only mounts when auth passes)

#### State

| State | Type | Purpose |
|---|---|---|
| `activeTool` | `BuilderTool` | Which tool is selected |
| `waypoints` | `LngLat[]` | Waypoints for the current polygon/polyline being drawn |
| `waypointsRef` | `Ref<LngLat[]>` | Ref copy so click handlers can read latest without being re-registered |
| `cursorLngLat` | `{lng, lat}` | Current cursor position (updated on mousemove for ghost preview) |
| `orthoEnabled` | `boolean` | Right-angle constraint on new waypoints |
| `orthoEnabledRef` | `Ref<boolean>` | Ref copy (same reason as waypointsRef) |
| `snapEnabled` | `boolean` | Vertex snap |
| `gridEnabled` | `boolean` | Grid overlay |
| `selection` | `LeftSidebarSelection` | Selected entity (drives PropertyPanel + map highlight) |
| `extraBuildingIds` | `Set<string>` | Multi-selection building ids |
| `extraRoomIds` | `Set<string>` | Multi-selection room ids |
| `sidebarTab` | `LeftSidebarTab` | Active left panel tab |
| `mapReady` | `boolean` | True after MapLibre `load` event |
| `cameraState` | `{activeFloor, bearing, pitch, …}` | Current view state |
| `isPublishing` | `boolean` | Publish in-flight |
| `history` | undo stack | From `useUndoStack` hook |
| `navGraph` | nav graph | From `useNavGraph` hook |

#### Tools (BuilderTool)

| Tool key | Hotkey | Action |
|---|---|---|
| `select` | V | Click to select building/room/hallway; shift-click multi-select |
| `pan` | Space | Free pan (no click logic) |
| `building` | B | Click polygon corners → POST /api/buildings |
| `rectangle` | - | Click two corners → POST /api/buildings (rectangle shortcut) |
| `room` | R | Click polygon corners inside a building → POST /api/rooms |
| `corridor` | C | Click polygon corners → POST /api/rooms with `type="hallway"` |
| `hallway` | H | Click waypoints → POST /api/hallways |
| `wall` | W | Click waypoints → POST /api/hallways with `surface="wall"` |
| `measure` | M | Click two points → toast with distance |
| `poi-door` | - | Click → POST /api/doors (snaps to nearest wall ≤3m) |
| `poi-entrance` | - | Click → POST /api/doors with `isEntrance=true` |
| `poi-stairs` | - | Click → POST /api/stairs |
| `poi-elevator` | - | Click → POST /api/elevators |
| `poi-info/reception/parking/bike/…` | - | Click → POST /api/pois with matching `kind` |
| `node` | - | Drop nav-graph node (localStorage) |
| `connect` | - | Connect two nav-graph nodes with an edge |

#### Key effects

**Buildings effect** (`[buildings, selectedId, selectedBuildingIds, mapReady]`):  
Installs/updates `builder-buildings` GeoJSON source. Paints selected buildings in blue, multi-selected in purple, unselected in the building's `colorCode`.

**Rooms + Hallways effect** (`[mapReady, roomsQ.data, hallwaysQ.data, selection, selectedRoomIds, cameraState.activeFloor]`):  
Installs `builder-rooms` source (all rooms incl. corridors as filled polygons) and `builder-hallways` source (wall + path LineStrings). Floors not matching `activeFloor` render as a faint ghost.

**Nav-graph effect** (`[mapReady, navGraph.graph, cameraState.activeFloor, connectFrom]`):  
Renders the local nav-graph (nodes as colored circles, edges as lines).

**Click handler effect** (`[activeTool, mapReady]`):  
Registers the main `map.on("click", …)` handler. Uses `waypointsRef.current` and `orthoEnabledRef.current` (not closured state) so ortho + snap always read the latest values without the effect being re-registered on every click.

**Ghost preview effect** (`[mapReady, activeTool, waypoints, cursorLngLat, orthoEnabled]`):  
Draws the dashed "preview" line from last waypoint to current cursor position. Applies the same ortho projection as the click handler so the ghost matches where the click will land.

**Snap detection effect** (mousemove, `[mapReady, activeTool, buildings, roomsQ.data, hallwaysQ.data]`):  
Walks through every polygon vertex and segment midpoint within a pixel threshold. Closest hit stored in `snapTargetRef.current`. Drives the snap indicator circle drawn on the map.

#### Ortho constraint algorithm

```
Given: wps = current waypoints, raw cursor position p
If orthoEnabled and wps.length >= 2:
  prev      = wps[last]
  beforePrev = wps[last-1]
  edge vector e = prev - beforePrev
  perp unit vector = rotate e by +90°: (-ey/|e|, ex/|e|)
  project p onto the line through prev along perp:
    t = dot(p - prev, perp)
    snapped = prev + t * perp
```

First waypoint segment (wps.length < 2) is always free — user sets the initial direction. Ortho fires from the second waypoint onward.

#### `finalize()` function

Called on Enter key. Reads `activeTool` and `waypoints`, routes to the appropriate mutation:
- `building` / `rectangle` → `createBuilding.mutate`
- `room` → `createRoom.mutate`
- `corridor` → `createRoom.mutate` with `type: "hallway"`
- `hallway` → `createHallway.mutate`
- `wall` → `createHallway.mutate` with `surface: "wall"`
- `measure` → toast with haversine distance
- Resets waypoints + switches tool back to `select`

#### Mutations

All mutations use `useMutation` + `apiRequest`. On success they call `qc.invalidateQueries` to refresh the relevant lists. On failure they show a toast. Undo push happens after success.

| Mutation | Endpoint | Undo |
|---|---|---|
| createBuilding | POST /api/buildings | DELETE /api/buildings/:id |
| updateBuilding | PATCH /api/buildings/:id | PATCH back old values |
| deleteBuilding | DELETE /api/buildings/:id | POST to restore |
| createRoom | POST /api/rooms | DELETE /api/rooms/:id |
| updateRoom | PATCH /api/rooms/:id | PATCH back |
| deleteRoom | DELETE /api/rooms/:id | POST to restore |
| createHallway | POST /api/hallways | DELETE /api/hallways/:id |
| deleteHallway | DELETE /api/hallways/:id | POST to restore |
| createDoor | POST /api/doors | DELETE |
| createStair | POST /api/stairs | DELETE |
| createElevator | POST /api/elevators | DELETE |
| createGenericPoi | POST /api/pois | DELETE |

---

### 4.4 Builder sub-components

**`client/src/components/builder/TopToolbar.tsx`**  
The bar across the top. Groups: Back | Save/Undo/Redo | Import/Export/Image | Grid/Snap/Ortho | Zoom/Rotate | Preview/Validate/Publish.  
Publish button flashes green `✓` for 2s after a successful publish (detected by watching `isPublishing` flip `true→false` with no errors).

**`client/src/components/builder/LeftSidebar.tsx`**  
Tabbed panel on the left. Tabs:
- **Buildings** — list with color swatches; click = select
- **Rooms** — search-filtered list (excludes `type="hallway"` corridors)
- **Structure** — corridors + hallways + walls + stairs + elevators + doors + generic POIs. Resizable via drag handle (persisted in localStorage).
- **History** — version list from `/api/map-package/versions`; click to restore
- **Defaults** — `MapSettingsPanel` for map default camera/routing settings

**`client/src/components/builder/PropertyPanel.tsx`**  
Right panel. Shows editable fields for the selected entity. Supports: building, room (including corridor), hallway, door, stair, elevator, generic POI. PATCH mutations on field change.

**`client/src/components/builder/BuilderPois.tsx`**  
Headless. Installs four MapLibre layers (doors circles, stairs amber circles, elevators blue circles, generic POI chips) on the builder map so admins see POI placement without publishing. Filters by `activeFloor`. Click events forwarded via `onSelect` prop.

**`client/src/components/builder/ValidationDrawer.tsx`**  
Slide-in drawer showing the `validateMap()` result. Each issue row is clickable — jumps the map to the offending entity. Error count shows in the toolbar's ShieldCheck icon.

**`client/src/components/builder/StatusBar.tsx`**  
Bottom bar: active tool name, cursor lat/lng, zoom level, bearing, active floor, FPS counter. Updated on every map move event.

**`client/src/components/builder/Minimap.tsx`**  
Small overview map (bottom-right of builder). Shows the full campus with a viewport rectangle that tracks the main map camera.

**`client/src/components/builder/ImageOverlay.tsx`**  
Raster image overlay. Admin imports a PNG/JPG blueprint; it's positioned on the map as a draggable/resizable reference image. Not persisted — session only.

**`client/src/components/builder/ImportExportDialog.tsx`**  
Dialog for importing (JSON / GeoJSON) and exporting the current campus data. Import parses the file client-side and fires the appropriate create mutations. Export downloads a `MapPackage` JSON.

**`client/src/components/builder/SelectionHandles.tsx`**  
Draggable corner handles on the selected building/room polygon. Dragging a handle updates the polygon vertex in real time and fires an `updateBuilding`/`updateRoom` mutation on mouse-up.

**`client/src/components/builder/SvgImportDialog.tsx`**  
Parses an SVG floor-plan file and converts `<path>` / `<rect>` / `<polygon>` elements to `ImportedPolygon[]` that the builder then turns into rooms/buildings via its normal create flow.

---

### 4.5 Shared map components

**`client/src/components/CampusMap.tsx`**  
Pure MapLibre GL wrapper. Props: `darkMode`, `initialCenter`, `initialZoom`, `initialBearing`, `initialPitch`. Exposes a `CampusMapHandle` ref with:
- `.map` — the raw `Map` instance
- `.flyTo(options)` / `.zoomIn()` / `.zoomOut()` / `.rotateCW()` — camera helpers
- `.onReady(cb)` — fires once the style is loaded

Switches basemap tile URL when `darkMode` changes. Does NOT add any campus data layers — callers (`builder.tsx`, `CampusOverlay`) add their own layers.

**`client/src/components/NavigationPanel.tsx`**  
"Get directions" UI. From/to fields with room search autocomplete. Posts to `POST /api/route`, renders the returned `Route` as a polyline on the map (per-floor segments) and a `TurnHint[]` list.

**`client/src/components/FeatureInfoSheet.tsx`**  
Bottom sheet that pops up when the user clicks a building/room on the public map. Shows name, floor, type, description, hours, schedule button, and photo hero.

**`client/src/components/SearchResultsDropdown.tsx`**  
Dropdown below the search bar. Uses `buildRoomSearchIndex` from `@ksyk/shared` client-side; results highlight the match with `<mark>`. Picking a result fires a map flyTo + opens `FeatureInfoSheet`.

**`client/src/components/LayersToggle.tsx`**  
Layer visibility checkboxes (builder only now — removed from public map in v3.33). Writes to localStorage; `CampusOverlay` reads via `readLayerOverrides()`.

**`client/src/components/CompassChip.tsx`**  
Small compass rose that appears when the map bearing drifts from north. Click snaps bearing back to 0°.

**`client/src/components/FeatureHighlight.tsx`**  
Transient highlight effect: adds a pulsing ring around a room/building after the user navigates to it from search.

---

### 4.6 Hooks

**`client/src/hooks/useCampusData.ts`**  
Single source of truth for the public map. Fetches all campus entities from live Firestore endpoints. Previously used a "published-first" strategy (serving the last published snapshot); as of v3.34.0 always reads live data so newly drawn rooms appear immediately without requiring a Publish.

**`client/src/hooks/useAutosave.ts`**  
Saves a `MapPackage` snapshot to `localStorage` every 30 s and optionally to `/api/map-package/draft`. Prevents work loss on crash.

**`client/src/hooks/useUndoStack.ts`**  
Immutable undo/redo stack. Each action is `{ label, undo: () => Promise<void>, redo: () => Promise<void> }`. `⌘Z` pops and calls `undo()`; `⌘⇧Z` calls `redo()`.

**`client/src/hooks/useNavGraph.ts`**  
Local-first navigation graph. Nodes + edges live in `localStorage` (key `ksyk_navgraph`). Exposes `addNode`, `addEdge`, `removeNode`, `removeEdge`, `graph`. The graph renders on the builder map but is not yet synced to the server.

**`client/src/hooks/useAppSettings.ts`**  
Reads from `/api/settings` (Firestore `appSettings` collection). Merges server settings with local overrides. Provides `loadMapDefaultsFromServer()` which seeds `CampusMap`'s initial camera from the admin-configured defaults.

**`client/src/hooks/usePersistedState.ts`**  
`useState` wrapper that reads/writes to `localStorage`.

**`client/src/hooks/useKonamiCode.ts`**  
Listens for the Konami code key sequence; calls the callback when detected.

**`client/src/hooks/useKsykEasterEggs.ts`**  
Registers a set of keyboard shortcuts for hidden easter eggs.

---

### 4.7 Contexts

**`DarkModeContext`** — `darkMode: boolean` + `toggleDarkMode()`. Reads from `localStorage`, applies `dark` class to `<html>`.

**`ThemeContext`** — School brand color (`--school-color` CSS variable). Read from app settings.

**`HelpContext`** — Powers the floating `HelpBubble`. Tracks which help topics the user has seen.

---

### 4.8 Libs / utilities

**`client/src/lib/queryClient.ts`**  
`apiRequest(method, url, body)` — thin wrapper around `fetch` that throws on non-2xx. `fetchList<T>(url)` — safe list fetcher that returns `T[]` on success and `[]` on error (prevents a 404 from spreading through the UI as an uncaught rejection).

**`client/src/lib/changelog.ts`**  
`APP_VERSION` constant + `KSYK_CHANGELOG` array. `APP_VERSION` is bumped on every user-facing release to bust stale PWA/edge caches. Displayed in the admin "About" panel.

**`client/src/lib/navGraph.ts`**  
Re-exports from `useNavGraph` + localStorage helpers.

**`client/src/lib/analytics.ts`**  
Fires pageview + custom events to `/api/telemetry/pageview` and `/api/telemetry/event`. Ad-block resistant (own endpoint, not Vercel Analytics).

**`client/src/lib/telemetry.ts`**  
Boot-time telemetry initialization.

**`client/src/lib/i18n.ts`**  
i18next setup for Finnish/English. Language auto-detected from `navigator.language`.

**`client/src/lib/appSettings.ts`**  
`loadAppSettings()` — fetches app settings from `/api/settings` with a short TTL.

---

## 5. Server

### 5.1 Entry & registration order

**`api/index.ts`** or **`server/index.ts`**  
Creates the Express app, calls `registerRoutes(app)`, starts the HTTP server (or exports as a Vercel function handler).

**`server/routes.ts`** — calls (in order):
1. `setupAuth(app)` — session middleware
2. General API routes (users, buildings, rooms, hallways, floors, doors, stairs, elevators, pois, logs, settings, email, …)
3. `registerWilmaExtendedRoutes(app)`
4. `registerCampusRoutes(app)`
5. `registerMapRoutes(app)` — map-package + routing endpoints
6. `registerEasterEggRoutes(app)`
7. `registerTelemetryRoutes(app)`

**Important:** `registerMapRoutes` is called LAST. Inside `mapRoutes.ts` there are fallback stubs for `/api/doors`, `/api/stairs`, `/api/elevators` — but the real routes registered in step 2 come first and override those stubs.

---

### 5.2 Auth (simpleAuth)

**`server/simpleAuth.ts`**  
Session-cookie auth. Login writes `ksyk_admin_logged_in=true` + `ksyk_admin_user={…}` to `localStorage` on the client. Server validates via `isAuthenticated` middleware that checks `req.session.user`.

Roles: `admin` (full access), `owner` (can create/edit everything), `editor` (limited). The builder UI allows any of these three roles. Some server endpoints have overly strict `role === 'admin'` checks — a known bug.

Password storage: bcrypt hashes (`$2b$…`). Legacy plaintext passwords are auto-migrated to bcrypt on first successful login.

---

### 5.3 routes.ts — general API

Key campus-data endpoints:

**Buildings:**
- `GET /api/buildings` — list all active buildings (Firestore)
- `POST /api/buildings` — create; body validated by `insertBuildingSchema`; supports `points` array
- `PATCH /api/buildings/:id` — update fields
- `DELETE /api/buildings/:id` — soft-delete (`isActive = false`)

**Rooms:**
- `GET /api/rooms` — list all active rooms (includes corridors with `type="hallway"`)
- `POST /api/rooms` — create; supports `type`, `points`, `colorCode`
- `PATCH /api/rooms/:id` — update
- `DELETE /api/rooms/:id` — soft-delete

**Hallways:**
- `GET /api/hallways` — list all active hallways
- `POST /api/hallways` — create; supports `points` polyline, `surface`
- `DELETE /api/hallways/:id` — soft-delete

**Point POIs** (registered via `registerPoiRoutes`):
- `GET /api/doors` / `POST /api/doors` / `DELETE /api/doors/:id`
- `GET /api/stairs` / `POST /api/stairs` / `DELETE /api/stairs/:id`
- `GET /api/elevators` / `POST /api/elevators` / `DELETE /api/elevators/:id`

**Generic POIs:**
- `GET /api/pois` — list campus_pois
- `POST /api/pois` — create with `kind`, `position`, `floor`, `label`
- `DELETE /api/pois/:id`

**Admin:**
- `POST /api/login` — sets session
- `POST /api/logout`
- `GET /api/users` / `POST /api/users` / `PATCH /api/users/:id` / `DELETE /api/users/:id`
- `GET /api/settings` / `PATCH /api/settings`
- `POST /api/logs` — client-side error sink

---

### 5.4 mapRoutes.ts — map & routing API

**`GET /api/map-defaults`** — returns the admin-configured `MapDefaults` (center, zoom, routing profile defaults, etc.)  
**`PATCH /api/map-defaults`** — admin only; updates defaults in Firestore

**`GET /api/map-package/published`** — returns the latest published `MapPackage` snapshot from Firestore `mapPackages/published`. Returns `404` if nothing has been published yet.

**`POST /api/map-package/publish`** — admin only. Calls `loadCampusData()` (reads all live tables), bundles into a `MapPackage`, saves to Firestore `mapPackages/{versionId}`, and updates `mapPackages/published` to point to it.

**`GET /api/map-package/versions`** — lists all published versions (for History tab).

**`POST /api/route`** — body: `{ from, to, profile? }`. Calls `loadCampusData()`, calls `buildNavGraph(data)` from `@ksyk/routing`, then `findPath()` or `findPathDijkstra()`. Returns a `Route` with per-floor segments. Profile options: `walking` (default), `wheelchair`, `fast`.

**`GET /api/nav-graph`** — returns the prebuilt nav-graph (nodes + edges derived from live campus data).

**Input validation:** All mutation endpoints validate with Zod schemas (`RouteRequestSchema`, `PublishRequestSchema`, etc.) before touching Firestore.

---

### 5.5 firebaseStorage.ts — Firestore adapter

Implements the `IStorage` interface. Every method reads/writes to Firebase Firestore.

**Initialization:** Tries `FIREBASE_SERVICE_ACCOUNT` env var (Vercel), then falls back to `serviceAccountKey.json` (local dev). The `.js` extension on the `hashPasswordFieldsInPlace` import is required for Vercel's ESM runtime.

**Key methods:**

| Method | Collection | Notes |
|---|---|---|
| `getBuildings()` | buildings | Filters `isActive === true` |
| `createBuilding(data)` | buildings | Stores with `isActive: true`, `points` as-is |
| `updateBuilding(id, data)` | buildings | Partial update |
| `deleteBuilding(id)` | buildings | Sets `isActive: false` |
| `getRooms()` | rooms | Filters `isActive === true` |
| `createRoom(data)` | rooms | Includes `type`, `points`, `colorCode` |
| `getHallways()` | hallways | Filters `isActive === true` |
| `createHallway(data)` | hallways | Stores `points`, `surface` |
| `getDoors()` | doors | All doors |
| `createDoor(data)` | doors | Position, connects, isEntrance |
| `getStairs()` | stairs | All stairs |
| `createStair(data)` | stairs | Position, floors, accessible |
| `getElevators()` | elevators | All elevators |
| `getFloors(buildingId?)` | floors | Optional building filter |
| `getPois()` | campus_pois | Generic POIs |
| `createPoi(data)` | campus_pois | kind, position, floor, label |

---

### 5.6 Other server files

**`server/campusRoutes.ts`** — Additional campus routes (outdoor areas, custom layers, etc.)

**`server/easterEggRoutes.ts`** — Secret easter egg endpoints.

**`server/telemetryRoutes.ts`** — `POST /api/telemetry/pageview` and `/api/telemetry/event`. Stores in Firestore `telemetry` collection. Used instead of Vercel Analytics (ad-block resistant).

**`server/wilmaExtendedRoutes.ts`** — Wilma student portal proxy routes (moved out of the main bundle).

**`server/emailService.ts`** — Transactional email via SMTP. `sendPasswordSetupEmail(to, tempPw)`, `sendTicketEmail(…)`, `generateTempPassword()`.

**`server/rateLimiter.ts`** — Express rate-limiter instances: login (5/min), general API (200/min), etc.

**`server/passwordUtils.ts`** — `hashPasswordFieldsInPlace` — strips plaintext password fields before logging.

**`server/storage.ts`** — The `IStorage` interface. `firebaseStorage.ts` implements it. This abstraction means swapping backends requires only changing which class `storage` points to.

---

## 6. Shared packages

### 6.1 @ksyk/shared

**`packages/shared/src/types/index.ts`** — All domain types: `Building`, `Room`, `Hallway`, `Door`, `Stair`, `Elevator`, `Floor`, `MapPackage`, `NavGraphNode`, `NavGraphEdge`, `MapDefaults`, `MapTheme`, `LatLng`, `Polygon`, `BBox`, `RoomType`, `OutdoorAreaType`, etc.

**`packages/shared/src/validation/index.ts`** — `validateMap(input): ValidationResult`. Checks:
- Duplicate IDs per entity kind
- Polygons with < 3 vertices or consecutive duplicate vertices
- Overlapping building bounding boxes
- Rooms referencing unknown buildings
- Rooms with no doors (warning when doors table is non-empty)
- Rooms referencing non-existent floor records
- Stairs reaching < 2 floors
- Elevators with empty floor lists or `accessible = false`
- Doors with missing/malformed `connects`, unknown references, or > 30m from room centroid

**`packages/shared/src/search/rooms.ts`** — `buildRoomSearchIndex(rooms, buildings)` — builds a client-side inverted index for fast fuzzy room search. Used by the search bar and the left sidebar.

**`packages/shared/src/geo/index.ts`** — `haversineMeters(a, b)`, `polygonCentroid(poly)`, `polygonBounds(poly)`, `bboxOverlaps(a, b)`.

**`packages/shared/src/spatial/index.ts`** — Spatial helpers (nearest point on segment, etc.).

**`packages/shared/src/poi/categories.ts`** — `resolveCategoryStyle(kind)` — returns `{ color, icon, label }` for a POI kind. Used by CampusOverlay to paint POI chips.

**`packages/shared/src/io/geojson.ts`** — `buildingToGeoJSON(b)`, `roomToGeoJSON(r)`, `hallwayToGeoJSON(h)` — convert domain entities to GeoJSON Features.

**`packages/shared/src/schema/index.ts`** — Re-exports Drizzle/Zod schemas from `shared/schema.ts` (server-side only).

---

### 6.2 @ksyk/routing

**`packages/routing/src/index.ts`**

Exports:
- `buildGraph(nodes, edges): NavGraph` — builds adjacency map from flat lists
- `findPath(graph, fromId, toId, profile?): Route | null` — A* with Haversine heuristic + binary-heap priority queue
- `findPathDijkstra(graph, fromId, toId, profile?): Route | null` — Dijkstra (no heuristic, used when profiles heavily distort weights)
- `buildNavGraph(campusData): NavGraph` — auto-builds graph from buildings/rooms/hallways/doors/stairs/elevators
- `annotateRoute(route): TurnHint[]` — generates turn-by-turn instructions (start, arrive, left/right/floor transitions)

**Routing profiles:**
- `PROFILE_DEFAULT` — 1.35 m/s, stair ×1.5, elevator ×2.0
- `PROFILE_WHEELCHAIR` — 1.0 m/s, stair ×999 (avoid), elevator ×1.2, `accessibleOnly: true`
- `PROFILE_FAST` — 1.7 m/s, no restrictions

**Edge weight:** `distance × stairMult × elevatorMult × outdoorMult`. Inaccessible edges return `Infinity` for wheelchair profile.

**`packages/routing/src/build.ts`** — `buildNavGraph` implementation. Creates nodes at every room centroid, hallway waypoint, door position, stair position, elevator position. Connects rooms → doors, doors → hallways, hallways → adjacent hallways, stairs/elevators → floors they serve.

---

### 6.3 @ksyk/renderer (stub)

`packages/renderer/src/` — Stub only. The intention is a standalone render engine (Three.js or pure WebGL) that could work independently of MapLibre. Currently exports empty adapters. All rendering is done via MapLibre layers in `CampusOverlay.tsx`.

---

## 7. API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/buildings` | public | List all active buildings |
| POST | `/api/buildings` | admin/owner/editor | Create building |
| PATCH | `/api/buildings/:id` | admin/owner/editor | Update building |
| DELETE | `/api/buildings/:id` | admin/owner/editor | Soft-delete building |
| GET | `/api/rooms` | public | List all active rooms (incl. corridors) |
| POST | `/api/rooms` | admin/owner/editor | Create room |
| PATCH | `/api/rooms/:id` | admin/owner/editor | Update room |
| DELETE | `/api/rooms/:id` | admin/owner/editor | Soft-delete room |
| GET | `/api/hallways` | public | List all active hallways |
| POST | `/api/hallways` | admin | Create hallway ⚠️ admin-only bug |
| DELETE | `/api/hallways/:id` | admin | Soft-delete hallway |
| GET | `/api/doors` | public | List all doors |
| POST | `/api/doors` | admin/owner/editor | Create door |
| DELETE | `/api/doors/:id` | admin/owner/editor | Delete door |
| GET | `/api/stairs` | public | List all stairs |
| POST | `/api/stairs` | admin/owner/editor | Create stair |
| DELETE | `/api/stairs/:id` | admin/owner/editor | Delete stair |
| GET | `/api/elevators` | public | List all elevators |
| POST | `/api/elevators` | admin/owner/editor | Create elevator |
| DELETE | `/api/elevators/:id` | admin/owner/editor | Delete elevator |
| GET | `/api/pois` | public | List generic POIs |
| POST | `/api/pois` | admin/owner/editor | Create generic POI |
| DELETE | `/api/pois/:id` | admin/owner/editor | Delete generic POI |
| GET | `/api/floors` | public | List floors |
| POST | `/api/floors` | admin | Create floor |
| GET | `/api/map-defaults` | public | Map camera/routing defaults |
| PATCH | `/api/map-defaults` | admin | Update defaults |
| GET | `/api/map-package/published` | public | Latest published snapshot |
| POST | `/api/map-package/publish` | admin | Publish current live data |
| GET | `/api/map-package/versions` | admin | Version history |
| POST | `/api/route` | public | Compute indoor route |
| GET | `/api/nav-graph` | public | Raw nav-graph nodes+edges |
| POST | `/api/login` | — | Authenticate |
| POST | `/api/logout` | — | End session |
| GET | `/api/settings` | public | App settings |
| PATCH | `/api/settings` | admin | Update settings |
| POST | `/api/logs` | public | Client error sink |
| POST | `/api/telemetry/pageview` | public | Pageview event |
| POST | `/api/telemetry/event` | public | Custom event |

---

## 8. Data flow: public map

```
User opens /
  → KSYKMapsHome → KSYKMapView
  → useCampusData()
       → GET /api/buildings     (live Firestore)
       → GET /api/rooms         (live Firestore)
       → GET /api/hallways      (live Firestore)
       → GET /api/doors         (live Firestore)
       → GET /api/stairs        (live Firestore)
       → GET /api/elevators     (live Firestore)
       → GET /api/pois          (live Firestore)
  → CampusOverlay receives data, installs GeoJSON layers on MapLibre
  → User sees buildings + rooms + hallways on map
  → User clicks room → FeatureInfoSheet opens
  → User types in search → buildRoomSearchIndex → SearchResultsDropdown
  → User requests route → POST /api/route → NavigationPanel draws polyline
```

Refetch interval: 60 s for live queries. The map always reflects the latest Firestore state within one minute.

---

## 9. Data flow: Builder

```
Admin opens /builder
  → BuilderPage checks localStorage auth (role = admin|owner|editor)
  → BuilderWorkspace mounts
  → CampusMap creates MapLibre instance
  → useQuery: buildings, rooms, hallways, doors, stairs, elevators, pois, floors
  → Effects install GeoJSON layers for everything above
  → Admin selects tool (e.g. Room)
  → Clicks 4+ corners on the map
  → Ghost preview draws dashed line following cursor
  → Ortho constraint applied client-side if enabled
  → Admin presses Enter
  → finalize() fires createRoom.mutate({ ..., points })
  → POST /api/rooms → Firestore
  → queryClient.invalidateQueries(["/api/rooms"])
  → roomsQ refetches → GeoJSON source updated → room appears on map
```

---

## 10. Publish flow

```
Admin clicks Publish in TopToolbar
  → POST /api/map-package/publish
      → loadCampusData() fetches all live tables
      → Bundles into MapPackage
      → Saves to Firestore mapPackages/{versionId}
      → Updates mapPackages/published pointer
  → Public map's useCampusData reads /api/map-package/published
    (NOTE: as of v3.34.0 this is BYPASSED — public map always uses live data)
  → Version logged in History tab
```

**Current state:** Publish still runs and saves a snapshot, but the public map no longer reads from it. The snapshot is kept for future "diff vs. published" features and the History tab. Effectively, live data = what public sees at all times.

---

## 11. Auth flow

```
Admin opens /admin
  → AdminLogin component renders
  → POST /api/login { username, password }
      → Server: verifyPassword(plain, stored) — bcrypt or legacy plaintext
      → On success: sets req.session.user
      → Client: writes localStorage ksyk_admin_logged_in + ksyk_admin_user
  → AdminDashboard mounts, checks localStorage + session
  → All subsequent API calls include session cookie
  → isAuthenticated middleware validates req.session.user before each mutation
```

Session expiry is disabled (`sessionTimeoutMiddleware` is a no-op). Sessions persist until explicit logout or cookie expiry.

---

## 12. DONE — completed features

### Core map rendering
- [x] MapLibre GL JS basemap (CARTO Voyager light + CARTO Dark Matter dark)
- [x] Building footprints as GeoJSON fill + outline layers
- [x] Room polygons as GeoJSON fill (filtered by active floor)
- [x] Hallway/corridor paths as GeoJSON line layers
- [x] Wall segments as separate line layer with distinct color
- [x] 3D building extrusion with per-floor slabs
- [x] 3D room extrusion inside buildings
- [x] Stair / elevator 3D towers
- [x] Fake ambient occlusion rings at building bases
- [x] Entrance glow rings
- [x] Sky layer (3D mode)
- [x] Dark / light mode basemap switching
- [x] Floor selector (drives activeFloor filter)
- [x] Floor sync to URL `?floor=` param (shareable links)
- [x] Per-floor room filtering with ghost opacity for off-floor rooms

### Builder
- [x] Building polygon tool (B)
- [x] Rectangle shortcut (two-click building)
- [x] Room polygon tool (R)
- [x] Corridor polygon tool (C) — stored as `type="hallway"` room
- [x] Hallway path tool (H) — multi-vertex LineString
- [x] Wall path tool (W) — hallway with `surface="wall"`
- [x] Measure tool (M) — haversine distance between two clicks
- [x] Select tool (V) — click to select, shift-click multi-select
- [x] Snap to vertex / midpoint / endpoint
- [x] Grid overlay
- [x] Ortho constraint (perpendicular to previous edge) — FIXED v3.34.0
- [x] Ghost preview line (cursor → last waypoint)
- [x] Point POI tools (doors, stairs, elevators, info, parking, etc.)
- [x] Door auto-snap to nearest wall ≤ 3m
- [x] ⌘Z / ⌘⇧Z undo/redo
- [x] Autosave to localStorage (30s)
- [x] Import JSON / GeoJSON
- [x] Export to JSON
- [x] SVG floor-plan import
- [x] Reference image overlay (PNG/JPG)
- [x] Multi-selection (shift-click, set of ids per kind)
- [x] Selection handles (drag corners to reshape polygon)
- [x] Context menu (right-click → delete / duplicate)
- [x] Keyboard shortcuts panel (?)
- [x] Minimap (overview in bottom-right)
- [x] PropertyPanel (editable fields for selected entity)
- [x] ValidationDrawer (shows `validateMap()` results, jump to issue)
- [x] Publish button with success flash
- [x] History tab (version list, restore)
- [x] Defaults / map settings panel

### Left sidebar
- [x] Buildings tab with color swatches
- [x] Rooms tab (excludes corridors)
- [x] Structure tab (corridors, paths, walls, stairs, elevators, doors, POIs with filter chips)
- [x] History tab
- [x] Defaults tab
- [x] Drag-to-resize sidebar (persisted in localStorage)
- [x] Room search (indexed, debounced 120ms)

### BuilderPois
- [x] Doors rendered as circles on builder map
- [x] Stairs as amber circles
- [x] Elevators as blue circles
- [x] Generic POIs as chips with emoji
- [x] Floor filter on all POI layers

### Navigation / routing
- [x] `@ksyk/routing` package with A* and Dijkstra
- [x] Three routing profiles (walking, wheelchair, fast)
- [x] Turn-by-turn `annotateRoute()` with floor transition hints
- [x] `POST /api/route` endpoint
- [x] NavigationPanel UI with from/to search + route polyline
- [x] Per-floor route segments (floor picker animation)
- [x] Local nav-graph editor (node + connect tools, localStorage)

### Validation
- [x] Duplicate ID checks
- [x] Polygon validity (< 3 vertices, duplicate consecutive vertices)
- [x] Building overlap warnings
- [x] Orphan room errors
- [x] Floor reference errors
- [x] Stair / elevator floor checks
- [x] Door wiring checks

### Search
- [x] Client-side inverted index for rooms
- [x] Search autocomplete dropdown
- [x] Room highlight after navigation

### Public map UX
- [x] FeatureInfoSheet (room/building info on click)
- [x] Search with result highlighting
- [x] Zoom in/out buttons
- [x] 3D toggle (persisted)
- [x] Compass chip (tap to reset north)
- [x] Floor selector
- [x] CookieConsent banner
- [x] Command palette (⌘K)
- [x] Dark mode
- [x] Accessibility: large-text + high-contrast CSS classes
- [x] HSL timetable page
- [x] Lunch menu page
- [x] Maintenance mode (admin-configurable)

### Server / backend
- [x] Full Firestore CRUD for all entity kinds
- [x] bcrypt password hashing + legacy migration on login
- [x] Session-cookie auth with role checks
- [x] Map package publish + versioning
- [x] Rate limiting (login 5/min, API 200/min)
- [x] Client error log sink (`POST /api/logs`)
- [x] Ad-block-resistant telemetry (`/api/telemetry/*`)
- [x] Transactional email (password setup, tickets)
- [x] Admin dashboard (users, settings, announcements, logs)
- [x] Changelog in admin About panel

---

## 13. TODO — open work

### High priority (bugs / correctness)

- [ ] **Auth restriction on hallway/room routes**: `POST /api/hallways` and `POST /api/rooms` in `routes.ts` have `role === 'admin'` guards, but the builder allows `owner` and `editor` roles too. Owner/editor users get a `403` when trying to draw hallways. **Fix:** Change the guard to `["admin","owner","editor"].includes(user.role)`.

- [ ] **Door `connects` wiring**: Doors created via the POI tool are placed on the map but `connects: []` (empty) — they don't link any room to any hallway. The router can't traverse them. **Fix needed:** After placing a door, automatically or manually wire it to the nearest room + hallway (or provide a "connect door" editor in PropertyPanel).

- [ ] **Nav-graph server sync**: The navigation graph (`useNavGraph`) lives entirely in `localStorage`. It doesn't persist to the server and disappears on a new device or after clearing storage. **Fix:** Add `GET/POST /api/nav-graph` endpoints (stubs exist in mapRoutes but aren't wired up) and sync on every add/remove.

- [ ] **Corridor polygon rendering in public map**: Corridors (`type="hallway"` rooms) are drawn in the builder but don't have a dedicated color/style in `CampusOverlay` — they render identically to regular rooms. **Fix:** In `installRooms()`, apply a different fill color for `type === "hallway"` so corridors look like walkable areas, not enclosed rooms.

- [ ] **Existing hallways identified as rooms in DB**: Some corridors drawn in older versions may be stored without `type: "hallway"`. They show in the Rooms tab and are invisible in the Structure tab. **Fix:** Write a one-time Firestore migration script that sets `type = "hallway"` on any room with `colorCode === "#94a3b8"` and no room number, or give admin a "reclassify" button.

### Medium priority (missing features)

- [ ] **Per-floor building polygons**: The `Building` type has one `points` polygon for all floors. Large buildings like L-shaped wings may have different footprints on different floors. **Fix:** Add `floorPolygons?: Array<{ floor: number; points: Polygon }>` to the `Building` type, add a "per-floor footprint" editor in the builder's PropertyPanel, and update `CampusOverlay` to render the correct polygon when a specific floor is active.

- [ ] **Door editor in PropertyPanel**: When a door is selected, the PropertyPanel should show fields to set `connects[0]` and `connects[1]` (pick room/hallway from dropdown), `widthMeters`, `accessible`, `swing`, `locked`. Currently the door selection just shows id + position.

- [ ] **Hallway `PATCH` endpoint**: There is no `PATCH /api/hallways/:id` route — you can create or delete but not update (e.g. change `surface`, `width`, `floor`). PropertyPanel's hallway editor silently fails on save.

- [ ] **Floor management UI**: Floors exist in Firestore but there's no UI to create/edit them from the builder. The floor selector derives floor range from `building.floorMin/.floorMax` (defaults to 1 if unset) instead of reading the actual `floors` table. **Fix:** Add a "Manage floors" section to the building PropertyPanel or a dedicated dialog.

- [ ] **3D wall extrusions from corridor polygons**: Corridor polygons (`type="hallway"` rooms) could extrude as the corridor floor slab in 3D mode to give spatial depth. Currently they are 2D fills only.

- [ ] **Outdoor areas**: The `OutdoorArea` type and GeoJSON converter exist but there's no builder tool to draw them, no storage route, and no renderer layer. Parking lots, bike racks, bus stops are not mappable.

- [ ] **Room availability / booking integration**: `Room.availabilityId` and `Room.scheduleUrl` fields exist. `FeatureInfoSheet` renders a schedule button when `scheduleUrl` is set. The actual availability API (Wilma or equivalent) is not connected.

- [ ] **Indoor positioning / blue dot**: No user location tracking. When a user enables GPS, the position could be projected onto the indoor floor plan if the campus has BLE beacon data. `BeaconSurveyor.tsx` is a stub for this.

- [ ] **Multi-building route**: The router builds a graph from all campus data, but the `NavigationPanel` only lets the user pick rooms inside one building. Cross-building routing (via outdoor paths) requires outdoor area nodes in the nav-graph.

- [ ] **Search: buildings and POIs**: The search index currently covers rooms only. Buildings and generic POIs should also appear in results.

- [ ] **Mobile builder**: The builder is desktop-only. The toolbox assumes mouse precision for polygon drawing. A touch-first builder mode (tap to place points, pinch to zoom) is not implemented.

- [ ] **Layer visibility controls (public map)**: `LayersToggle` was removed from the public map in v3.33. Users can't toggle individual element types (hide walls, show only stairs, etc.). Needs a public-facing layer control that doesn't confuse casual users.

- [ ] **"Viewing published" badge**: `useCampusData` has a `source: "published" | "live" | "loading"` field but no UI reads it. A small badge showing "Live data" or "Published snapshot" would help admins understand which version they're seeing.

- [ ] **Publish diff view**: The History tab shows a list of published versions but doesn't diff them. Admins can't see what changed between v1 and v2 of the map.

- [ ] **Image overlay persistence**: Reference images (PNG/JPG blueprints) loaded via the builder are session-only — they disappear on reload. Storing them in Firebase Storage with a URL reference on the building record would make them persistent.

### Low priority / polish

- [ ] **i18n completeness**: Finnish translations (`titleFi`, `highlightsFi`) exist in the changelog but most UI strings are English-only. The `i18n.ts` file sets up i18next but the translation files are sparse.
- [ ] **`@ksyk/renderer` package**: Currently a stub. Implementing a standalone WebGL renderer would decouple the app from MapLibre and enable embedding the map in non-browser environments.
- [ ] **Nav-graph auto-build quality**: `buildNavGraph` creates nodes at room centroids, but centroids of L-shaped rooms land in the wrong place. Rooms should register entry nodes at door positions, not centroids.
- [ ] **Validation: room inside building check**: No check that a room polygon is geometrically inside its building polygon. A room drawn outside the building renders fine but is logically wrong.
- [ ] **Keyboard shortcut for ortho**: Ortho has no hotkey — only the toolbar button. Adding `O` would improve workflow.
- [ ] **Snap to grid**: Grid overlay exists but snap-to-grid doesn't constrain clicks to grid intersections. Grid is purely visual.
- [ ] **TypeScript strictness**: Several pre-existing TS errors in non-map components (`AdminHomeworkManager`, `CampusThreeDView`, etc.). `tsconfig` has strict mode enabled but errors are accumulating.
- [ ] **Test coverage**: No unit tests, no integration tests. The validator (`validateMap`) is pure and would be straightforward to test. The routing algorithms (`findPath`, `annotateRoute`) are also pure.
- [ ] **PWA offline**: `manifest.json` and a service worker exist but the offline cache strategy is minimal — the public map doesn't work without network.
- [ ] **Performance: large rooms datasets**: Above ~500 rooms, MapLibre re-renders the `builder-rooms` GeoJSON source on every keystroke in PropertyPanel (because any state change causes the rooms effect to re-run). A `useCallback`-memoized GeoJSON builder would avoid unnecessary `setData` calls.
