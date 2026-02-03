# KSYK Maps - Changelog

All notable changes to KSYK Maps will be documented in this file.

---

## [2.2.1] - 2026-02-03

### 🏢 EVEN BIGGER BUILDINGS & CROSS-BUILDING NAVIGATION

**Changed:**
- 🔄 Buildings are now EVEN BIGGER (400x260 instead of 280x180)
- 🔄 Building text increased: name 96px (was 72px), subtitle 28px (was 22px)
- 🔄 Floor badges enlarged: 90x50 with 26px text
- 🔄 Buildings more spread out: 50px spacing instead of cramped layout
- 🔄 Rooms significantly bigger (120x80, 100x70, etc.) with 18px text
- 🔄 Room borders thicker (3.5px) and more rounded (8px radius)

**Added:**
- ✅ 7 connector hallways between buildings for cross-building navigation
- ✅ Horizontal connectors: M-K, K-L, R-A, A-U
- ✅ Vertical connectors: M-R, K-A, L-U
- ✅ Navigation now works between ANY buildings on campus
- ✅ New `seed:connectors` script to add connector hallways

**Improved:**
- ⚡ Much better visibility of all buildings and rooms
- ⚡ Navigation system can route between buildings via connectors
- ⚡ Cleaner campus layout with proper spacing (50,50 / 550,50 / 1050,50 / 50,450 / 550,450 / 1050,450)
- ⚡ All 31 rooms (24 regular + 7 connectors) properly positioned

**Technical:**
- 🔧 Created `server/seedConnectors.ts` for connector hallways
- 🔧 Updated building positions for better spread
- 🔧 Enhanced room rendering with bigger text and borders

---

## [2.2.0] - 2026-01-26

### 🦉 OWL APPS INTEGRATION

**Added:**
- ✅ Ticket system now redirects to OWL Apps website (owlapps.vercel.app)
- ✅ "Visit OWL Apps" button in Settings tab
- ✅ Centralized ticket management across all OWL Apps products
- ✅ App selector in ticket system (KSYK Maps, Helsinki Piilohippa, OWL Apps)

**Changed:**
- 🔄 Removed local ticket form - now uses OWL Apps unified ticket system
- 🔄 Ticket button opens OWL Apps in new tab with KSYK Maps pre-selected
- 🔄 Settings page now includes link to OWL Apps portal

**Improved:**
- ⚡ Simplified ticket submission process
- ⚡ Better cross-app support management
- ⚡ Unified branding across OWL Apps ecosystem

---

## [2.1.3] - 2026-01-26

### 📱 MOBILE & RESPONSIVE DESIGN

**Fixed:**
- ✅ React useState error in AdminDashboard (duplicate state declarations)
- ✅ Mobile responsiveness across all components
- ✅ Header buttons now properly sized for mobile (smaller text, compact spacing)
- ✅ Admin dashboard tabs now wrap on mobile (4 columns on mobile, 8 on desktop)
- ✅ Sidebar width optimized for mobile (full width on mobile, 320px on desktop)
- ✅ Map controls properly sized for touch screens

**Improved:**
- ⚡ Better touch targets for mobile users
- ⚡ Responsive text sizes (xs/sm on mobile, base/lg on desktop)
- ⚡ Compact button spacing on small screens
- ⚡ Admin panel stats cards now 1 column on mobile, 2 on tablet, 4 on desktop
- ⚡ Navigation button scales properly on all screen sizes

---

## [2.1.2] - 2026-01-26

### 🎯 ENHANCED TICKET SYSTEM & SECURITY

**Added:**
- ✅ Status dropdown in admin panel (pending, in_progress, resolved, closed)
- ✅ Response system - admins can reply directly to tickets
- ✅ Email notifications sent to users when admin responds
- ✅ Better Discord changelog formatting with sections
- ✅ Ticket statistics badges (pending, in progress, resolved counts)

**Fixed:**
- 🔒 Removed exposed credentials from repository
- ✅ Phone number now optional in staff management
- ✅ Improved ticket UI with expand/collapse responses

**Improved:**
- ⚡ Better ticket management workflow
- ⚡ Enhanced email integration
- ⚡ Cleaner Discord notifications

---

## [2.1.1] - 2026-01-25

### 🎫 TICKET SYSTEM COMPLETE

**Added:**
- ✅ Complete ticket management system with admin panel
- ✅ Tickets save to Firebase database automatically
- ✅ Admin can view, edit, and respond to tickets
- ✅ Status dropdown (pending, in_progress, resolved, closed)
- ✅ Priority levels (low, normal, high)
- ✅ Email notifications for ticket responses
- ✅ Discord integration (#tickets and #ticket-logs channels)

**Fixed:**
- ✅ All API endpoints now functional (/api/tickets)
- ✅ Server build path corrected (dist/public)
- ✅ Removed deprecated `.substr()` usage
- ✅ Fixed unused import warnings
- ✅ Dialog accessibility warnings resolved

**Improved:**
- ⚡ Better Discord changelog formatting
- ⚡ Enhanced ticket management UI
- ⚡ Staff management - phone number now optional
- ⚡ Ticket response system with email integration

---

## [2.1.0] - 2026-01-25

### 🎉 MAJOR UPDATE - Complete Ticket Management System

**Added:**
- 🎫 **Complete Ticket System** with Firebase integration
- Tickets automatically save to database
- Dual Discord webhooks (tickets + ticket-logs channels)
- Unique ticket ID generation for tracking
- Admin panel ready for ticket management
- Owner information on OWL Apps page (Juuso Kaikula)

**Fixed:**
- ✅ Manifest.json syntax error resolved
- ✅ Firebase connection stable with fallbacks
- ✅ Dialog accessibility warnings fixed
- ✅ All webhooks properly configured

**Webhooks:**
- Tickets go to #tickets channel
- Logs go to #ticket-logs channel
- Responses go to #ticket-responses channel

**OWL Apps Page:**
- Added /owlapps route
- Owner & Founder section (Juuso Kaikula)
- Professional company information
- Contact details and project showcase

---

## [2.0.5] - 2026-01-25

### Added
- OWL Apps company page
- Button in Settings to visit OWL Apps page

### Fixed
- Dialog accessibility (added DialogDescription)
- Firebase environment variable loading

---

## [2.0.4] - 2026-01-25

### Fixed
- Firebase connection with fallback values
- Console logging for debugging
- Windows dev script compatibility

### Improved
- Ticket System with unique IDs
- Better Discord embed formatting
- Enhanced error handling

---

## [2.0.3] - 2026-01-25

### Added
- Ticket System with Discord integration
- Floating ticket button

### Fixed
- Windows compatibility
- Copyright dates (2026 only)

---

## [2.0.2] - 2026-01-25

### Security
- Moved Firebase credentials to environment variables
- Cleaned up repository
- Updated to proprietary license

---

## [2.0.1] - 2026-01-24

### Added
- Version info button
- Staff management system
- Discord community link

---

## [2.0.0] - 2026-01-24

### Major Release
- Complete redesign
- Navigation system with A* pathfinding
- 3D building rendering
- Staff management
- Dark mode support

---

## Support

For support, bug reports, or feature requests:
- 📧 Email: juuso.kaikula@ksyk.fi
- 💬 Discord: https://discord.gg/5ERZp9gUpr
- 🎫 Use the ticket system in the app
- ⏱️ Response time: Usually within 24 hours

---

Made with ❤️ by OWL Apps for KSYK
