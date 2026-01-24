# 🗺️ KSYK Campus Maps

**Version 2.0.1** - Professional Interactive Campus Navigation System

Interactive campus map for KSYK. Create custom buildings, manage rooms, navigate between locations, and share with everyone!

## ⚡ Quick Start

```bash
npm install
npm run dev
```

Open: `http://localhost:5173`

## 📚 Documentation

### 🇫🇮 Suomeksi (Finnish):
- **`PIKA-ALOITUS.md`** - 2 minuutin aloitus
- **`ONGELMAT-PIKA.md`** - Ongelmat ja ratkaisut
- **`VERCEL-DEPLOY.md`** - Vercel deployment
- **`README-FI.md`** - Täydellinen dokumentaatio

### 🇬🇧 English:
- **`QUICK_START.md`** - Quick start guide
- **`DEPLOYMENT.md`** - Deployment options
- **`SHARE-NOW.md`** - Share instantly
- **`CHANGELOG.md`** - Version history and updates

## 🔑 Admin Access

Admin panel is available at `/admin-login`. Contact the system administrator for credentials.

**Security Note:** Admin credentials are stored securely in environment variables and are not included in the repository.

## ✨ Features

### 🗺️ Navigation & Maps
- 🧭 **Smart Navigation** - Google Maps-style route planning with A* pathfinding
- 🎯 **Visual Path Display** - Animated blue paths showing your route
- 📍 **Waypoint Markers** - Numbered steps with pulsing start/end markers
- 🏢 **3D Buildings** - Multi-layer shadows and dynamic gradients
- 🎨 **Custom Shapes** - Draw polygon buildings with color picker
- 🗺️ **Interactive Map** - Drag, zoom, and explore the campus

### 👥 Staff Management
- 📊 **Staff Dashboard** - Complete CRUD operations for staff members
- 🔍 **Search & Filter** - Find staff by name, position, or department
- 🌐 **Multilingual** - Support for English and Finnish
- 📧 **Contact Info** - Email and phone management
- ✅ **Status Tracking** - Active/inactive staff members

### 🏗️ Building & Room Management
- 🏢 **Custom Buildings** - Click-to-draw custom shapes
- 🚪 **Room Details** - Capacity, equipment, and type information
- 🛤️ **Hallways** - Connect rooms with adjustable-width hallways
- 🎨 **Full Color Picker** - Customize building and room colors
- 📏 **Floor Management** - Multi-floor support with floor navigation

### 📢 Communication
- 📣 **Announcements** - Priority-based campus announcements
- 🔔 **Banner Display** - Rotating announcement banner
- ⏰ **Scheduling** - Set expiry dates for announcements
- 🌐 **Bilingual** - English and Finnish support

### 🎨 User Experience
- 🌓 **Dark Mode** - Full dark theme support
- 📱 **Mobile Responsive** - Optimized for all devices
- ⚡ **Smooth Animations** - Professional transitions and effects
- 🎯 **Intuitive UI** - Clean, modern interface
- 🔍 **Smart Search** - Quick room and staff lookup

## 🚀 Share with Cloudflare

```bash
# Terminal 1
npm run dev

# Terminal 2
.\START-CLOUDFLARE.bat
```

Share the URL you get!

## 🆘 Problems?

See: **`ONGELMAT-PIKA.md`** (Finnish) or **`DEPLOYMENT.md`** (English)

## 📦 Tech Stack

**Frontend:**
- ⚛️ React 18 + TypeScript
- 🎨 Tailwind CSS
- ⚡ Vite
- 🔄 React Query
- 🌐 i18next

**Backend:**
- 🚀 Express.js + Node.js
- 🔥 Firebase Firestore
- 🔐 Passport.js Authentication
- 📧 Nodemailer

**Deployment:**
- ☁️ Vercel
- 🌐 Cloudflare Tunnel

## 📋 Version History

See **`CHANGELOG.md`** for detailed version history and updates.

**Current Version:** 2.0.1 (January 24, 2026)

### Recent Updates:
- ✅ Staff management system fully functional with CRUD operations
- ✅ Version info button showing current version and changelog
- ✅ Mobile responsiveness improvements
- ✅ Google Maps-style navigation with animated paths
- ✅ Enhanced 3D building rendering
- ✅ Fixed sidebar toggle and mobile responsiveness

## 🔮 Upcoming Features

- 🗓️ Event calendar with room booking
- 📊 Analytics dashboard
- 🔔 Push notifications
- 🎫 QR code integration
- 🌍 3D map view

## 📄 License

MIT

## 📞 Support

For issues, feature requests, or technical support:
- 📧 Email: juuso.kaikula@ksyk.fi
- 🏫 School: Kulosaaren Yhteiskoulu (KSYK)
- ⏱️ Response time: Usually within 24 hours
- 💬 Include version number (v2.0.1) when reporting issues

---

**Made with ❤️ by OWL Apps for KSYK**
