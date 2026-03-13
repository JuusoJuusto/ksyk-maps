# Changelog

All notable changes to KSYK Maps will be documented in this file.

## [2.15.0] - 2026-02-09

### Added
- Lunch menu page with RSS feed integration from Compass Group
- Real-time weekly lunch menu display with today's menu highlighted
- Vegetarian and regular lunch options with allergen information
- Lunch button in header (orange with 🍽️ emoji) next to HSL button
- Automatic today detection and highlighting in menu
- Refresh button to reload menu data
- Bilingual support (Finnish/English) for lunch menu
- Beautiful card-based layout with color-coded days

### Technical
- RSS feed parser for Compass Group menu API
- XML parsing with DOMParser
- Responsive grid layout for weekly menu
- Error handling and loading states

## [2.14.0] - 2026-02-09

### Fixed
- KSYK Builder now has fully interactive map canvas
- Click-to-add functionality for buildings, rooms, hallways
- Enhanced zoom controls (Ctrl+Scroll, buttons)
- Pan functionality (Shift+Drag, Right-click)
- Grid snapping system
- Rectangle and custom shape drawing modes
- Real-time shape preview while drawing
- 3D building rendering with shadows and gradients

### Improved
- Builder sidebar layout with 320px fixed width
- Map canvas takes full remaining space
- Better visual feedback for drawing operations
- Enhanced building and room rendering
- Mini-map navigator for orientation

## [2.10.1] - 2026-02-09

### Changed
- Removed all gradient colors from UI (solid colors only)
- KSYK Maps logo: solid blue (#3B82F6), font-black weight
- Get Directions button: solid blue background
- Navigation modal: solid backgrounds
- Settings panel: solid backgrounds
- StudiOWL button: solid orange background

### Updated
- Version info: 2.10.1
- Release date: February 9, 2026
- StudiOWL URL: studiowl.vercel.app

## [2.9.0] - 2026-02-09

### Added
- Enhanced navigation system with A* pathfinding algorithm
- Distance-based routing between rooms
- Visual route display with animated blue path
- Step-by-step directions with icons (📍🚶🪜🛗🎯)
- Estimated time and distance calculation
- Google Maps-style popup with A/B markers
- Active route indicator bar
- Error handling with clear messages

### Improved
- Navigation modal UI with better layout
- Route preview with detailed information
- Better mobile responsiveness

## [2.8.0] - 2026-02-09

### Added
- Ultimate KSYK Builder with full map canvas
- Interactive map editor with click-to-add functionality
- Building, room, hallway, stairway, and door tools
- Rectangle and custom shape drawing modes
- Grid snapping system (toggle with 'S' key)
- Zoom controls (Ctrl+Scroll, buttons)
- Pan functionality (Shift+Drag, Right-click drag)
- Mini-map navigator
- Real-time shape preview
- 3D building rendering with shadows
- Floor indicators on buildings
- Copy/paste buildings (Ctrl+C, Ctrl+V)
- Delete buildings (Delete key)
- Enhanced visual feedback

### Technical
- SVG-based map canvas with viewBox
- Framer Motion animations
- React Query for data management
- Custom shape serialization in JSON

## [2.7.0] - 2026-02-09

### Fixed
- Builder tab correctly placed in Admin Panel (not front page)
- Builder accessible only to admin users
- Full UltimateKSYKBuilder component in admin panel

### Clarified
- Builder location: Admin Panel → 3rd tab (between Users and Buildings)
- Access: Login as admin → Admin Panel → Builder tab

## [2.6.0] - 2026-02-09

### Improved
- Tab buttons (Map, Schedule, Settings) with larger size
- Bigger icons (h-5 w-5)
- Better spacing (px-4 py-3)
- Rounded corners
- Active state with blue background
- Hover effects
- Improved backdrop blur
- Better shadow
- Semibold font weight

## [2.5.0] - 2026-02-09

### Added
- Database cleanup script for rooms and hallways
- Removed 75 rooms and 1 hallway (76 items total)
- New command: `npm run clean:rooms`

### Technical
- Created `server/cleanRoomsAndHallways.ts`
- Batch deletion with transaction support

## [2.4.0] - 2026-02-09

### Added
- `canLoginToKsykMaps` boolean field to user schema (default: true)
- Login permission check for StudiOWL integration
- Users with `canLoginToKsykMaps: false` cannot login
- StudiOWL accounts can login if they have permission

### Technical
- Updated `shared/schema.ts` with new field
- Modified login route in `server/routes.ts`

## [2.3.0] - 2026-02-09

### Fixed
- Owner login credentials hardcoded in `server/routes.ts`
- Owner user created in Firebase with script
- Owner credentials: juusojuusto112@gmail.com / Juusto2012!

### Added
- `server/createOwnerNow.ts` script
- `npm run create:owner` command

## [2.2.0] - 2026-02-09

### Improved
- Announcement banner redesigned with solid orange background
- Entire banner clickable
- Auto-scroll every 10 seconds
- Inline controls: Pause/Play, Previous/Next, Counter, Close
- Visible on both mobile and desktop
- Reduced height with smaller padding
- Fixed dialog close button positioning

### Fixed
- Dialog now outside clickable div to prevent conflicts

## [2.1.0] - 2026-02-09

### Improved
- Mobile sidebar height reduced from 75vh to 55vh
- Better map visibility on mobile
- Sidebar scrollable with overflow-y-auto
- Toggle button positioning adjusted
- PC sidebar full height with md:max-h-full
- Map controls at top-4 right-4
- Version Info and Ticket System buttons at bottom-right
- Z-index hierarchy: Banner (60), Header (55), Toggle (45), Sidebar (40), Buttons (30), Controls (20)

### Fixed
- Mobile menu button functionality
- Announcement banner overlapping with header

## [2.0.0] - 2026-02-09

### Changed - MAJOR REBRAND
- Rebranded from "OWL Apps" to "StudiOWL"
- Updated all references throughout codebase
- Changed URLs from owlapps.vercel.app to studiowl.vercel.app
- Updated branding in:
  - Page titles and headers
  - Footers and copyright notices
  - Package.json
  - License file
  - All component references

### Added
- Rebrand announcement in Firebase (30-day duration)
- Script to add rebrand announcement: `server/addRebrandAnnouncement.ts`

### Technical
- Version bumped to 2.0.0 for major rebrand
- Copyright updated to 2026
- License remains proprietary (UNLICENSED)

---

## Version History Summary

- 2.15.0: Lunch menu integration
- 2.14.0: KSYK Builder interactive map fixes
- 2.10.1: Removed gradients, solid colors only
- 2.9.0: Enhanced navigation with A* pathfinding
- 2.8.0: Ultimate KSYK Builder with full map canvas
- 2.7.0: Builder location fix (Admin Panel)
- 2.6.0: Improved tab buttons
- 2.5.0: Database cleanup
- 2.4.0: StudiOWL integration with login permissions
- 2.3.0: Owner login fix
- 2.2.0: Announcement banner redesign
- 2.1.0: Mobile UI improvements
- 2.0.0: Major rebrand to StudiOWL

---

Copyright © 2026 Juuso Kaikula. All rights reserved.
