# Vercel Environment Variables Setup

## CRITICAL: Buildings Not Showing Fix

The buildings are not showing because Vercel needs the `USE_FIREBASE=true` environment variable set.

### Steps to Fix on Vercel:

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your `ksykmaps` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
USE_FIREBASE=true
OWNER_EMAIL=JuusoJuusto112@gmail.com
OWNER_PASSWORD=Juusto2012!
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=JuusoJuusto112@gmail.com
EMAIL_PASSWORD=krsi tnwb gxtu yhpn
SESSION_SECRET=ksyk-map-super-secret-key-change-in-production-2024
```

5. **IMPORTANT**: After adding variables, go to **Deployments** tab
6. Click the **...** menu on the latest deployment
7. Click **Redeploy** to apply the new environment variables

### Why This Fixes Buildings:

- Without `USE_FIREBASE=true`, the API uses mock storage (empty data)
- With `USE_FIREBASE=true`, the API connects to your Firebase database
- Your buildings ARE in Firebase (we confirmed 4 buildings exist)
- They just need the environment variable to be accessible

### After Redeployment:

Buildings will appear on:
- Main map page (/)
- KSYK Builder (/admin-ksyk-management-portal)

The buildings will render at their exact coordinates with custom shapes!
