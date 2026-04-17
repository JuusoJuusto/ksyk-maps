# URGENT FIXES NEEDED - April 17, 2026

## CRITICAL ISSUES TO FIX NOW:

### 1. ❌ API 404 Errors
**Problem**: `/api/wilma/users?role=student` and `/api/wilma/users?role=parent` return 404
**Root Cause**: The endpoint doesn't support role filtering via query parameters
**Fix**: Add role filtering support to the GET `/api/wilma/users` endpoint

### 2. ❌ Students Not Showing After Creation
**Problem**: Created students don't appear in the list
**Root Cause**: Likely database storage issue or query issue
**Fix**: Verify student creation and retrieval logic

### 3. ❌ Logout Button Not Working
**Problem**: Logout button doesn't redirect to login page
**Fix**: Add proper logout handler with redirect

### 4. ❌ Student ID Field Visible
**Problem**: Student ID field is shown in form (should be auto-generated only)
**Fix**: Remove student ID input field, make it auto-generated on backend

### 5. ❌ Language Not Finnish by Default
**Problem**: UI is in English, should be Finnish
**Fix**: Change all default text to Finnish throughout the app

---

## IMPLEMENTATION PLAN:

### Phase 1: Critical Fixes (DO NOW)
1. Fix API endpoints to support role filtering
2. Fix student creation/retrieval
3. Fix logout functionality
4. Remove student ID field from form
5. Change default language to Finnish

### Phase 2: Email System
6. Implement email sending when student is created
7. Add "Release" button to send bulk emails
8. Auto-generate email addresses for students
9. Send emails to parents

### Phase 3: Database Structure
10. Separate students and parents into different collections/folders
11. Link parents to students properly

### Phase 4: Language Support
12. Add Swedish language option
13. Add language selector to login page

### Phase 5: UI Improvements
14. Apply consistent top navigation bar across all Wilma versions
15. Improve overall UI design

### Phase 6: Features
16. Create functional schedule generation system
17. Add date format settings
18. Make all settings functional
19. Make all tabs functional
20. Add home/summary page

---

## FIXES TO IMPLEMENT:

### Fix 1: API Role Filtering
```typescript
// In server/routes.ts - Update GET /api/wilma/users
app.get('/api/wilma/users', async (req, res) => {
  try {
    const role = req.query.role as string | undefined;
    const wilmaUsers = await storage.getWilmaUsers(role); // Pass role filter
    res.json(wilmaUsers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Wilma users" });
  }
});
```

### Fix 2: Remove Student ID Field
```typescript
// In client/src/pages/student-form.tsx
// Remove the student ID input field
// Keep auto-generation logic on backend only
```

### Fix 3: Logout Handler
```typescript
// In client/src/pages/wilma-admin.tsx
const handleLogout = async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('wilma_user');
    setLocation('/wilma'); // Redirect to Wilma login
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
```

### Fix 4: Finnish Language
Change all UI text to Finnish:
- "Students" → "Opiskelijat"
- "Add Student" → "Lisää opiskelija"
- "Edit" → "Muokkaa"
- "Delete" → "Poista"
- etc.

---

## PRIORITY ORDER:
1. ✅ Fix API 404 errors (CRITICAL)
2. ✅ Fix logout button (CRITICAL)
3. ✅ Remove student ID field (CRITICAL)
4. ✅ Fix student creation/display (CRITICAL)
5. ✅ Change to Finnish language (HIGH)
6. ⏳ Email system (HIGH)
7. ⏳ Database structure (MEDIUM)
8. ⏳ Swedish language (MEDIUM)
9. ⏳ UI improvements (MEDIUM)
10. ⏳ Additional features (LOW)

---

**Status**: Starting implementation now
**Target**: Fix all critical issues first, then move to high priority items
