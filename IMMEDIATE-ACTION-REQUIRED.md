# Immediate Action Required - Wilma System Overhaul

**Date:** May 3, 2026  
**Complexity:** VERY HIGH (15+ major issues)  
**Estimated Time:** 4-6 hours of focused development

---

## ✅ COMPLETED (Just Now)

1. **Vercel Analytics Removed** - Fixed ERR_BLOCKED_BY_CLIENT errors
2. **Opiskelijanumero Display** - Now shows "Ei määritetty" if empty
3. **Password Security** - Already implemented with bcrypt
4. **Tuki Pöllö Intelligence** - Already improved with 150+ phrases
5. **6-Digit Student IDs** - Already implemented
6. **Password Change Popup** - Already implemented

---

## 🚨 CRITICAL ISSUES REMAINING

### 1. White Screen on Student Login (HIGHEST PRIORITY)
**Impact:** Students cannot use the system  
**Root Cause:** 
- TypeError: Cannot read properties of undefined (reading 'date')
- Routing to `/wilma/:userId` instead of `/wilma/:studentId`
- Mock data mixed with real data
- Missing data handling

**Required Fix:**
- Rewrite student view to use ONLY real data
- Fix routing to use 6-digit studentId
- Add proper error handling
- Remove ALL mock data

**Files to Fix:**
- `client/src/pages/wilma.tsx` (main file, 693 lines)
- `client/src/pages/wilma-student.tsx` (if exists)
- `client/src/pages/wilma-home.tsx` (if exists)

### 2. Remove ALL Mock Data (HIGH PRIORITY)
**Impact:** System shows fake data instead of real data  
**Current State:** Mock data for:
- Schedule (mockSchedule)
- Grades (mockGrades)
- Assignments (mockAssignments)
- Messages (mockMessages)
- Attendance (mockAttendance)
- Exams (mockExams)
- Teachers (mockTeachers)
- Study Materials (mockStudyMaterials)

**Required Fix:**
- Delete all mock data arrays
- Fetch real data from API
- Show "Ei tietoja" if no data exists
- NEVER show fallback mock data

### 3. Fix Routing System (HIGH PRIORITY)
**Impact:** Users can manually switch between roles  
**Current State:** Inconsistent routing

**Required Fix:**
```typescript
// Students & Parents
/wilma/:studentId (6-digit ID like 123456)

// Admin, Teacher, Principal
/wilma-admin/:id (Firebase ID)

// Route guards to prevent unauthorized access
```

### 4. Redesign Student UI (MEDIUM PRIORITY)
**Impact:** UI doesn't match old Wilma style  
**Current State:** Modern UI with gradients

**Required Changes:**
- Remove ALL gradients
- Use flat colors: white, light gray, #003d82 blue
- Simple borders (#DDDDDD)
- No fancy animations
- Classic Wilma look

---

## 📋 MEDIUM PRIORITY ISSUES

### 5. Multi-Child Parent System
**Required:**
- Parent can have multiple children
- Parent can switch between children
- Each child has separate view

### 6. Parent Absence Reporting
**Required:**
- Parent can mark child as sick
- Parent fills absence form
- Absence recorded for child

### 7. Fix Email Käyttäjätunnus
**Required:**
- Student käyttäjätunnus = email from student form
- Parent käyttäjätunnus = parent email
- Show correct käyttäjätunnus in email

### 8. Different Emails for Parent/Student
**Required:**
- Student has own email
- Parent has different email
- No shared emails

---

## 🔧 TECHNICAL DEBT

### 9. User Settings 404 Error
**Issue:** `/api/wilma/user-settings/:userId` returns 404  
**Fix:** Endpoint exists in `server/routes.ts` but not registered properly

### 10. Improve Tuki Pöllö (ONGOING)
**Current:** 150+ phrases  
**Goal:** Even smarter responses

---

## 📊 COMPLEXITY BREAKDOWN

| Issue | Complexity | Time Estimate | Priority |
|-------|-----------|---------------|----------|
| White screen fix | VERY HIGH | 2-3 hours | CRITICAL |
| Remove mock data | HIGH | 1-2 hours | CRITICAL |
| Fix routing | HIGH | 1-2 hours | CRITICAL |
| Redesign UI | MEDIUM | 2-3 hours | HIGH |
| Multi-child parent | MEDIUM | 1-2 hours | MEDIUM |
| Parent absence | LOW | 30 min | MEDIUM |
| Fix email | LOW | 30 min | MEDIUM |
| User settings 404 | LOW | 15 min | LOW |

**Total Estimated Time:** 8-13 hours

---

## 🎯 RECOMMENDED APPROACH

### Option 1: Fix Critical Issues First (Recommended)
**Timeline:** 4-6 hours  
**Focus:**
1. Fix white screen (2-3 hours)
2. Remove mock data (1-2 hours)
3. Fix routing (1-2 hours)

**Result:** System works, students can login and see real data

### Option 2: Complete Overhaul
**Timeline:** 8-13 hours  
**Focus:** Fix everything in one go

**Result:** Perfect system, all issues resolved

### Option 3: Incremental Fixes
**Timeline:** 2-3 hours per session, 4-5 sessions  
**Focus:** One major issue per session

**Result:** Gradual improvement over time

---

## 🚀 NEXT STEPS

### Immediate (Next 30 minutes)
1. Investigate white screen error
2. Identify exact line causing TypeError
3. Plan data flow for student view

### Short-term (Next 2-3 hours)
4. Rewrite student view without mock data
5. Fix routing to use studentId
6. Add proper error handling
7. Test student login flow

### Medium-term (Next 4-6 hours)
8. Redesign UI to old Wilma style
9. Implement multi-child parent system
10. Add parent absence reporting

---

## ⚠️ IMPORTANT NOTES

1. **DO NOT** use mock data as fallback
2. **DO NOT** mix mock and real data
3. **ALWAYS** show "Ei tietoja" if no data
4. **ALWAYS** use 6-digit studentId for students
5. **ALWAYS** use Firebase ID for admin/teacher
6. **NEVER** allow manual role switching via URL

---

## 📝 DECISION REQUIRED

**Which approach do you want to take?**

A. **Fix Critical Issues First** (4-6 hours) - Recommended  
   → System works, students can login

B. **Complete Overhaul** (8-13 hours)  
   → Everything perfect

C. **Incremental Fixes** (2-3 hours per session)  
   → Gradual improvement

**Please specify your preference to continue.**

---

**Status:** AWAITING DECISION  
**Last Updated:** May 3, 2026
