# Wilma System Comprehensive Fixes Plan

**Date:** May 3, 2026  
**Status:** IN PROGRESS

---

## Issues to Fix

### 1. ✅ Tuki Pöllö Intelligence (DONE)
- Already improved with 150+ phrases
- Understands casual Finnish
- 15+ topic categories

### 2. Multi-Child Parent System
**Current:** Parents can only have one child  
**Required:** Parents can have multiple children

**Implementation:**
- Add `children` array to parent user profile
- Parent login shows list of children
- Parent can switch between children
- Each child has separate view

### 3. Vercel Analytics Errors
**Error:** `/_vercel/insights/script.js` blocked by client  
**Fix:** Remove Vercel Analytics or make it optional

### 4. User Settings 404 Error
**Error:** `/api/wilma/user-settings/:userId` returns 404  
**Fix:** Endpoint exists in `server/routes.ts` but not properly registered in `api/index.ts`

### 5. White Screen on Student Login
**Error:** Student login redirects to `/wilma/:userId` but shows white screen  
**Root Cause:** 
- TypeError: Cannot read properties of undefined (reading 'date')
- Missing data handling
- Incorrect routing

**Fix:**
- Fix data loading in student view
- Handle undefined data gracefully
- Fix routing to use studentId instead of userId

### 6. ✅ Password Change Popup (DONE)
- Already implemented for temporary passwords
- Shows on first login

### 7. ✅ Password Hashing (DONE)
- Already using bcrypt
- Secure implementation

### 8. ✅ 6-Digit Student IDs (DONE)
- Already implemented (100000-999999)
- Validation in place

### 9. Email Käyttäjätunnus Fix
**Current:** Email käyttäjätunnus doesn't match student form  
**Required:** Use the same username as entered in student form

**Fix:**
- Student käyttäjätunnus = email from student form
- Parent käyttäjätunnus = parent email (default)
- Show correct käyttäjätunnus in email template

### 10. Student Wilma UI Improvements
**Current:** Modern UI with gradients  
**Required:** Old Wilma style - clean, simple, no gradients

**Changes:**
- Remove gradient backgrounds
- Use flat colors (white, light gray, blue)
- Simple borders
- Classic Wilma look
- Remove fancy animations

### 11. Remove Mock Data
**Current:** Student view uses mock data for schedule, grades, etc.  
**Required:** Use ONLY real data from API

**Fix:**
- Remove all mock data arrays
- Fetch real data from API
- Show "Ei tietoja" if no data
- Never show fallback mock data

### 12. Fix Routing System
**Current:** Inconsistent routing  
**Required:**
- Students: `/wilma/:studentId` (6-digit ID)
- Parents: `/wilma/:studentId` (can switch children)
- Admin/Teacher: `/wilma-admin/:id` (Firebase ID)
- Prevent manual URL switching between roles

**Implementation:**
- Route guard to check user role
- Redirect if accessing wrong route
- Use studentId (6-digit) for students/parents
- Use Firebase ID for admin/teacher

### 13. Different Emails for Parent/Student
**Current:** Parent and student might share email  
**Required:** Separate emails

**Implementation:**
- Student email: student's own email
- Parent email: parent's email (different)
- Parent can have multiple children with different emails

### 14. Parent Absence Reporting
**Current:** Parents can't mark children as sick  
**Required:** Parents can report absences for their children

**Implementation:**
- Parent view shows "Ilmoita poissaolo" button
- Parent selects child (if multiple)
- Parent fills absence form
- Absence is recorded for child

### 15. Fix Empty Opiskelijanumero
**Current:** Student view page shows empty Opiskelijanumero  
**Required:** Show 6-digit student ID

**Fix:**
- Ensure `studentId` field is populated
- Display in student detail view
- Format: 6 digits (e.g., 123456)

---

## Implementation Order

### Phase 1: Critical Fixes (Immediate)
1. Fix white screen on student login
2. Fix user settings 404 error
3. Fix empty Opiskelijanumero
4. Remove Vercel Analytics errors

### Phase 2: Data & Routing (High Priority)
5. Remove all mock data
6. Fix routing system (studentId vs userId)
7. Implement route guards
8. Fix email käyttäjätunnus

### Phase 3: UI Improvements (Medium Priority)
9. Redesign student Wilma UI (old Wilma style)
10. Remove gradients and fancy animations
11. Simplify color scheme

### Phase 4: Parent Features (Medium Priority)
12. Multi-child parent system
13. Parent absence reporting
14. Different emails for parent/student

---

## Technical Details

### Routing Structure
```
/wilma                          → Login page
/wilma/:studentId               → Student view (6-digit ID)
/wilma/:studentId/:section      → Student view with section
/wilma-admin/:id                → Admin/Teacher view (Firebase ID)
/wilma-admin/:id/:section       → Admin view with section
```

### User Roles
- `student` → `/wilma/:studentId`
- `parent` → `/wilma/:studentId` (can switch children)
- `teacher` → `/wilma-admin/:id`
- `admin` → `/wilma-admin/:id`
- `principal` → `/wilma-admin/:id`
- `vice_principal` → `/wilma-admin/:id`

### Data Flow
```
Login → Check role → Route to correct page
Student → Fetch by studentId (6-digit)
Parent → Fetch children → Select child → Show child's data
Admin → Fetch by Firebase ID → Show admin panel
```

### Email Template
```
Käyttäjätunnus: [email from student form]
Salasana: [plain password]
Opiskelijanumero: [6-digit student ID]
```

### Old Wilma UI Style
- Background: White (#FFFFFF)
- Header: Blue (#003d82)
- Borders: Light gray (#DDDDDD)
- Text: Dark gray (#333333)
- Buttons: Flat blue (#003d82)
- No gradients
- No shadows (or minimal)
- Simple, clean, functional

---

## Files to Modify

### Critical
1. `client/src/pages/wilma.tsx` - Fix routing, remove mock data
2. `api/index.ts` - Fix user-settings endpoint
3. `client/src/pages/student-detail.tsx` - Fix empty Opiskelijanumero
4. `client/src/lib/analytics.ts` - Remove Vercel Analytics

### UI Changes
5. `client/src/pages/wilma-student.tsx` - Redesign (if exists)
6. `client/src/styles/wilma-theme.css` - Update styles

### Parent Features
7. `shared/schema.ts` - Add children array to parent
8. `server/routes.ts` - Add parent-children endpoints
9. `client/src/components/ParentView.tsx` - Create parent view

### Email
10. `server/emailService.ts` - Fix email template

---

## Testing Checklist

### Student Login
- [ ] Student can login with email
- [ ] Redirects to `/wilma/:studentId`
- [ ] Shows real data (no mock)
- [ ] Opiskelijanumero displays correctly
- [ ] No white screen
- [ ] No console errors

### Parent Login
- [ ] Parent can login
- [ ] Shows list of children
- [ ] Can switch between children
- [ ] Can report absence for child
- [ ] Shows child's data correctly

### Admin Login
- [ ] Admin can login
- [ ] Redirects to `/wilma-admin/:id`
- [ ] Shows admin panel
- [ ] Can manage students

### UI
- [ ] No gradients
- [ ] Old Wilma style
- [ ] Clean and simple
- [ ] No fancy animations

### Data
- [ ] No mock data shown
- [ ] All data from API
- [ ] "Ei tietoja" if no data
- [ ] No fallback mock data

---

## Status: READY TO IMPLEMENT
