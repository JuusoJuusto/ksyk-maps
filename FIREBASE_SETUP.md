# 🔥 Firebase Setup Guide for KSYK Map

## What Firebase Credentials Are Needed?

Firebase requires a **Service Account Key** for server-side authentication. This is a JSON file that contains your project's credentials.

## Step-by-Step Setup:

### 1. Get Your Service Account Key

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: **ksyk-maps**

2. **Navigate to Project Settings**
   - Click the ⚙️ gear icon (top left)
   - Select **Project Settings**

3. **Go to Service Accounts Tab**
   - Click on **Service Accounts** tab
   - You'll see "Firebase Admin SDK"

4. **Generate New Private Key**
   - Click **"Generate New Private Key"** button
   - Confirm by clicking **"Generate Key"**
   - A JSON file will download automatically

5. **Save the File**
   - Rename it to: `serviceAccountKey.json`
   - Place it in your project root folder (same level as package.json)
   - **IMPORTANT**: Add it to `.gitignore` to keep it secret!

### 2. Update Your .env File

Add this line to your `.env` file:

```env
USE_FIREBASE=true
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json
```

### 3. Update .gitignore

Make sure your `.gitignore` includes:

```
serviceAccountKey.json
*.json
!package.json
!tsconfig.json
```

### 4. Update server/firebaseStorage.ts

The file should initialize Firebase Admin like this:

```typescript
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Read service account key
const serviceAccount = require('../serviceAccountKey.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "ksyk-maps",
  });
}
```

## What's in the Service Account Key?

The JSON file contains:
- `type`: "service_account"
- `project_id`: Your Firebase project ID
- `private_key_id`: Unique key identifier
- `private_key`: RSA private key (KEEP SECRET!)
- `client_email`: Service account email
- `client_id`: Client identifier
- `auth_uri`: Authentication URI
- `token_uri`: Token URI
- `auth_provider_x509_cert_url`: Certificate URL
- `client_x509_cert_url`: Client certificate URL

## Security Best Practices:

1. **Never commit** `serviceAccountKey.json` to Git
2. **Never share** the private key publicly
3. **Use environment variables** in production
4. **Rotate keys** periodically for security
5. **Limit permissions** to only what's needed

## Alternative: Environment Variables (Production)

For production deployment (Vercel, Netlify, etc.), use environment variables instead:

```env
FIREBASE_PROJECT_ID=ksyk-maps
FIREBASE_CLIENT_EMAIL=your-service-account@ksyk-maps.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

Then initialize Firebase with:

```typescript
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
```

## Testing Firebase Connection

Once set up, restart your server:

```bash
npm run dev
```

You should see:
```
Using Firebase storage
Admin user created successfully
```

If you see errors, check:
1. Service account key file exists
2. File path is correct in .env
3. JSON file is valid
4. Firebase project ID matches

## Need Help?

- Firebase Documentation: https://firebase.google.com/docs/admin/setup
- Service Account Guide: https://cloud.google.com/iam/docs/service-accounts
- Firebase Console: https://console.firebase.google.com/

---

**Current Status**: Using mock storage for development (works perfectly!)
**To Enable Firebase**: Follow steps above to get service account key
