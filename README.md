# KSYK Maps

<div align="center">
  <img src="client/public/KSYK-logo-desktop.png" alt="KSYK Logo" width="160"/>

  **Campus navigation for Kulosaaren Yhteiskoulu**

  [![Version](https://img.shields.io/badge/version-3.96.0-blue.svg)](https://github.com/JuusoJuusto/ksyk-maps)
  [![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
  [![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-5.x-green)](https://maplibre.org/)
</div>

---

## Overview

KSYK Maps is an interactive campus navigation app for Kulosaaren Yhteiskoulu (KSYK). It renders a live floor plan of the school's buildings, lets students search for rooms and POIs, and shows lunch menus and public transport times — all in a MazeMap-style interface.

**Live:** [ksykmaps.vercel.app](https://ksykmaps.vercel.app)

---

## Features

### Campus map
- MapLibre GL vector map with OSM basemap
- Building footprints, room polygons, corridor lines, and wall outlines
- Multi-floor selector — switch floors, rooms filter per floor
- 3D mode — extruded hollow building shells, room slabs, stair/elevator towers
- MazeMap-style entrance balloon pins (green) and door pins (dark)
- POI chips: WC, stairs, elevator, info, café, first aid, bike parking, etc.
- Room search with live dropdown — supports Finnish and English names
- Click a room to see its name, number, and floor
- Directions panel (A* routing between rooms)
- Compass chip — auto-shows when map is rotated, click to reset north
- GPS location dot (admin only — campus map tab in admin panel)

### Header & navigation
- Two-row header: logo/controls row + full-width search bar below
- Hamburger menu on mobile with theme and language controls
- Language toggle (Finnish / English) — saved to localStorage, map labels update
- Dark mode, light mode, system mode

### Lunch menu
- Fetches and displays the school's weekly lunch menu

### HSL transport
- Nearby bus/metro departures from the HSL API

### Admin & Builder
- Builder canvas to draw rooms, walls, corridors, POIs, doors, stairs, elevators
- Publish campus snapshot — live map reflects published data within 60 s
- Admin panel: user management, analytics, security settings, layer visibility

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Maps | MapLibre GL 5.x, OSM basemap (demotiles) |
| Backend | Express.js, Node.js |
| Database | Firebase Firestore + PostgreSQL (Drizzle ORM) |
| Auth | Firebase Auth |
| AI | Google Gemini |
| Deployment | Vercel (serverless) |
| i18n | react-i18next (fi / en) |

---

## Project structure

```
ksyk-maps/
├── client/
│   └── src/
│       ├── components/
│       │   ├── CampusOverlay.tsx   # MapLibre layer installer (rooms, POIs, walls)
│       │   ├── CampusMap.tsx       # MapLibre map wrapper
│       │   ├── KSYKMapView.tsx     # Map chrome (floor selector, zoom, 3D, search)
│       │   ├── Header.tsx          # Top nav + search row
│       │   └── ...
│       ├── pages/                  # Route pages (map, lunch, hsl, admin, builder)
│       ├── hooks/                  # useCampusData, useAppSettings, useAuth …
│       └── lib/
│           ├── changelog.ts        # APP_VERSION + in-app changelog entries
│           └── analytics.ts        # Feature-use telemetry
├── server/
│   ├── routes.ts                   # REST API
│   └── firebaseStorage.ts          # Firestore helpers
├── shared/                         # Types shared between client and server
├── api/                            # Vercel serverless function entry points
└── DEPLOY_TRIGGER.txt              # Bumped on every release to force Vercel rebuild
```

---

## POI system

Doors and entrances are rendered through dedicated layers (`campus-doors-*` / `campus-entrances-*`) — balloon pin style matching MazeMap. Generic POIs (WC, info, café, etc.) go through `campus-pois-chip` + `campus-pois-icon` + tail.

The two systems are **intentionally separate**: adding a door as a generic POI in `campus_pois` will be ignored by the renderer to avoid duplicate pins.

---

## Releasing

1. Bump `APP_VERSION` in `client/src/lib/changelog.ts` and add a changelog entry
2. Update `DEPLOY_TRIGGER.txt` with the new version and a new timestamp
3. Commit on `dev`, merge to `main`, push — Vercel autodeploys

---

## License

Proprietary — all rights reserved by Nordbyte Studio / Juuso Kaikula.
No copying, modification, or redistribution without explicit written permission.

Copyright © 2024–2026 Nordbyte Studio.

---

## Contact

- Lead developer: Juuso Kaikula
- Email: juusojuusto112@gmail.com
- Discord: https://discord.gg/5ERZp9gUpr
