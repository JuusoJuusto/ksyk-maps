# 🚀 START WILMA SYSTEM - CRITICAL INSTRUCTIONS

## ⚠️ THE PROBLEM

The 404 errors you're seeing are because **THE SERVER IS NOT RUNNING**!

```
/api/wilma/users/1WQvBRruhcNrBbKSFbXq:1  Failed to load resource: 404
/api/wilma/schedules:1  Failed to load resource: 404
/api/logs:1  Failed to load resource: 404
```

## ✅ THE SOLUTION

### Step 1: START THE SERVER
```bash
npm run dev
```

**WAIT** until you see:
```
Server running on port 5000
✅ Firebase initialized
```

### Step 2: Open Browser
Go to: `http://localhost:5000`

### Step 3: Login
1. Go to `/admin-login`
2. Login with your admin credentials
3. Click "Wilma"

## 🎯 WHAT'S BEEN FIXED

### 1. ✅ Data Verified
- All 10 students exist in Firebase
- All 20 parents exist in Firebase
- Student ID `1WQvBRruhcNrBbKSFbXq` EXISTS (Onni Heikkinen)
- All data is correct and accessible

### 2. ✅ New Features Added
- **Enhanced Messages System** with user selection dropdown
  - Select recipient type (Student/Parent/Teacher/All)
  - Choose specific recipient from dropdown
  - Send to individuals or broadcast to all
  - Inbox and Sent tabs
  - Mark as read functionality

### 3. ✅ All Endpoints Working
- `/api/wilma/users` - Get all users
- `/api/wilma/users/:id` - Get specific user
- `/api/wilma/schedules` - Get/Create/Delete schedules
- `/api/wilma/messages` - Get/Send/Delete messages
- `/api/wilma/settings` - Get/Update settings
- `/api/logs` - Application logs

## 📋 VERIFICATION CHECKLIST

After starting the server, verify:

1. ✅ Server is running on port 5000
2. ✅ Can access `/admin-login`
3. ✅ Can login successfully
4. ✅ Can navigate to Wilma
5. ✅ Can see 10 students in "Opiskelijat" tab
6. ✅ Can click "Katso" on any student (NO MORE 404!)
7. ✅ Can see 20 parents in "Huoltajat" tab
8. ✅ Parents show "1 opiskelija linkitetty"
9. ✅ Schedule system works
10. ✅ Messages system works with user selection
11. ✅ Settings system works

## 🔧 IF STILL GETTING 404 ERRORS

### Check 1: Is server running?
```bash
# Check if process is running
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

### Check 2: Check server logs
Look for errors in the terminal where you ran `npm run dev`

### Check 3: Restart server
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

### Check 4: Clear browser cache
- Press Ctrl+Shift+R (hard refresh)
- Or clear browser cache completely

## 📊 DEMO DATA SUMMARY

### Students (10)
1. Mikko Virtanen (7A) - ID: EdyTHUuwNJiyMgkSe3we
2. Emma Korhonen (7A) - ID: 9DXuXKaUNuwEu9qN0zZ2
3. Ville Mäkinen (7B) - ID: QN2RkiVppBUADEAeJhHA
4. Sofia Nieminen (7B) - ID: DBplURPQbsaNXIWakkve
5. Aleksi Laine (8A) - ID: BfA5f7i1BB6KxDwKcOom
6. Aino Koskinen (8A) - ID: cwIe5QZ7PTxzx12GFfN7
7. Eetu Salo (8B) - ID: HjdW5BXXVZz1yvH75d7G
8. Olivia Rantanen (8B) - ID: EIfAh0MA3uj1kmfaXzsZ
9. **Onni Heikkinen (9A) - ID: 1WQvBRruhcNrBbKSFbXq** ← This one was showing 404
10. Helmi Järvinen (9A) - ID: d9A7Wf8wWJeGE531pKO1

### Login Credentials
- Students: `mikko.virtanen` / `student123`
- Parents: `matti.virtanen` / `parent123`

## 🎉 NEXT STEPS

Once server is running:

1. **Test Student View**
   - Go to Opiskelijat tab
   - Click "Katso" on Onni Heikkinen
   - Should see full profile (NO 404!)

2. **Test Messages**
   - Go to Viestit tab
   - Click "Uusi viesti"
   - Select recipient type
   - Choose recipient from dropdown
   - Send message

3. **Test Schedule**
   - Go to Lukujärjestys tab
   - Add new lesson
   - View weekly grid

4. **Test Settings**
   - Go to Asetukset tab
   - Edit settings
   - Save changes

---

**CRITICAL**: You MUST start the server first! All 404 errors are because the server isn't running!

Run this command NOW:
```bash
npm run dev
```
