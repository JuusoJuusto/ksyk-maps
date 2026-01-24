# KSYK Maps - Changelog

All notable changes to KSYK Maps will be documented in this file.

---

## [2.0.1] - 2026-01-24

### Added
- Version info button in bottom-right corner showing current version
- Comprehensive changelog dialog with all features and improvements
- Staff management system with full CRUD operations in admin panel
- Staff dashboard with statistics (total, active, departments, positions)
- Search and filter functionality for staff members
- Multilingual support for staff positions and departments (EN/FI)

### Fixed
- Staff system now fully functional with add, edit, and delete operations
- Staff API routes (PUT and DELETE) properly implemented
- Staff form validation and error handling
- Mobile responsiveness improvements across the app
- Sidebar toggle button positioning on mobile devices

### Changed
- Updated version numbering system (2.0.x for patches, 2.x.0 for features)
- Improved mobile layout for better usability on small screens
- Enhanced map controls for touch devices

---

## [2.0.0] - 2026-01-24

### Major Release - Complete Redesign

#### Navigation System
- Google Maps-style navigation with professional route planning
- Animated path visualization with blue lines showing routes on map
- Smart waypoints with numbered step markers along routes
- Pulsing A and B markers for start and destination points
- Navigation popup with auto-hide after 5 seconds
- A* pathfinding algorithm for optimal routes through hallways and stairways

#### Staff Management
- Full CRUD operations for staff members
- Staff dashboard with comprehensive statistics
- Search and filter by name, email, position, or department
- Multilingual support for position and department names
- Contact information management (email and phone)
- Active/inactive status toggle for staff members

#### Map Enhancements
- 3D building rendering with multi-layer shadows
- Dynamic gradients for each building (top to bottom)
- Glow effects with Gaussian blur filters
- Glass shine effects with 40% opacity overlay
- Floor badges showing building height
- Enhanced rooms with full-color rendering and glass shine
- Custom polygon shapes for buildings
- Thicker strokes (5px for buildings, 2.5px for rooms)
- Rounded corners (10px for buildings, 5px for rooms)

#### UI/UX Improvements
- Fixed sidebar toggle with smooth sliding animation
- Proper z-index layering (Loading: 9999, Toggle: 60, Sidebar: 45, Overlay: 35)
- Mobile responsive design optimized for all screen sizes
- Dark mode fully functional throughout the app
- Smooth 300ms transitions with easing
- Professional gradient backgrounds
- Better typography with enhanced font sizes and weights

#### Technical Improvements
- Firebase Firestore integration complete
- Staff API routes (GET, POST, PUT, DELETE)
- React Query for server state management with caching
- TypeScript type safety throughout application
- Optimized data fetching and rendering

#### Bug Fixes
- Fixed sidebar toggle button overlap issues
- Fixed navigation path not displaying on map
- Fixed mobile sidebar positioning
- Fixed z-index conflicts between components
- Fixed room color rendering (now fully colored)
- Fixed rectangle tool message (2 points instead of 3)
- Fixed loading screen progress bar animation
- Fixed hallways API 404 error

---

## Version Numbering

We use Semantic Versioning:
- MAJOR version (X.0.0) - Incompatible API changes or major redesigns
- MINOR version (X.Y.0) - New features, backwards compatible
- PATCH version (X.Y.Z) - Bug fixes and small improvements

---

## Upcoming Features

### Version 2.1.0 (Planned)
- Event calendar with room booking system
- Analytics dashboard with usage statistics
- Push notifications for real-time updates
- QR code integration for quick room access

### Version 2.2.0 (Planned)
- 3D map view with interactive campus visualization
- AI assistant for natural language navigation
- Photo gallery for buildings and rooms
- Enhanced accessibility features
- Parking management system

---

## Support

For issues, feature requests, or technical support:
- Email: juuso.kaikula@ksyk.fi
- Discord: https://discord.gg/5ERZp9gUpr
- School: Kulosaaren Yhteiskoulu (KSYK)
- Response time: Usually within 24 hours
- Response time: Usually within 24 hours

---

Made with love by OWL Apps for KSYK
