# KSYK Maps - Changelog

All notable changes to KSYK Maps will be documented in this file.

---

## [2.0.4] - 2026-01-25

### Fixed
- 🔥 **Firebase connection restored** - Added fallback values for environment variables
- Firebase now works properly with console logging for debugging
- Environment variables load correctly with fallbacks

### Improved
- 🎫 **Enhanced Ticket System**:
  - Changed button color from gradient to solid blue
  - Added unique ticket ID generation (TICKET-timestamp-random)
  - Added name field for better identification
  - Email now required for follow-up
  - Improved Discord embed with better formatting
  - Added detailed "How it works" explanation in dialog
  - Tickets go to admin-only #tickets channel
  - Responses sent to #ticket-responses channel
  - Better error handling and user feedback

### Changed
- Updated README with detailed ticket system explanation
- Version bumped to 2.0.4
- Improved ticket submission flow

---

## [2.0.3] - 2026-01-25

### Added
- 🎫 Ticket System - Submit bug reports, feature requests, and support tickets directly to Discord
- Floating ticket button in bottom-right corner
- Automatic Discord webhook integration for tickets
- Email field for follow-up contact

### Fixed
- Windows compatibility for dev script (NODE_ENV command)
- Copyright dates updated to 2026 only
- Discord webhook properly configured in .env

### Changed
- Version info button and ticket button positioned to avoid overlap
- Improved button z-index layering

---

## [2.0.2] - 2026-01-25

### Security
- Moved Firebase credentials to environment variables
- Removed hardcoded API keys from source code
- Cleaned up repository (removed 16+ unnecessary files)
- Updated license to proprietary (not free to use)

### Changed
- Updated README files (removed Quick Start, changed to "Application")
- Improved .gitignore for better security
- Enhanced Discord notifications with more details

### Fixed
- Firebase connection issues resolved
- Environment variable configuration improved

---

## [2.0.1] - 2026-01-24

### Added
- Version info button showing current version
- Comprehensive changelog dialog
- Staff management system with full CRUD operations
- Staff dashboard with statistics
- Search and filter for staff members
- Discord community link in all support sections

### Fixed
- Staff system fully functional (add, edit, delete)
- Mobile responsiveness improvements
- Sidebar toggle button positioning
- Discord notification workflow

---

## [2.0.0] - 2026-01-24

### Major Release - Complete Redesign

#### Navigation System
- Google Maps-style navigation with route planning
- Animated path visualization on map
- A* pathfinding algorithm for optimal routes
- Smart waypoints and markers

#### Staff Management
- Full CRUD operations
- Comprehensive statistics dashboard
- Search and filter functionality
- Multilingual support (EN/FI)

#### Map Enhancements
- 3D building rendering with shadows
- Dynamic gradients and glow effects
- Custom polygon shapes for buildings
- Enhanced room visualization

#### UI/UX Improvements
- Smooth sidebar toggle animation
- Mobile responsive design
- Dark mode support
- Professional gradients and transitions

---

## Support

For support, bug reports, or feature requests:
- 📧 Email: juuso.kaikula@ksyk.fi
- 💬 Discord: https://discord.gg/5ERZp9gUpr
- 🎫 Use the ticket system in the app
- ⏱️ Response time: Usually within 24 hours

---

Made with ❤️ by OWL Apps for KSYK
