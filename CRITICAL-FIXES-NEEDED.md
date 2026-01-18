# Critical Fixes Needed for KSYK Maps

## 🚨 MOST IMPORTANT: Buildings Not Showing

**Root Cause**: Vercel environment variable `USE_FIREBASE=true` is NOT set

**Impact**: 
- API returns 0 buildings (using mock storage instead of Firebase)
- Buildings exist in Firebase (confirmed 4 buildings)
- KSYK Builder can't see existing buildings
- Main map shows no buildings

**Fix Required**:
1. Go to Vercel Dashboard → ksykmaps project
2. Settings → Environment Variables
3. Add: `USE_FIREBASE=true`
4. Redeploy the project

**This MUST be done before anything else will work!**

---

## 📋 Other Issues to Fix:

### 1. KSYK Builder Improvements Needed
- ✅ Already has zoom, pan, grid toggle
- ✅ Already has rectangle and custom shape modes
- ✅ Already has snap to grid
- ✅ Already has keyboard shortcuts
- ⚠️ Buildings not visible (due to USE_FIREBASE issue)

### 2. Admin Settings
- Need to check what settings are available
- Make sure they save properly

### 3. Logo/Favicon
- ✅ Logo exists at `/public/ksykmaps_logo.png`
- ✅ Already set as favicon in HTML
- ✅ Already set as apple-touch-icon
- ✅ Already in manifest.json

---

## ✅ Already Fixed:
- Dark mode with Sun/Moon toggle
- Dark mode scrollbars
- Removed 401 auth errors
- Fixed manifest serving
- Announcement expiration
- Easter egg page

---

## 🎯 Next Steps:
1. **USER MUST**: Set `USE_FIREBASE=true` on Vercel and redeploy
2. Then: Test if buildings appear
3. Then: Check admin settings functionality
4. Then: Add any additional KSYK Builder features if needed
