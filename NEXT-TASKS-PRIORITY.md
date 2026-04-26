# Next Tasks - Priority Order

## 🎨 HIGH PRIORITY

### 1. Wilma Color Theme Update
- **Current**: Using #003d82 (dark blue)
- **Target**: Wilma's blue/purple gradient theme
- **Colors to use**:
  - Primary: #0066CC (Wilma blue)
  - Secondary: #6B4FBB (Wilma purple)
  - Gradient: from-[#0066CC] to-[#6B4FBB]
  - Accent: #00A3E0 (light blue)
- **Files to update**:
  - All role-specific pages (student, teacher, parent, admin)
  - Schedule builder
  - Home tabs
  - Navigation components
  - Cards and buttons

### 2. Real Analytics Data
- **Status**: Partially implemented
- **Needs**:
  - Connect AnalyticsDashboard to real backend data
  - Show actual user statistics from database
  - Display real page views, events
  - Add more tracking points
- **Files**: 
  - `client/src/components/AnalyticsDashboard.tsx`
  - `server/routes.ts` (add more analytics endpoints)

### 3. Enhanced Cookie Consent & Data Collection
- **Status**: Basic implementation exists
- **Needs**:
  - Track more user interactions
  - Store analytics in database
  - Add more data points (clicks, time on page, features used)
  - GDPR compliance
- **Files**:
  - `client/src/components/CookieConsent.tsx`
  - `client/src/lib/analytics.ts`
  - `server/routes.ts`

## 📊 MEDIUM PRIORITY

### 4. More Settings Customization
- **Add to WilmaSettingsTab**:
  - Language preferences (FI/EN/SV)
  - Notification preferences
  - Privacy settings
  - Display preferences (compact view, font size)
  - Accessibility options
  - Email preferences
  - Calendar sync settings

### 5. Schedule Settings Integration
- **Already implemented** in ScheduleBuilder
- **Needs**: Make it more visible/accessible
- **Add**:
  - Quick access from schedule view
  - Template schedules
  - Bulk operations

### 6. Improved Exam Calendar (Koekalenteri)
- **Create new component**: `WilmaExamCalendar.tsx`
- **Features**:
  - Monthly/weekly view
  - Add/edit/delete exams
  - Exam details (subject, teacher, room, duration)
  - Study reminders
  - Grade entry after exam
  - Statistics

## 🔄 LOWER PRIORITY

### 7. Additional Features
- Behavior notes system
- Advanced lesson journal
- Parent approval workflows
- Document signing
- Advanced reporting

## ⚠️ NOTES

- SMTP settings already removed ✅
- KSYK logo already integrated ✅
- Schedule builder already comprehensive ✅
- Role-specific home pages already done ✅

## 🚀 RECOMMENDED APPROACH

Given the scope, I recommend:

1. **Phase 1** (Now): Update color theme to Wilma style
2. **Phase 2** (Next): Connect analytics to real data
3. **Phase 3** (Then): Enhanced cookie consent & tracking
4. **Phase 4** (After): More settings & exam calendar

Each phase should be tested before moving to the next.

Would you like me to proceed with Phase 1 (color theme update) first?
