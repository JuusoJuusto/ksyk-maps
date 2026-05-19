# KSYK Maps - Complete System Guide

**Last Updated**: April 27, 2026
**Version**: 3.1.2
**Status**: Production Ready

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [File Structure](#file-structure)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Components](#components)
8. [How It Works](#how-it-works)

---

## SYSTEM OVERVIEW

KSYK Maps is a comprehensive school management and campus navigation system with two main applications:

### 1. Campus Map System
- Interactive SVG-based campus map
- Building and room navigation
- Real-time pathfinding
- Floor selection
- Search functionality
- Mobile-responsive design

### 2. Wilma School Management
- Student/Teacher/Admin/Parent portals
- Attendance tracking (28 mark types)
- Grade management
- Homework system
- Messaging
- Schedule management
- Lunch menu integration
- Support ticket system
- Personalized dashboards

---

## ARCHITECTURE

### Tech Stack:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js (Vercel Serverless)
- **Database**: Firebase Firestore
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query + Context API
- **Maps**: Custom SVG rendering
- **Deployment**: Vercel

### Project Structure:
\\\
ksyk-maps/
+-- client/               # Frontend React app
¦   +-- src/
¦   ¦   +-- components/  # React components
¦   ¦   +-- pages/       # Page components
¦   ¦   +-- contexts/    # React contexts
¦   ¦   +-- hooks/       # Custom hooks
¦   ¦   +-- lib/         # Utilities
¦   ¦   +-- styles/      # CSS files
¦   +-- public/          # Static assets
+-- server/              # Backend logic
¦   +-- firebaseStorage.ts
¦   +-- storage.ts
¦   +-- routes.ts
+-- api/                 # API endpoints
¦   +-- index.ts
+-- shared/              # Shared types
¦   +-- schema.ts
+-- scripts/             # Utility scripts
\\\

---

## FEATURES

### Campus Map Features:
1. **Interactive Map**
   - SVG-based rendering
   - Zoom/pan controls
   - Touch gestures (pinch-to-zoom)
   - Building selection
   - Room highlighting

2. **Navigation**
   - Room search
   - Building search
   - Floor navigation
   - Pathfinding (A* algorithm)
   - Turn-by-turn directions

3. **Building Management**
   - Custom building shapes
   - Floor plans
   - Room details
   - Color coding

### Wilma Features:
1. **Authentication**
   - Multi-role support (8 roles)
   - Session management (60-min timeout)
   - Password reset
   - 2FA support

2. **Attendance System**
   - 28 color-coded mark types
   - Calendar grid view
   - Week navigation
   - Period selector (1-5)
   - Teacher edit mode
   - Export functionality

3. **Grade Management**
   - Course-based grades
   - Grade history
   - GPA calculation
   - Export reports

4. **Homework System**
   - Assignment creation
   - File attachments
   - Due date tracking
   - Submission system
   - Grading interface

5. **Messaging**
   - Inbox/Sent/Compose
   - Attachments
   - Read receipts
   - Filtering

6. **Personalized Dashboard**
   - 12 customizable widgets
   - Drag-and-drop reordering
   - Widget sizes (S/M/L)
   - Theme modes (Light/Dark/System)
   - Custom greetings
   - Backend sync

7. **Schedule Management**
   - Weekly/daily views
   - Visual schedule builder
   - Lesson editing
   - Break management
   - Holiday tracking

8. **Support System**
   - Ticket creation
   - FAQ section
   - Priority levels
   - Status tracking

---

## FILE STRUCTURE

### Key Frontend Files:

\\\
client/src/
+-- pages/
¦   +-- home.tsx                    # Campus map page
¦   +-- wilma.tsx                   # Wilma login
¦   +-- wilma-student.tsx           # Student portal
¦   +-- wilma-teacher.tsx           # Teacher portal
¦   +-- wilma-admin-new.tsx         # Admin portal
¦   +-- wilma-parent.tsx            # Parent portal
¦   +-- wilma-support-staff.tsx     # Support staff portal
¦   +-- lunch.tsx                   # Lunch menu
¦   +-- support.tsx                 # Support tickets
¦
+-- components/
¦   +-- WilmaHomeTabEnhanced.tsx    # Personalized dashboard
¦   +-- WilmaStyleAttendance.tsx    # Attendance calendar
¦   +-- WilmaTimetable.tsx          # Schedule view
¦   +-- WilmaLunchMenu.tsx          # Lunch menu widget
¦   +-- AdminHomeworkManager.tsx    # Homework grading
¦   +-- ScheduleBuilder.tsx         # Visual schedule editor
¦   +-- InteractiveCampusMap.tsx    # Map component
¦   +-- NavigationModal.tsx         # Pathfinding UI
¦   +-- [100+ other components]
¦
+-- contexts/
¦   +-- DarkModeContext.tsx         # Dark mode state
¦   +-- ThemeContext.tsx            # Theme management
¦   +-- HelpContext.tsx             # Help system
¦
+-- lib/
¦   +-- firebase.ts                 # Firebase config
¦   +-- analytics.ts                # Analytics tracking
¦   +-- queryClient.ts              # React Query setup
¦
+-- hooks/
    +-- useAuth.ts                  # Authentication hook
    +-- use-toast.ts                # Toast notifications
\\\

### Key Backend Files:

\\\
server/
+-- firebaseStorage.ts              # Firebase operations (3000+ lines)
+-- storage.ts                      # Storage interface
+-- routes.ts                       # Route handlers
+-- emailService.ts                 # Email sending
+-- twoFactorAuth.ts                # 2FA logic
+-- seedData.ts                     # Demo data generation

api/
+-- index.ts                        # API endpoint router (2000+ lines)

shared/
+-- schema.ts                       # TypeScript types
\\\

---

## API ENDPOINTS

### Campus Map Endpoints:
\\\
GET  /api/buildings                 # List all buildings
POST /api/buildings                 # Create building
GET  /api/buildings/:id             # Get building
PUT  /api/buildings/:id             # Update building
DELETE /api/buildings/:id           # Delete building

GET  /api/rooms                     # List all rooms
POST /api/rooms                     # Create room
GET  /api/rooms/:id                 # Get room
PUT  /api/rooms/:id                 # Update room
DELETE /api/rooms/:id               # Delete room
\\\

### Wilma Endpoints:
\\\
# Authentication
POST /api/wilma/login               # User login
POST /api/wilma/logout              # User logout
POST /api/wilma/reset-password      # Password reset

# Users
GET  /api/wilma/users               # List users
POST /api/wilma/users               # Create user
GET  /api/wilma/users/:id           # Get user
PUT  /api/wilma/users/:id           # Update user
DELETE /api/wilma/users/:id         # Delete user

# Attendance
GET  /api/wilma/attendance          # Get attendance marks
POST /api/wilma/attendance          # Create mark
PUT  /api/wilma/attendance/:id      # Update mark
DELETE /api/wilma/attendance/:id    # Delete mark

# Grades
GET  /api/wilma/grades              # Get grades
POST /api/wilma/grades              # Create grade
PUT  /api/wilma/grades/:id          # Update grade
DELETE /api/wilma/grades/:id        # Delete grade

# Homework
GET  /api/wilma/homework            # List homework
POST /api/wilma/homework            # Create homework
PUT  /api/wilma/homework/:id        # Update homework
DELETE /api/wilma/homework/:id      # Delete homework

# Messages
GET  /api/wilma/messages            # Get messages
POST /api/wilma/messages            # Send message
PUT  /api/wilma/messages/:id/read   # Mark as read
DELETE /api/wilma/messages/:id      # Delete message

# Dashboard
POST /api/wilma/dashboard-preferences        # Save preferences
GET  /api/wilma/dashboard-preferences/:userId # Load preferences

# Notifications
GET  /api/wilma/notifications       # Get notifications
POST /api/wilma/notifications       # Create notification
PUT  /api/wilma/notifications/:id/read # Mark as read
DELETE /api/wilma/notifications/:id # Delete notification

# Analytics
GET  /api/analytics/summary         # Analytics summary
GET  /api/analytics/live            # Live analytics
GET  /api/analytics/events          # Analytics events
GET  /api/analytics/performance     # Performance metrics

# Lunch Menu
GET  /api/lunch-menu                # Get lunch menu (proxied)

# Support
GET  /api/wilma/support-tickets     # List tickets
POST /api/wilma/support-tickets     # Create ticket
PUT  /api/wilma/support-tickets/:id # Update ticket
\\\

---

## DATABASE SCHEMA

### Firebase Collections:

\\\	ypescript
// Buildings
buildings {
  id: string
  name: string
  nameEn?: string
  nameFi?: string
  floors: number
  colorCode: string
  mapPositionX?: number
  mapPositionY?: number
  description?: string
}

// Rooms
rooms {
  id: string
  roomNumber: string
  name?: string
  nameEn?: string
  type: string
  floor: number
  buildingId: string
  capacity?: number
  equipment?: string[]
  mapPositionX?: number
  mapPositionY?: number
  width?: number
  height?: number
}

// Wilma Users
wilmaUsers {
  id: string
  email: string
  password: string (hashed)
  roles: string[]
  firstName: string
  lastName: string
  studentId?: string (8 digits)
  class?: string
  grade?: number
  createdAt: string
}

// Attendance
wilmaAttendance {
  id: string
  studentId: string
  lessonId: string
  markCode: string (28 types)
  reason?: string
  teacherId: string
  date: string
  period: number (1-5)
  createdAt: string
}

// Grades
wilmaGrades {
  id: string
  studentId: string
  courseId: string
  value: number
  weight: number
  date: string
  teacherId: string
  feedback?: string
}

// Homework
wilmaHomework {
  id: string
  courseId: string
  title: string
  description: string
  dueDate: string
  attachments?: string[]
  rubric?: object
  createdAt: string
}

// Messages
wilmaMessages {
  id: string
  fromId: string
  toId: string
  subject: string
  content: string
  read: boolean
  createdAt: string
  attachments?: string[]
}

// Dashboard Preferences
wilmaDashboardPreferences {
  userId: string
  widgets: WidgetConfig[]
  greeting: string
  showGreeting: boolean
  themeMode: 'system' | 'light' | 'dark'
  updatedAt: string
}

// Notifications
wilmaNotifications {
  id: string
  userId: string
  type: string
  title: string
  content: string
  isRead: boolean
  priority: string
  createdAt: string
}

// Analytics
pageViews {
  id: string
  page: string
  userId?: string
  sessionId: string
  timestamp: string
  device: string
  browser: string
}

searchAnalytics {
  id: string
  query: string
  results: number
  timestamp: string
}
\\\

---

## COMPONENTS

### Core Components:

1. **WilmaHomeTabEnhanced.tsx**
   - Personalized dashboard
   - 12 customizable widgets
   - Drag-and-drop reordering
   - Theme mode selector
   - Widget size controls
   - Backend sync

2. **WilmaStyleAttendance.tsx**
   - 28 color-coded mark types
   - Calendar grid layout
   - Week navigation
   - Period selector
   - Teacher edit mode
   - Hover tooltips

3. **WilmaTimetable.tsx**
   - Weekly/daily schedule view
   - Edit mode
   - Settings dialog
   - localStorage persistence

4. **ScheduleBuilder.tsx**
   - Visual schedule editor
   - Drag-and-drop lessons
   - Conflict detection
   - Break management
   - Holiday tracking

5. **InteractiveCampusMap.tsx**
   - SVG map rendering
   - Zoom/pan controls
   - Building/room selection
   - Floor navigation

6. **NavigationModal.tsx**
   - Room search
   - Pathfinding
   - Turn-by-turn directions
   - Route visualization

---

## HOW IT WORKS

### 1. Campus Map System

**Flow**:
1. User opens / (home page)
2. home.tsx loads
3. Fetches buildings and rooms from API
4. Renders InteractiveCampusMap component
5. User can:
   - Search for rooms
   - Select buildings
   - Navigate floors
   - Get directions

**Key Code**:
\\\	ypescript
// home.tsx
const { data: buildings } = useQuery({
  queryKey: ["buildings"],
  queryFn: async () => {
    const response = await fetch("/api/buildings");
    return response.json();
  }
});

// Render buildings on SVG
{buildings.map((building) => (
  <g key={building.id} onClick={() => selectBuilding(building)}>
    <rect fill={building.colorCode} />
    <text>{building.name}</text>
  </g>
))}
\\\

### 2. Wilma Authentication

**Flow**:
1. User opens /wilma
2. Enters email/password
3. POST to /api/wilma/login
4. Backend validates credentials
5. Returns user data + session token
6. Redirects to role-specific page

**Key Code**:
\\\	ypescript
// wilma.tsx
const handleLogin = async () => {
  const response = await fetch('/api/wilma/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  
  if (data.user) {
    // Redirect based on role
    if (data.user.roles.includes('student')) {
      navigate(\/wilma-student/\\);
    }
  }
};
\\\

### 3. Personalized Dashboard

**Flow**:
1. User logs in
2. Dashboard loads WilmaHomeTabEnhanced
3. Fetches preferences from backend
4. Applies saved configuration
5. User can customize:
   - Theme mode
   - Widget visibility
   - Widget sizes
   - Widget order
   - Custom greeting
6. Saves to localStorage + backend

**Key Code**:
\\\	ypescript
// WilmaHomeTabEnhanced.tsx
useEffect(() => {
  // Load from backend
  fetch(\/api/wilma/dashboard-preferences/\\)
    .then(res => res.json())
    .then(prefs => {
      setWidgets(prefs.widgets);
      setThemeMode(prefs.themeMode);
    });
}, [userId]);

// Save preferences
const handleSave = () => {
  const prefs = { widgets, greeting, themeMode };
  
  // Save to localStorage
  localStorage.setItem(\wilma_dashboard_\\, JSON.stringify(prefs));
  
  // Save to backend
  fetch('/api/wilma/dashboard-preferences', {
    method: 'POST',
    body: JSON.stringify({ userId, preferences: prefs })
  });
};
\\\

### 4. Attendance System

**Flow**:
1. Teacher opens attendance page
2. Selects week and period
3. Grid shows all students × lessons
4. Teacher clicks cell to add mark
5. Selects mark type (28 options)
6. Adds reason (optional)
7. Saves to database
8. Student/parent can view marks

**Key Code**:
\\\	ypescript
// WilmaStyleAttendance.tsx
const markTypes = [
  { code: 'P', name: 'Poissa', color: '#ff0000' },
  { code: 'H', name: 'Paikalla', color: '#00ff00' },
  // ... 26 more types
];

const handleMarkClick = (studentId, lessonId) => {
  // Show mark selector
  setSelectedCell({ studentId, lessonId });
};

const saveMark = async (markCode, reason) => {
  await fetch('/api/wilma/attendance', {
    method: 'POST',
    body: JSON.stringify({
      studentId,
      lessonId,
      markCode,
      reason,
      teacherId,
      date,
      period
    })
  });
};
\\\

### 5. Real-Time Analytics

**Flow**:
1. User performs action (page view, search, etc.)
2. nalytics.ts tracks event
3. Sends to /api/analytics/events
4. Stores in Firestore
5. Admin views analytics dashboard
6. Fetches aggregated data
7. Displays charts and metrics

**Key Code**:
\\\	ypescript
// analytics.ts
export const trackPageView = (page: string) => {
  fetch('/api/analytics/events', {
    method: 'POST',
    body: JSON.stringify({
      type: 'pageView',
      page,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId()
    })
  });
};

// RealAnalytics.tsx
const { data: summary } = useQuery({
  queryKey: ['analytics-summary'],
  queryFn: async () => {
    const response = await fetch('/api/analytics/summary');
    return response.json();
  },
  refetchInterval: 5000 // Update every 5 seconds
});
\\\

---

## KEY FEATURES EXPLAINED

### 1. Drag-and-Drop Widgets

Uses eact-beautiful-dnd library:
- Wraps widgets in DragDropContext
- Each widget is a Draggable
- Container is Droppable
- onDragEnd updates order
- Saves new order to backend

### 2. Theme Modes

Three modes:
- **Light**: Bright backgrounds, dark text
- **Dark**: Dark backgrounds, light text
- **System**: Follows OS preference

Implementation:
- Uses DarkModeContext for state
- Detects system preference with matchMedia
- Applies theme classes conditionally
- Persists choice to backend

### 3. Widget Sizes

Three sizes:
- **Small**: 1 column (col-span-1)
- **Medium**: 2 columns (col-span-2)
- **Large**: 3 columns (col-span-3)

Implementation:
- Grid layout with 3 columns
- Each widget has size property
- getSizeClass() returns Tailwind class
- Responsive: stacks on mobile

### 4. Backend Sync

Dual-layer persistence:
- **localStorage**: Instant save/load
- **Backend**: Cross-device sync

Flow:
1. User makes change
2. Save to localStorage (instant)
3. POST to backend (async)
4. On other device, fetch from backend
5. Merge with local changes

### 5. Real-Time Updates

Uses React Query:
- Automatic refetching
- Cache management
- Optimistic updates
- Background sync

Example:
\\\	ypescript
const { data } = useQuery({
  queryKey: ['messages'],
  queryFn: fetchMessages,
  refetchInterval: 30000, // Refetch every 30s
  staleTime: 10000 // Consider stale after 10s
});
\\\

---

## DEPLOYMENT

### Vercel Configuration:

\\\json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite"
}
\\\

### Environment Variables:

\\\
FIREBASE_SERVICE_ACCOUNT=<json>
USE_FIREBASE=true
NODE_ENV=production
\\\

### Build Process:

1. 
pm run build - Vite builds frontend
2. TypeScript compiles
3. Assets optimized
4. Output to dist/public
5. Vercel deploys
6. Serverless functions created

---

## TROUBLESHOOTING

### Common Issues:

1. **Build fails**:
   - Check TypeScript errors
   - Verify all imports
   - Clear node_modules and reinstall

2. **Firebase connection fails**:
   - Check FIREBASE_SERVICE_ACCOUNT env var
   - Verify Firebase project settings
   - Check Firestore rules

3. **Authentication not working**:
   - Check session timeout (60 min)
   - Verify password hashing
   - Check role assignments

4. **Map not rendering**:
   - Check buildings/rooms data
   - Verify SVG viewBox
   - Check mapPosition coordinates

5. **Dashboard not saving**:
   - Check localStorage quota
   - Verify backend endpoint
   - Check network requests

---

## MAINTENANCE

### Regular Tasks:

1. **Database Cleanup**:
   - Run scripts/cleanup-all-data.js
   - Remove old sessions
   - Archive old messages

2. **Analytics Review**:
   - Check /api/analytics/summary
   - Monitor error rates
   - Review performance metrics

3. **User Management**:
   - Verify active users
   - Remove inactive accounts
   - Update roles as needed

4. **Backup**:
   - Firebase automatic backups
   - Export important data
   - Test restore procedures

---

## SECURITY

### Implemented:

1. **Rate Limiting**: 100 requests/minute
2. **Input Sanitization**: All user inputs cleaned
3. **Password Hashing**: bcrypt with salt
4. **Session Management**: 60-minute timeout
5. **CORS**: Configured for production domain
6. **Security Headers**: CSP, X-Frame-Options, etc.

### Best Practices:

- Never commit secrets
- Use environment variables
- Validate all inputs
- Sanitize outputs
- Regular security audits
- Keep dependencies updated

---

## PERFORMANCE

### Optimizations:

1. **Code Splitting**: Dynamic imports
2. **Lazy Loading**: Components load on demand
3. **Caching**: React Query + localStorage
4. **Image Optimization**: WebP format
5. **Bundle Size**: Tree shaking
6. **Database Indexes**: Firestore indexes

### Metrics:

- Page load: < 2 seconds
- API response: < 500ms
- Database query: < 100ms
- Bundle size: ~1.8MB (gzipped: 468KB)

---

## FUTURE ENHANCEMENTS

### Planned Features:

1. Mobile apps (React Native)
2. Real-time chat
3. Video conferencing
4. AI homework detection
5. Advanced analytics
6. Parent-teacher conferences
7. Grade predictions
8. Study recommendations

---

## SUPPORT

### Resources:

- GitHub: https://github.com/JuusoJuusto/ksyk-maps
- Documentation: This file
- Issues: GitHub Issues
- Contact: support@ksyk.fi

---

**Last Updated**: April 27, 2026
**Version**: 3.1.2
**Maintained by**: Development Team
