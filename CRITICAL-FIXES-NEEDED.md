# Critical Fixes Needed - Priority List

## Date: April 23, 2026

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### 1. Login Page - Duplicate Copyright Text ✅
**Issue**: Copyright text appears twice on login page
**Location**: `client/src/pages/wilma.tsx`
**Fix**: Remove duplicate text, keep only one in the background overlay
**Status**: FIXED

### 2. Session Timeout Glitches 🔴
**Issue**: Users getting logged out randomly
**Location**: `client/src/components/SessionTimeoutHandler.tsx`
**Problems**:
- Session timeout too aggressive (30 min)
- Activity tracking may not work properly
- No proper session validation with backend
**Fix Needed**:
- Increase timeout to 60 minutes
- Add debouncing to activity tracking
- Add backend session validation
- Store session token properly

### 3. Student Creation - Missing StudentID 🔴
**Issue**: When creating student, studentId not generated/shown
**Location**: Backend API `/api/wilma/users`
**Problems**:
- StudentID not auto-generated
- Not displayed in Oppilaat tab
**Fix Needed**:
- Auto-generate studentId in format: `KSYK{year}{sequential}`
- Update database schema
- Show in UI immediately after creation

### 4. Staff Tab Shows Everyone 🔴
**Issue**: Henkilökunta tab shows students and parents too
**Location**: Admin panel user management
**Fix Needed**:
- Filter to show only staff roles:
  - admin, teacher, principal, vice_principal
  - kuraattori, terveydenhoitaja, psykologi
  - nuoriso-ohjaaja, sosiaalityontekija
- Exclude: student, parent

### 5. Password Update Not Saving 🔴
**Issue**: When user changes password on first login, database not updated
**Location**: `/api/wilma/users/:id` PUT endpoint
**Fix Needed**:
- Ensure password hash is updated in database
- Update `isTemporaryPassword` flag to false
- Refresh user data in admin panel

---

## 🟡 HIGH PRIORITY (Fix Soon)

### 6. Role-Specific Tabs
**Issue**: Admin sees "Tehtävät" tab (shouldn't)
**Fix Needed**:

**Admin Tabs** (should have):
- Etusivu, Lukujärjestys, Arvosanat, Tuntimerkinnät
- Oppilaat, Henkilökunta, Luokat, Kurssit
- Viestit, Raportit, Asetukset

**Teacher Tabs** (should have):
- Etusivu, Lukujärjestys, Tuntipäiväkirja
- Luokat, Kurssit, Arvosanat, Tuntimerkinnät
- Tehtävät, Viestit, Raportit, Asetukset

**Student Tabs** (should have):
- Etusivu, Lukujärjestys, Arvosanat
- Tehtävät, Tuntimerkinnät, Viestit
- Kurssit, Asetukset

**Parent Tabs** (should have):
- Etusivu, Lukujärjestys, Arvosanat
- Tehtävät, Tuntimerkinnät, Viestit
- Kurssit, Lapset, Asetukset

### 7. Add Support/Ticket System Inside Wilma
**Needed**:
- Support tab in all user types
- Ticket creation form
- Ticket status tracking
- Admin ticket management
**Components to Create**:
- `WilmaSupportTab.tsx`
- `WilmaTicketSystem.tsx`

### 8. Substitute Teacher System
**Needed**:
- Quick substitute assignment
- Substitute can see:
  - Today's schedule
  - Class info
  - Lesson plans
  - Attendance marking
- Simple "I'm substituting for [Teacher]" selector
**Components to Create**:
- `SubstituteTeacherMode.tsx`
- Add to teacher dashboard

---

## 🟢 MEDIUM PRIORITY (Nice to Have)

### 9. Better Error Handling
- Add error boundaries
- Better error messages
- Retry logic for failed requests

### 10. Loading States
- Add skeleton loaders
- Better loading indicators
- Prevent multiple submissions

---

## 📋 Implementation Plan

### Phase 1: Critical Fixes (Today)
1. ✅ Fix duplicate copyright
2. Fix session timeout
3. Fix student ID generation
4. Fix staff filtering
5. Fix password updates

### Phase 2: Role Tabs (Today)
1. Update admin tabs
2. Update teacher tabs
3. Update student tabs
4. Update parent tabs
5. Update support staff tabs

### Phase 3: New Features (Tomorrow)
1. Add support/ticket system
2. Add substitute teacher mode
3. Test everything

---

## 🔧 Technical Details

### Session Timeout Fix:
```typescript
// Increase timeout
const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const WARNING_TIME = 10 * 60 * 1000; // 10 minutes warning

// Add debouncing
const debouncedResetActivity = debounce(resetActivity, 1000);

// Validate with backend
const validateSession = async () => {
  try {
    const response = await fetch('/api/auth/validate', {
      credentials: 'include'
    });
    return response.ok;
  } catch {
    return false;
  }
};
```

### Student ID Generation:
```typescript
// In backend
const generateStudentId = async () => {
  const year = new Date().getFullYear();
  const lastStudent = await db.query(
    'SELECT student_id FROM wilma_users WHERE student_id LIKE $1 ORDER BY student_id DESC LIMIT 1',
    [`KSYK${year}%`]
  );
  
  let sequential = 1;
  if (lastStudent.rows.length > 0) {
    const lastId = lastStudent.rows[0].student_id;
    sequential = parseInt(lastId.slice(-4)) + 1;
  }
  
  return `KSYK${year}${sequential.toString().padStart(4, '0')}`;
};
```

### Staff Filtering:
```typescript
const STAFF_ROLES = [
  'admin', 'teacher', 'principal', 'vice_principal',
  'kuraattori', 'terveydenhoitaja', 'psykologi',
  'nuoriso-ohjaaja', 'sosiaalityontekija'
];

const staffUsers = users.filter(user => 
  STAFF_ROLES.includes(user.role)
);
```

---

## 📝 Files to Modify

### Critical Fixes:
- ✅ `client/src/pages/wilma.tsx` - Remove duplicate
- `client/src/components/SessionTimeoutHandler.tsx` - Fix timeout
- `server/routes.ts` - Add studentId generation
- `server/routes.ts` - Fix staff filtering
- `server/routes.ts` - Fix password update

### Role Tabs:
- `client/src/pages/wilma-admin-new.tsx`
- `client/src/pages/wilma-teacher.tsx`
- `client/src/pages/wilma-student.tsx`
- `client/src/pages/wilma-parent.tsx`
- `client/src/pages/wilma-support-staff.tsx`

### New Features:
- `client/src/components/WilmaSupportTab.tsx` (new)
- `client/src/components/WilmaTicketSystem.tsx` (new)
- `client/src/components/SubstituteTeacherMode.tsx` (new)

---

**Priority**: Fix critical issues first, then role tabs, then new features.
**Timeline**: Critical fixes today, rest tomorrow.
**Testing**: Test each fix before moving to next.
