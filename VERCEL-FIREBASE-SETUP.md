# Vercel Firebase Setup - CRITICAL

## 🚨 Why Buildings Don't Show

Buildings exist in Firebase but Vercel can't access them because it needs Firebase credentials!

## ✅ Complete Fix (5 minutes)

### Step 1: Get Your Service Account JSON

You already have `serviceAccountKey.json` in your project. We need to add it to Vercel as an environment variable.

### Step 2: Convert to Single Line

Run this command in your terminal:

```powershell
# Windows PowerShell
$json = Get-Content serviceAccountKey.json -Raw | ConvertFrom-Json | ConvertTo-Json -Compress
Write-Output $json | clip
```

This copies the JSON as a single line to your clipboard.

### Step 3: Add to Vercel

1. Go to: https://vercel.com/dashboard
2. Click your `ksykmaps` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables (click "Add New" for each):

```
Name: USE_FIREBASE
Value: true
Environments: Production, Preview, Development (check all)

Name: FIREBASE_SERVICE_ACCOUNT
Value: [Paste the JSON from clipboard - it should be one long line]
Environments: Production, Preview, Development (check all)
```

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **...** on the latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes

### Step 5: Test

Visit https://ksykmaps.vercel.app - you should now see all 4 buildings!

---

## 🖼️ Logo Fix

The logo is at `/public/ksykmaps_logo.png` and is properly configured. After the Firebase fix and redeploy, the logo will appear because:

1. The public folder is copied during Vercel build
2. The HTML references `/ksykmaps_logo.png`
3. The manifest.json includes it
4. It's set as the favicon

If it still doesn't show after redeploy, check the browser console for 404 errors.

---

## 🌙 Dark Mode

Dark mode is now fully synced:
- Header toggle button
- Settings toggle button  
- Both use the same context
- Saves to localStorage
- Applies to entire app

---

## 📢 Announcement Banner

- Click the announcement text to see full details
- Opens a dialog with complete content
- Synced across all pages

---

## ✅ After These Steps

Everything will work:
- Buildings visible on map
- Buildings in KSYK Builder
- Logo shows everywhere
- Dark mode synced
- Announcements clickable
