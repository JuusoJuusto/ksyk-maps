# 🔍 Buildings Debug - DEPLOYED

## What I Just Did

I've added **extensive debug logging** and a **diagnostic page** to figure out why buildings aren't showing on Vercel.

### Debug Features Added

1. **API Logging** (`api/index.ts`)
   - Logs when buildings endpoint is called
   - Shows how many buildings are found
   - Displays full building data in console

2. **Storage Logging** (`server/storage.ts`)
   - Shows which storage backend is being used (Firebase/Mock)
   - Displays environment variable status
   - Confirms Firebase credentials are loaded

3. **Frontend Logging** (`client/src/pages/home.tsx`)
   - Logs when fetching buildings
   - Shows received building count
   - Displays building data in browser console

4. **Visual Debug Counter**
   - Shows "Buildings: X" text on the map
   - Helps see if buildings are being received

5. **Debug Page** (`/debug-buildings`)
   - Complete diagnostic page
   - Shows raw API response
   - Lists all building details
   - Environment information

## 🧪 How to Debug

### Step 1: Check the Debug Page
Visit: **https://ksykmaps.vercel.app/debug-buildings**

This page will show you:
- ✅ How many buildings the API returns
- ✅ Raw JSON response from `/api/buildings`
- ✅ Detailed info for each building
- ✅ Any error messages

### Step 2: Check Vercel Logs
1. Go to https://vercel.com/dashboard
2. Click your `ksykmaps` project
3. Go to **Deployments** → Click latest deployment
4. Click **Functions** → Click `/api`
5. Look for these log messages:
   ```
   🔧 Storage initialization - Environment check:
   ✅ Using Firebase storage
   🏢 Fetching buildings from storage...
   ✅ Found X buildings
   ```

### Step 3: Check Browser Console
1. Visit https://ksykmaps.vercel.app
2. Open browser console (F12)
3. Look for these messages:
   ```
   🏢 Fetching buildings from API...
   ✅ Received buildings: X
   ```

## 🔥 Expected Results

### If Firebase is Working:
- Debug page shows 5 buildings (M, L buildings)
- Map shows "Buildings: 5" text
- Buildings appear on the map
- Vercel logs show "Using Firebase storage"

### If Firebase is NOT Working:
- Debug page shows 7 buildings (mock data: M, K, L, R, A, U, OG)
- Map shows "Buildings: 7" text
- Buildings appear but at different positions
- Vercel logs show "Using mock storage"

## 🎯 What to Check on Vercel

Make sure these environment variables are set:

1. **USE_FIREBASE** = `true`
2. **FIREBASE_SERVICE_ACCOUNT** = `{your JSON credentials as one line}`

To verify:
1. Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Check both variables exist
4. Make sure they're enabled for Production, Preview, and Development

## 📊 Local Test Results

When I tested locally, Firebase is working:
```
✅ Found 5 buildings in Firebase
- M building at (1350, 800)
- L building at (600, 450)
- M building at (1250, 700)
- M building at (1300, 750)
- M building at (1250, 750)
```

## 🚀 Next Steps

1. **Visit the debug page** to see what's happening
2. **Check Vercel logs** to confirm Firebase is being used
3. **Share the results** with me so I can fix any issues

The debug page will tell us exactly what's wrong!
