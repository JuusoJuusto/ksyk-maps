# Implementation Plan - April 26, 2026 Evening

## 🎨 PHASE 1: Wilma Color Theme Update (30+ files)

### Wilma Official Colors
- **Primary Blue**: #0066CC
- **Primary Purple**: #6B4FBB  
- **Gradient**: `from-[#0066CC] to-[#6B4FBB]`
- **Light Blue**: #00A3E0
- **Accent**: #8B5CF6

### Files to Update (Color Theme)
1. ✅ `client/src/pages/wilma-student.tsx` - STARTED
2. ⏳ `client/src/pages/wilma-teacher.tsx`
3. ⏳ `client/src/pages/wilma-parent.tsx`
4. ⏳ `client/src/pages/wilma-admin-new.tsx`
5. ⏳ `client/src/components/WilmaHomeTab.tsx`
6. ⏳ `client/src/components/ScheduleBuilder.tsx`
7. ⏳ `client/src/components/WilmaTimetable.tsx`
8. ⏳ `client/src/components/WilmaAttendanceCalendar.tsx`
9. ⏳ `client/src/components/WilmaGrades.tsx`
10. ⏳ `client/src/components/WilmaHomework.tsx`
11. ⏳ `client/src/components/EnhancedMessageSystem.tsx`
12. ⏳ `client/src/components/WilmaSettingsTab.tsx`
13. ⏳ `client/src/components/CookieConsent.tsx`
14. ⏳ `client/src/components/AnalyticsDashboard.tsx`
15. ⏳ All other Wilma components...

## 📊 PHASE 2: Real Analytics Data

### Backend Changes
1. ⏳ Update `server/routes.ts`:
   - Add `/api/analytics/summary` endpoint
   - Add `/api/analytics/users` endpoint
   - Add `/api/analytics/activity` endpoint
   - Connect to Firebase/database

2. ⏳ Create analytics collection functions:
   - Track page views in database
   - Track events in database
   - Track user sessions
   - Calculate statistics

### Frontend Changes
1. ⏳ Update `client/src/components/AnalyticsDashboard.tsx`:
   - Fetch real user counts from API
   - Display actual page views
   - Show real event data
   - Add real-time updates

2. ⏳ Update `client/src/lib/analytics.ts`:
   - Enhanced tracking
   - More data points
   - Better error handling

## 🍪 PHASE 3: Enhanced Cookie Consent & Tracking

### Cookie System Improvements
1. ⏳ Update `client/src/components/CookieConsent.tsx`:
   - Add more cookie categories
   - Better UI/UX
   - GDPR compliance
   - Cookie policy link

2. ⏳ Enhanced tracking in `client/src/lib/analytics.ts`:
   - Track clicks
   - Track time on page
   - Track scroll depth
   - Track feature usage
   - Track errors
   - Track performance metrics

3. ⏳ Backend storage:
   - Store analytics in Firebase
   - Aggregate data
   - Privacy-compliant storage
   - Data retention policies

## ⚙️ PHASE 4: More Settings

### Settings Enhancements
1. ⏳ Update `client/src/components/WilmaSettingsTab.tsx`:
   - Language preferences (FI/EN/SV)
   - Notification preferences
   - Privacy settings
   - Display preferences
   - Accessibility options
   - Email preferences
   - Calendar sync
   - Theme customization
   - Font size
   - Compact view toggle

## 📅 PHASE 5: Improved Exam Calendar

### New Component
1. ⏳ Create `client/src/components/WilmaExamCalendar.tsx`:
   - Monthly/weekly view
   - Add/edit/delete exams
   - Exam details form
   - Study reminders
   - Grade entry
   - Statistics view
   - Export functionality

2. ⏳ Backend support:
   - Exam CRUD endpoints
   - Reminder system
   - Grade integration

## 🚀 IMPLEMENTATION STRATEGY

Given the scope (100+ file changes), I'll implement in batches:

### Batch 1 (Now): Critical UI Updates
- Update main Wilma pages with new colors
- Update navigation components
- Update key UI components

### Batch 2 (Next): Analytics
- Connect analytics to real data
- Add backend endpoints
- Update dashboard

### Batch 3 (Then): Cookies & Tracking
- Enhanced cookie consent
- More tracking points
- Database storage

### Batch 4 (After): Settings & Calendar
- More settings options
- Exam calendar
- Additional features

## ⏱️ ESTIMATED TIME
- **Batch 1**: 30-45 minutes (color updates)
- **Batch 2**: 20-30 minutes (analytics)
- **Batch 3**: 20-30 minutes (cookies)
- **Batch 4**: 30-40 minutes (settings/calendar)
- **Total**: ~2 hours for complete implementation

## 📝 NOTES
- Test after each batch
- Build after major changes
- Commit frequently
- Document changes

---

**Status**: 🚧 IN PROGRESS
**Started**: April 26, 2026 - Evening
**Priority**: HIGH - All features requested
