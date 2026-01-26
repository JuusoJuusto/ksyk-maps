# OWL Apps Integration - Complete Specification

## ✅ KSYK MAPS READY (v2.2.0)

### Changes Made
- ✅ Tickets tab removed from KSYK Maps admin panel
- ✅ Ticket button redirects to OWL Apps
- ✅ "Visit OWL Apps" link in settings
- ✅ Mobile responsiveness improved
- ✅ Build successful and pushed to Git

---

## 🦉 OWL APPS WEBSITE REQUIREMENTS

### Project Structure
```
owlapps/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── home.tsx              # Homepage with app showcase
│   │   │   ├── tickets.tsx           # Unified ticket system
│   │   │   ├── admin-login.tsx       # Hidden admin login
│   │   │   └── admin.tsx             # Admin dashboard
│   │   ├── components/
│   │   │   ├── TicketForm.tsx        # Ticket submission form
│   │   │   ├── AppCard.tsx           # App showcase cards
│   │   │   ├── AdminDashboard.tsx    # Admin panel
│   │   │   └── Analytics.tsx         # App analytics
│   │   └── lib/
│   │       ├── firebase.ts           # Shared Firebase (same as KSYK)
│   │       └── discord.ts            # Discord webhooks
├── server/
│   └── firebaseStorage.ts            # Firebase operations
└── shared/
    └── schema.ts                     # Data schemas
```

---

## 🎫 TICKET SYSTEM

### URL Structure
- Main: `owlapps.vercel.app/tickets`
- Pre-selected: `owlapps.vercel.app/tickets?app=ksyk-maps`

### App Selector Options
```typescript
const apps = [
  { id: 'ksyk-maps', name: 'KSYK Maps', icon: '🗺️', color: '#3B82F6' },
  { id: 'helsinki-piilohippa', name: 'Helsinki Piilohippa', icon: '🏃', color: '#10B981' },
  { id: 'owl-apps', name: 'OWL Apps', icon: '🦉', color: '#8B5CF6' }
];
```

### Ticket Schema
```typescript
interface Ticket {
  id: string;
  ticketId: string;              // TICKET-timestamp-random
  app: 'ksyk-maps' | 'helsinki-piilohippa' | 'owl-apps';
  type: 'bug' | 'feature' | 'support';
  title: string;
  description: string;
  name: string;
  email: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high';
  response?: string;
  createdAt: string;
  updatedAt?: string;
}
```

### Firebase Structure
```
firebase/
├── ksyk_maps/              # Existing KSYK data
│   ├── buildings/
│   ├── rooms/
│   ├── staff/
│   └── announcements/
├── owlapps_users/          # NEW: OWL Apps admin users
│   └── {userId}/
│       ├── email
│       ├── role
│       └── createdAt
├── tickets/                # NEW: All app tickets
│   └── {ticketId}/
│       ├── app
│       ├── type
│       ├── title
│       └── ...
└── analytics/              # NEW: App analytics
    ├── ksyk-maps/
    ├── helsinki-piilohippa/
    └── owl-apps/
```

---

## � ADMIN PANEL (HIDDEN)

### Access
- URL: `owlapps.vercel.app/admin-secret-portal-2026` (hidden, not linked)
- Login: Same as KSYK Maps (owner email works)
- Firebase: `owlapps_users` collection

### Admin Dashboard Tabs
1. **Overview** - Quick stats across all apps
2. **Tickets** - All tickets from all apps with filtering
3. **Users** - Manage OWL Apps admin users
4. **Webhooks** - Configure Discord webhooks
5. **Analytics** - Detailed app analytics
6. **Settings** - Global settings

### Tickets Tab Features
- Filter by app (KSYK Maps, Helsinki Piilohippa, OWL Apps)
- Filter by status (pending, in_progress, resolved, closed)
- Filter by priority (low, normal, high)
- Search by ticket ID, title, or email
- Respond to tickets (sends email)
- Update status
- Delete tickets
- Export tickets to CSV

### Users Tab Features
- List all OWL Apps admin users
- Add new admin users
- Edit user roles (admin, moderator, viewer)
- Delete users
- Owner (juuso.kaikula@ksyk.fi) cannot be deleted

### Webhooks Tab Features
```typescript
interface WebhookConfig {
  tickets: string;           // Main tickets channel
  ticketLogs: string;        // Ticket logs channel
  ticketResponses: string;   // Responses channel
  analytics: string;         // Analytics updates
  errors: string;            // Error notifications
}
```

### Analytics Tab Features

#### Per-App Metrics
```typescript
interface AppAnalytics {
  app: string;
  totalUsers: number;
  activeUsers: number;        // Last 30 days
  totalTickets: number;
  openTickets: number;
  avgResponseTime: number;    // Hours
  userSatisfaction: number;   // 1-5 rating
  pageViews: number;
  uniqueVisitors: number;
  avgSessionDuration: number; // Minutes
  topPages: { page: string; views: number }[];
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  browserBreakdown: { [browser: string]: number };
  geographicData: { country: string; users: number }[];
}
```

#### Charts & Visualizations
- Line chart: Tickets over time (last 30 days)
- Pie chart: Ticket types distribution
- Bar chart: Tickets by app
- Line chart: User growth over time
- Heatmap: Active hours
- Map: Geographic distribution

#### Real-Time Stats
- Current active users per app
- Tickets submitted today
- Average response time today
- System status (all apps)

---

## 🏠 HOMEPAGE FEATURES

### Hero Section
```
🦉 OWL Apps
Building Better Apps

Professional software solutions for modern needs
```

### App Showcase Cards
Each card includes:
- App icon and name
- Short description
- Key features (3-4 bullet points)
- "Visit App" button
- "Submit Ticket" button
- Status badge (Active, Beta, Coming Soon)

### Apps Section
1. **KSYK Maps** 🗺️
   - Interactive campus navigation
   - Real-time room search
   - Multi-floor support
   - Staff directory
   - Status: Active
   - URL: ksykmaps.vercel.app

2. **Helsinki Piilohippa** 🏃
   - City-wide hide and seek game
   - Real-time location tracking
   - Leaderboards and achievements
   - Social features
   - Status: Beta
   - URL: TBD

3. **More Coming Soon** ✨
   - Future projects placeholder

### Footer
- © 2026 OWL Apps. All rights reserved.
- Owner: Juuso Kaikula
- Email: juuso.kaikula@ksyk.fi
- Discord: https://discord.gg/5ERZp9gUpr
- Links: Privacy Policy, Terms of Service, Contact

---

## 🎨 DESIGN SYSTEM

### Colors
```css
--primary: #3B82F6;      /* Blue */
--secondary: #4F46E5;    /* Indigo */
--accent: #8B5CF6;       /* Purple */
--success: #10B981;      /* Green */
--warning: #F59E0B;      /* Amber */
--error: #EF4444;        /* Red */
```

### Typography
- Headings: Inter, bold
- Body: Inter, regular
- Code: JetBrains Mono

### Components
- Use shadcn/ui components (same as KSYK Maps)
- Consistent button styles
- Card-based layouts
- Smooth animations (300ms ease)

---

## 📊 ANALYTICS IMPLEMENTATION

### Data Collection
```typescript
// Track page view
analytics.trackPageView({
  app: 'ksyk-maps',
  page: '/home',
  userId: 'anonymous',
  timestamp: Date.now(),
  userAgent: navigator.userAgent,
  referrer: document.referrer
});

// Track event
analytics.trackEvent({
  app: 'ksyk-maps',
  event: 'room_search',
  properties: {
    query: 'M101',
    resultsCount: 5
  },
  timestamp: Date.now()
});

// Track ticket submission
analytics.trackTicket({
  app: 'ksyk-maps',
  ticketId: 'TICKET-123',
  type: 'bug',
  timestamp: Date.now()
});
```

### Firebase Analytics Structure
```
analytics/
├── ksyk-maps/
│   ├── pageViews/
│   │   └── {date}/
│   │       └── {viewId}
│   ├── events/
│   │   └── {date}/
│   │       └── {eventId}
│   └── summary/
│       └── {date}
├── helsinki-piilohippa/
│   └── ...
└── owl-apps/
    └── ...
```

---

## 🔗 INTEGRATION CHECKLIST

### KSYK Maps → OWL Apps
- [x] Ticket button redirects to OWL Apps
- [x] Settings link to OWL Apps
- [ ] Analytics tracking implemented
- [ ] Test ticket submission flow

### OWL Apps Setup
- [ ] Create new Vercel project
- [ ] Configure Firebase (same project as KSYK)
- [ ] Set up Discord webhooks
- [ ] Implement ticket system
- [ ] Build admin panel
- [ ] Add analytics dashboard
- [ ] Create homepage
- [ ] Deploy to owlapps.vercel.app

### Testing
- [ ] Test ticket submission from KSYK Maps
- [ ] Test admin login
- [ ] Test ticket management
- [ ] Test analytics tracking
- [ ] Test mobile responsiveness
- [ ] Test Discord notifications

---

## 🚀 DEPLOYMENT

### Environment Variables (Vercel)
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
FIREBASE_SERVICE_ACCOUNT=...
VITE_DISCORD_TICKETS_WEBHOOK=...
VITE_DISCORD_TICKET_LOGS_WEBHOOK=...
VITE_DISCORD_TICKET_RESPONSES_WEBHOOK=...
VITE_DISCORD_ANALYTICS_WEBHOOK=...
VITE_DISCORD_ERRORS_WEBHOOK=...
```

### Build Commands
```bash
npm run build
npm run start
```

---

## ✅ READY TO BUILD

KSYK Maps is ready and pushed to Git. You can now:
1. Switch to OWL Apps folder
2. Create the new project
3. Follow this specification
4. Deploy to owlapps.vercel.app

Let me know when you're ready to switch folders!
