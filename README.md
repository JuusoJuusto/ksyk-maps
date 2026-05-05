# 🏫 KSYK Maps - Kulosaaren Yhteiskoulu Navigation System

<div align="center">
  <img src="client/public/KSYK-logo-desktop.png" alt="KSYK Logo" width="200"/>
  
  <h3>Modern School Navigation & Management Platform</h3>
  <p>Built by <strong>SL Studio</strong></p>
  
  [![Version](https://img.shields.io/badge/version-3.1.2-blue.svg)](https://github.com/JuusoJuusto/ksyk-maps)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
</div>

---

## 🌟 Features

### 🗺️ Interactive Campus Maps
- Real-time navigation with 3D building views
- Room search and wayfinding with A* pathfinding
- Accessibility-friendly routes
- Multi-floor navigation
- Google Maps-style interface

### 📚 Wilma Integration
- Complete student management system
- **44 Desktop Applications** (Zoom, Teams, Slack, Notion, Coursera, etc.)
- Kurre-style schedule system with 16 color-coded subjects
- Grade tracking and attendance management
- Parent-teacher communication
- Assignment and homework tracking

### 🤖 AI-Powered Features
- **Tuki-Pöllö** - Smart Finnish-speaking AI assistant
- Study buddy with expertise in all Finnish school subjects
- Campus navigation help
- Homework assistance with image analysis
- Understands Finnish slang and colloquial speech

### 🖥️ Windows-Style Desktop
- Virtual desktop environment with 4 virtual desktops
- Window snapping and management (left/right/maximize)
- 44 integrated educational and productivity apps
- Modern Windows 11-inspired UI
- Taskbar with system tray

### 📊 Analytics & Insights
- Real-time usage statistics
- Performance monitoring
- User behavior analytics
- Custom reporting
- Live analytics dashboard

### 🎫 Ticket System
- Submit bug reports, feature requests, and support tickets
- Automatic Discord integration
- Unique ticket ID for tracking
- Email notifications for responses
- 24-hour response time

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Firebase account (for authentication)

### Installation

```bash
# Clone the repository
git clone https://github.com/JuusoJuusto/ksyk-maps.git
cd ksyk-maps

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

---

## 📱 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Visit: [ksykmaps.vercel.app](https://ksykmaps.vercel.app)

---

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL + Firebase Firestore
- **Maps**: Leaflet, OpenStreetMap
- **AI**: Google Gemini 2.0 Flash
- **Deployment**: Vercel
- **Authentication**: Firebase Auth with 2FA

---

## 📂 Project Structure

```
ksyk-maps/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   │   └── desktop-apps/  # 44 desktop applications
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities & AI
│   │   └── contexts/    # React contexts
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database interface
│   └── firebaseStorage.ts
├── shared/              # Shared types
└── api/                 # Vercel serverless functions
```

---

## 🎨 Key Features

### Desktop Applications (44 Total!)

**Educational Apps:**
- Coursera, Udemy, Khan Academy, Quizlet
- Duolingo, WilmaApp

**Productivity Apps:**
- Notion, Trello, OneDrive, Google Drive, Dropbox
- Microsoft Teams, Slack, Discord, Messenger
- Zoom, Google Meet

**Development Tools:**
- GitHub, VS Code, Terminal

**Design Tools:**
- Figma, Canva, Paint

**Office Suite:**
- Word, Excel, PowerPoint, Outlook

**Entertainment:**
- Spotify, YouTube, Calculator, Clock, Calendar

### Lukujärjestys (Schedule System)
- Kurre-inspired modern design
- 16 subject-specific color schemes:
  - Matematiikka (blue), Äidinkieli (purple), Englanti (green)
  - Ruotsi (yellow), Fysiikka (red), Kemia (orange)
  - Biologia (emerald), Maantieto (teal), Historia (amber)
  - And 7 more subjects!
- Grid and list view modes
- Export to JSON
- Copy to clipboard
- Preview mode

### Tuki-Pöllö AI Assistant
- Fluent Finnish language support (primary language)
- Deep knowledge of Finnish education system
- Understands ylioppilaskirjoitukset and Finnish grading (4-10)
- Subject-specific tutoring for all Finnish school subjects
- Campus navigation assistance
- Homework help with image analysis
- Understands slang and abbreviations

---

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://...
FIREBASE_API_KEY=...
GEMINI_API_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_GEMINI_API_KEY=...
```

See `.env.example` for full configuration options.

---

## 📖 Documentation

- [Finnish README](README-FI.md)
- [System Guide](SYSTEM-GUIDE.md)
- [Build Fix Documentation](BUILD-FIX-2026-05-04.md)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright © 2026 SL Studio. All rights reserved.

---

## 👥 Team

**Built by SL Studio**

- Lead Developer: [Juuso Kaikula](https://github.com/JuusoJuusto)
- Organization: Kulosaaren Yhteiskoulu
- Email: juuso.kaikula@ksyk.fi
- Discord: https://discord.gg/5ERZp9gUpr

---

## 📞 Support

- 📧 Email: juuso.kaikula@ksyk.fi
- 💬 Discord: https://discord.gg/5ERZp9gUpr
- 🎫 Ticket System: Use the blue button in the app
- ⏱️ Response time: Usually within 24 hours

**Ticket Types:**
- 🐛 Bug Report - Report issues or errors
- ✨ Feature Request - Suggest new features
- 💬 Support - Get help or ask questions

---

## 🙏 Acknowledgments

- Kulosaaren Yhteiskoulu for project support
- OpenStreetMap contributors
- Google Gemini AI team
- React and TypeScript communities
- All open-source libraries used in this project

---

## 📊 Stats

- **44** Desktop Applications
- **16** Color-coded subjects in schedule
- **1000+** Active users
- **99.9%** Uptime
- **24h** Average support response time

---

<div align="center">
  <p>Made with ❤️ by <strong>SL Studio</strong></p>
  <p>© 2026 KSYK Maps by SL Studio. All rights reserved.</p>
</div>
