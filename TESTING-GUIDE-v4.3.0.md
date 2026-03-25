# Testing Guide for v4.3.0

## 🎮 Easter Eggs

### 1. Konami Code Easter Egg
**How to activate:**
1. Go to any page on the site
2. Press these keys in order: ↑ ↑ ↓ ↓ ← → ← → B A
3. You'll be redirected to `/konami-code-activated`
4. Enjoy the confetti and retro gaming tribute!

### 2. Dev Mode Easter Egg
**How to access:**
1. Navigate directly to `/dev-mode-secret`
2. See the terminal-style developer interface
3. View system information and credits

### 3. Original Easter Egg
**How to access:**
1. Navigate to `/secret-easter-egg`
2. Unlocks British English language option
3. Stores unlock status in localStorage

## 🔐 Two-Factor Authentication

### Setup 2FA
1. Log in to admin panel (`/admin-login`)
2. Go to the "2FA" tab (Shield icon)
3. Click "Enable Two-Factor Authentication"
4. Scan QR code with authenticator app:
   - Google Authenticator
   - Microsoft Authenticator
   - Authy
   - Any TOTP-compatible app
5. Or manually enter the secret key
6. Enter the 6-digit code from your app
7. Click "Verify & Enable"

### Test 2FA Login
1. Enable 2FA (see above)
2. Log out
3. Log in again
4. You'll be prompted for 2FA code
5. Enter code from authenticator app
6. Successfully logged in!

### Disable 2FA
1. Go to "2FA" tab in admin panel
2. Enter 6-digit code from authenticator app
3. Click "Disable Two-Factor Authentication"
4. Confirm the action

## 📱 Wilma Integration

### Test Wilma Features
1. Navigate to `/wilma`
2. Test navigation tabs:
   - Frontpage (overview)
   - Schedule (weekly timetable)
   - Grades (course grades)
   - Assignments (homework)
   - Messages (inbox)
   - Attendance (absences)
   - Exams (upcoming/past)
   - Students/Teachers/Rooms/Courses (directories)
   - Settings

3. Test language toggle (FI/EN button)
4. Test URL routing: `/wilma/schedule`, `/wilma/grades`, etc.
5. Verify all sections load correctly

## 📢 Announcement Manager

### Test Announcement Deletion
1. Go to admin panel → "Announcements" tab
2. Create a test announcement
3. Click the delete button (trash icon)
4. Confirm deletion
5. Verify announcement is removed
6. Check that it's also removed from the homepage banner

### Test Announcement Creation
1. Click "New Announcement"
2. Fill in:
   - Title (required)
   - Content (required)
   - English/Finnish translations (optional)
   - Priority (normal/high/urgent)
   - Publish date/time
   - Expiry date (optional)
3. Click "Create Announcement"
4. Verify it appears in the list
5. Check homepage to see the banner

## 🎫 Ticket System

### Test Ticket Integration
1. Look for the floating ticket button (bottom right)
2. Click the ticket icon
3. Verify it opens StudiOWL ticket system
4. Check that "ksyk-maps" is pre-selected
5. Test submitting a ticket (optional)

## 🔍 Admin Panel Features

### Test 2FA Tab
1. Navigate to admin panel
2. Click "2FA" tab
3. Verify QR code generation works
4. Test enable/disable functionality
5. Check status indicators

### Test Other Tabs
1. **Overview** - Check statistics display
2. **Users** - Test user management (owner only)
3. **Builder** - Test building/room creation
4. **Tickets** - View ticket manager
5. **Logs** - Check application logs
6. **Staff** - Manage staff members
7. **Announcements** - Create/edit/delete
8. **Settings** - App settings and danger zone

## 🐛 Bug Fixes to Verify

### 1. Wilma Routing Fix
- ✅ No more "react-router-dom" errors
- ✅ URL changes when switching sections
- ✅ Direct navigation to `/wilma/schedule` works
- ✅ Browser back/forward buttons work

### 2. Announcement Deletion
- ✅ All announcements have delete button
- ✅ Delete confirmation dialog appears
- ✅ Announcements are actually deleted
- ✅ No "permanent" announcements blocking deletion

### 3. Build Errors
- ✅ `npm run build` completes successfully
- ✅ No Vite/Rollup errors
- ✅ All imports resolve correctly

## 📱 Mobile Testing

### Test on Mobile Devices
1. **Easter Eggs**
   - Konami code (use on-screen keyboard)
   - Responsive layouts
   - Confetti animations

2. **2FA Setup**
   - QR code scanning
   - Manual secret entry
   - Code input on mobile keyboard

3. **Wilma**
   - Tab navigation
   - Language toggle
   - All sections responsive

4. **Admin Panel**
   - Tab scrolling
   - Form inputs
   - Button interactions

## 🔐 Security Testing

### Test 2FA Security
1. Enable 2FA
2. Try logging in without code → Should fail
3. Try with wrong code → Should fail
4. Try with correct code → Should succeed
5. Test code expiry (codes change every 30 seconds)

### Test Admin Access
1. Try accessing admin panel without login → Redirect to login
2. Test session persistence
3. Test logout functionality

## 🎯 Performance Testing

### Check Load Times
1. Easter egg pages load quickly
2. 2FA QR code generates instantly
3. Wilma sections switch smoothly
4. Admin panel tabs respond quickly

### Check Bundle Size
1. Run `npm run build`
2. Check dist folder size
3. Verify no huge chunks

## ✅ Checklist

- [ ] Konami code works
- [ ] Dev mode easter egg accessible
- [ ] Original easter egg enhanced
- [ ] 2FA setup works with QR code
- [ ] 2FA setup works with manual entry
- [ ] 2FA login verification works
- [ ] 2FA can be disabled
- [ ] Wilma routing fixed
- [ ] Wilma all sections work
- [ ] Wilma language toggle works
- [ ] Announcements can be deleted
- [ ] Announcements can be created
- [ ] Ticket button opens correct URL
- [ ] Admin panel 2FA tab visible
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Build succeeds
- [ ] All tests pass

## 🚀 Deployment Checklist

Before deploying to production:

1. [ ] All tests pass
2. [ ] No console errors
3. [ ] Build succeeds (`npm run build`)
4. [ ] Environment variables set
5. [ ] Firebase configured
6. [ ] 2FA backend endpoints ready
7. [ ] Database migrations run
8. [ ] Backup created
9. [ ] Rollback plan ready
10. [ ] Monitoring enabled

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify all dependencies installed (`npm install`)
3. Clear browser cache and localStorage
4. Try in incognito mode
5. Submit ticket via ticket system
6. Contact: JuusoJuusto112@gmail.com

---

**Happy Testing! 🎉**
