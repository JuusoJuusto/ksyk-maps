# Wilma Professional Update - Implementation Plan

## 🎯 Requirements

1. **Full-Screen Professional UI**
   - Logout button always visible in corner
   - Covers entire screen on all devices
   - Professional Wilma-inspired design (but better)
   - Modern, clean interface

2. **Form Persistence**
   - Edit forms keep information when switching
   - No form resets during editing

3. **Parent Visibility**
   - Show parent information for students
   - Parent relationships clearly displayed

4. **Admin Settings Functional**
   - All Wilma admin settings work
   - Real data management

5. **Session Timeout**
   - Auto-logout after inactivity
   - Session management

6. **Real Data Only**
   - Remove all mock/demo data
   - Connect to real APIs
   - Functional data fetching

7. **Git Commit**
   - Push all changes to repository

## 📋 Implementation Steps

### Phase 1: UI Redesign (Priority 1)
- [ ] Create full-screen layout with fixed logout button
- [ ] Professional color scheme (Wilma blue theme)
- [ ] Responsive design for all screen sizes
- [ ] Modern navigation sidebar
- [ ] Clean, professional typography

### Phase 2: Real Data Integration (Priority 1)
- [ ] Replace all mock data with API calls
- [ ] Use React Query for data fetching
- [ ] Connect to real endpoints:
  - `/api/wilma/schedules/:studentId`
  - `/api/wilma/grades/:studentId`
  - `/api/wilma/assignments/:studentId`
  - `/api/wilma/messages/:userId`
  - `/api/wilma/attendance/:studentId`
  - `/api/wilma/exams/:studentId`
  - `/api/wilma/stats`

### Phase 3: Form Persistence (Priority 2)
- [ ] Use controlled components with state
- [ ] Preserve form data during navigation
- [ ] Add unsaved changes warning

### Phase 4: Parent Display (Priority 2)
- [ ] Fetch parent data via parent1Id/parent2Id
- [ ] Display parent information in student profiles
- [ ] Show parent contact details

### Phase 5: Admin Settings (Priority 2)
- [ ] Create comprehensive admin panel
- [ ] User management (CRUD)
- [ ] System settings
- [ ] Bulk operations

### Phase 6: Session Management (Priority 3)
- [ ] Implement session timeout (30 minutes)
- [ ] Auto-logout on inactivity
- [ ] Session refresh on activity
- [ ] Warning before logout

### Phase 7: Git Commit (Final)
- [ ] Commit all changes
- [ ] Push to repository

## 🚀 Quick Wins (Do First)

1. **Run seed script** to populate real data
2. **Update Wilma page** to use real API calls
3. **Add session timeout** middleware
4. **Fix form persistence** in WilmaUserManager
5. **Add parent display** in user profiles

## 📝 Files to Modify

1. `client/src/pages/wilma.tsx` - Complete redesign
2. `client/src/components/WilmaUserManager.tsx` - Form persistence + parent display
3. `server/routes.ts` - Session timeout middleware
4. `client/src/pages/wilma-admin.tsx` - Admin panel (create if doesn't exist)

## ⚡ Immediate Actions

Due to the scope, I'll focus on:
1. Running the seed script
2. Adding session timeout
3. Fixing form persistence
4. Showing parent data
5. Committing to git

The full UI redesign would require extensive work. I'll provide the critical functionality updates first.
