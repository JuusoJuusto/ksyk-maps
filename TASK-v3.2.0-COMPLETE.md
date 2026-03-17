# v3.2.0 Complete Task List

## ✅ COMPLETED
1. Schedule tab - Added "Coming Soon" message
2. Settings tab - Added pt-20 padding to prevent tab bar overlap
3. Quick Actions - Added spacing (space-y-3, mt-4) and removed gradients
4. Admin Login Logs - Added database schema
5. Enhanced App Settings - Added Easter egg toggle, events toggle, maintenance mode

## 🚧 IN PROGRESS - CRITICAL FIXES NEEDED

### 1. Remove ALL Gradient Colors
**Files to update:**
- `client/src/pages/home.tsx` - Remove all `bg-gradient-*` classes
- `client/src/components/Header.tsx` - Replace gradients with solid colors
- `client/src/pages/lunch.tsx` - Remove gradient backgrounds
- `client/src/pages/admin.tsx` - Replace gradient backgrounds
- `client/src/pages/admin-login.tsx` - Remove gradients
- `client/src/index.css` - Remove gradient utility classes

**Replace with:**
- Light theme: `bg-blue-50`, `bg-white`
- Dark theme: `bg-gray-800`, `bg-gray-900`
- Blueprint theme: `bg-blue-900`, `bg-cyan-900`

### 2. Fix Blueprint Theme
**Issues:**
- Blueprint buttons show gradient when inactive
- Theme doesn't work in admin panel
- Outline colors don't match other themes

**Fix in `client/src/components/Header.tsx`:**
```tsx
// Blueprint button (both mobile menus)
className={`p-2 text-xs rounded-lg border transition-all ${
  theme === 'blueprint' 
    ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg' 
    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
}`}
```

**Fix in `client/src/pages/home.tsx`:**
```tsx
// Theme selection cards - make all consistent
className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
  settings.theme === 'blueprint' 
    ? 'border-blue-500 bg-blue-50' 
    : 'border-gray-200 hover:border-blue-300'
}`}
```

### 3. Theme System Tooltip Colors
**Fix in `client/src/contexts/ThemeContext.tsx`:**
Add tooltip color variables that match each theme:
```tsx
if (theme === 'blueprint') {
  document.documentElement.style.setProperty('--tooltip-bg', '#0a1628');
  document.documentElement.style.setProperty('--tooltip-text', '#00d4ff');
} else if (theme === 'dark') {
  document.documentElement.style.setProperty('--tooltip-bg', '#1f2937');
  document.documentElement.style.setProperty('--tooltip-text', '#f1f5f9');
} else {
  document.documentElement.style.setProperty('--tooltip-bg', '#1f2937');
  document.documentElement.style.setProperty('--tooltip-text', '#ffffff');
}
```

### 4. Admin Panel Settings UI
**Add to `client/src/components/AppSettingsManager.tsx`:**

New Features Tab:
```tsx
<TabsContent value="features" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>Feature Toggles</CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      <Switch
        checked={settings.enableEasterEgg}
        onCheckedChange={(checked) => setSettings({ ...settings, enableEasterEgg: checked })}
        label="Enable Easter Egg"
      />
      <Switch
        checked={settings.enableEvents}
        onCheckedChange={(checked) => setSettings({ ...settings, enableEvents: checked })}
        label="Enable Events System"
      />
      <Switch
        checked={settings.enableTicketSystem}
        onCheckedChange={(checked) => setSettings({ ...settings, enableTicketSystem: checked })}
        label="Enable Ticket System"
      />
      <Switch
        checked={settings.maintenanceMode}
        onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
        label="Maintenance Mode"
      />
    </CardContent>
  </Card>
</TabsContent>
```

### 5. Login Logging Implementation
**Add to `server/routes.ts` in admin-login endpoint:**

```typescript
// After successful login
await storage.createAdminLoginLog({
  userId: user.id,
  email: normalizedEmail,
  userName: `${user.firstName} ${user.lastName}`,
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.headers['user-agent'],
  loginStatus: 'success',
  sessionId: req.sessionID
});

// After failed login
await storage.createAdminLoginLog({
  userId: null,
  email: normalizedEmail,
  userName: null,
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.headers['user-agent'],
  loginStatus: 'failed',
  failureReason: 'Invalid credentials'
});
```

### 6. AI Builder Improvements
**Enhance `client/src/components/UltimateKSYKBuilder.tsx`:**

Improve recognition algorithms:
- Increase Canny edge detection sensitivity
- Add adaptive thresholding
- Implement corner detection for room boundaries
- Add text recognition for room numbers
- Improve line detection with probabilistic Hough transform
- Add shape classification (rectangular vs irregular rooms)

```typescript
// Enhanced edge detection
const edges = cv.Canny(gray, 30, 90); // Lower thresholds for better detection

// Adaptive thresholding
const adaptive = cv.adaptiveThreshold(
  gray, 
  255, 
  cv.ADAPTIVE_THRESH_GAUSSIAN_C, 
  cv.THRESH_BINARY, 
  11, 
  2
);

// Corner detection
const corners = cv.goodFeaturesToTrack(gray, {
  maxCorners: 100,
  qualityLevel: 0.01,
  minDistance: 10
});
```

## 📋 PRIORITY ORDER
1. Remove ALL gradients (CRITICAL)
2. Fix Blueprint theme buttons and colors
3. Add login logging
4. Update admin panel settings UI
5. Fix theme tooltip colors
6. Enhance AI Builder

## 🎯 EXPECTED OUTCOME
- Clean, consistent theme system with solid colors only
- Blueprint theme works identically to other themes (just different colors)
- All mobile spacing issues resolved
- Admin panel has full settings control
- Login activity is tracked in database
- AI Builder has significantly better recognition
