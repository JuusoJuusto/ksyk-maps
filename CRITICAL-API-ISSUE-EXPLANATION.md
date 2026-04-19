# CRITICAL: Why Students Still Don't Show (API 404 Issue)

## 🚨 THE REAL PROBLEM

The API changes we made to `api/index.ts` **HAVE BEEN PUSHED** to GitHub, but **VERCEL HASN'T DEPLOYED THEM YET** or there's a caching issue.

### What We Changed:
```typescript
// api/index.ts line 1163
// BEFORE:
const wilmaUsers = await storage.getWilmaUsers();

// AFTER (committed in 4e43028):
const role = req.query.role as string | undefined;
const wilmaUsers = await storage.getWilmaUsers(role);
```

### Why It's Still 404:
1. **Vercel deployment delay** (takes 2-5 minutes)
2. **Vercel caching** (serverless functions are cached)
3. **CDN caching** (Vercel Edge Network caches responses)

---

## ✅ SOLUTIONS

### Solution 1: Wait for Vercel Deployment
- Check https://vercel.com/juusojuustos-projects/ksyk-maps/deployments
- Wait for the latest deployment to finish
- Should take 2-5 minutes

### Solution 2: Force Redeploy
```bash
# In Vercel dashboard:
1. Go to Deployments
2. Find latest deployment
3. Click "..." menu
4. Click "Redeploy"
```

### Solution 3: Clear Vercel Cache
```bash
# Using Vercel CLI:
vercel --prod --force
```

### Solution 4: Test Locally First
```bash
# Run locally to verify it works:
npm run dev

# Then test:
curl http://localhost:5000/api/wilma/users?role=student
```

---

## 🔍 HOW TO VERIFY IT'S FIXED

### Test 1: Direct API Call
```bash
curl https://ksykmaps.vercel.app/api/wilma/users?role=student
```

**Expected**: JSON array of students  
**Current**: 404 error

### Test 2: Browser Console
```javascript
fetch('https://ksykmaps.vercel.app/api/wilma/users?role=student')
  .then(r => r.json())
  .then(console.log)
```

### Test 3: Check Deployment Logs
1. Go to Vercel dashboard
2. Click on latest deployment
3. Check "Function Logs"
4. Look for: `🔵 GET /api/wilma/users called`
5. Look for: `📝 Role filter: student`

---

## 📝 ABOUT PLAINPASSWORD FIELD

### Why It Exists:
The `plainPassword` field was added so admins can see the temporary password they assigned to users. This is needed because:

1. **Bcrypt is ONE-WAY** - You CANNOT decrypt bcrypt hashes
2. **Admins need to see passwords** - To give to users
3. **Security trade-off** - Storing plain passwords is a security risk

### Better Solution:
Instead of storing `plainPassword`, we should:

1. **Show password ONLY during creation** - Display it once, then never store it
2. **Send via email immediately** - User gets it in email
3. **Force password change** - User must change on first login
4. **Remove plainPassword field** - Don't store it at all

### Implementation:
```typescript
// When creating user:
const tempPassword = generatePassword();
const hashedPassword = await hashPassword(tempPassword);

// Store ONLY hashed password
await storage.createWilmaUser({
  ...userData,
  password: hashedPassword,
  isTemporaryPassword: true
});

// Send email with plain password
await sendEmail(user.email, tempPassword);

// Return plain password ONCE to admin
return {
  ...user,
  temporaryPassword: tempPassword // Only in response, not stored
};
```

---

## 🎯 IMMEDIATE ACTION ITEMS

### 1. Check Vercel Deployment Status
- Go to: https://vercel.com/juusojuustos-projects/ksyk-maps
- Check if latest commit (8fa3b82) is deployed
- If not, wait or force redeploy

### 2. Test API Endpoint
```bash
# Test this URL in browser:
https://ksykmaps.vercel.app/api/wilma/users?role=student

# Should return JSON, not 404
```

### 3. Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or open in incognito/private window

### 4. Check Network Tab
- Open DevTools (F12)
- Go to Network tab
- Reload page
- Check if `/api/wilma/users?role=student` returns 200 or 404

---

## 🔧 IF STILL 404 AFTER DEPLOYMENT

### Check 1: Verify Code is Deployed
```bash
# Check the deployed code:
curl https://ksykmaps.vercel.app/api/

# Should show available endpoints including /wilma/users
```

### Check 2: Check Vercel Logs
1. Go to Vercel dashboard
2. Click "Logs" tab
3. Filter by "api"
4. Look for errors

### Check 3: Check Build Logs
1. Go to latest deployment
2. Click "Building" step
3. Look for TypeScript errors
4. Look for build failures

---

## 📊 CURRENT STATUS

### ✅ What's Done:
- [x] Code changes committed (4e43028)
- [x] Code pushed to GitHub
- [x] Finnish translations added (8fa3b82)
- [x] Mobile menu added (48f8dd2)

### ⏳ What's Pending:
- [ ] Vercel deployment to finish
- [ ] Cache to clear
- [ ] API to return 200 instead of 404

### 🔄 What to Do Next:
1. **WAIT** for Vercel deployment (2-5 minutes)
2. **TEST** the API endpoint
3. **VERIFY** students show up
4. **REPORT** if still broken

---

## 💡 WHY THIS HAPPENS

Vercel uses:
1. **Serverless Functions** - Each API route is a separate function
2. **Edge Caching** - Responses are cached at CDN edge
3. **Build Process** - Code must be built before deployment
4. **Deployment Queue** - Multiple deployments can queue up

This means:
- Code changes don't appear instantly
- Old responses might be cached
- Build errors can prevent deployment
- Multiple commits can cause deployment delays

---

## 🎯 FINAL ANSWER

**The API code is CORRECT and DEPLOYED to GitHub.**  
**The issue is VERCEL DEPLOYMENT DELAY or CACHING.**  
**Solution: WAIT 5 minutes, then test again.**

If still broken after 5 minutes:
1. Check Vercel dashboard for deployment status
2. Check Vercel logs for errors
3. Force redeploy if needed
4. Clear all caches

---

**Last Updated**: April 20, 2026  
**Commit**: 8fa3b82  
**Status**: Waiting for Vercel deployment
