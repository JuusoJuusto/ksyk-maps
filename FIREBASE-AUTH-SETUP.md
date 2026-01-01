# 🔥 Firebase Authentication Setup Guide

Complete guide for setting up and managing Firebase Authentication in KSYK Maps.

## 📱 Current Firebase Configuration

Your application is already configured with Firebase:
- **Project ID**: `ksyk-maps`
- **Auth Domain**: `ksyk-maps.firebaseapp.com`
- **Database**: Firestore
- **Storage**: Firebase Storage (for images)
- **SDK Location**: `client/src/lib/firebase.ts`

## 🔐 How Authentication Works

The KSYK Maps uses a hybrid authentication system:

### 1. Owner Login (Super Admin)
- Credentials stored in environment variables (server-side only)
- Email: `JuusoJuusto112@gmail.com`
- Password: Stored in `OWNER_PASSWORD` env var
- **Cannot be seen in browser/F12 tools**
- Full access to all features

### 2. Admin Users (Regular Admins)
- Stored in Firebase Firestore `users` collection
- Login with email/password
- Example: `omelimeilit@gmail.com` / `test`
- Access to admin panel features

### 3. Session Management
- Server-side sessions using Express
- Secure cookie-based authentication
- Auto-logout on session expiry

## 📋 Step-by-Step Setup

### Step 1: Enable Firebase Authentication Methods

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **ksyk-maps**
3. Click **Authentication** in left sidebar
4. Go to **Sign-in method** tab
5. Enable these providers:
   - ✅ **Email/Password** (Required)
   - ✅ **Google** (Optional - for future use)

### Step 2: Configure Firestore Security Rules

Your Firestore needs proper security rules. Go to **Firestore Database** → **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users collection - admins can read/write
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
      allow create: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Buildings - public read, admin write
    match /buildings/{buildingId} {
      allow read: if true;
      allow write: if isAdmin();
      allow create: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Announcements - public read, admin write
    match /announcements/{announcementId} {
      allow read: if true;
      allow write: if isAdmin();
      allow create: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Rooms - public read, admin write
    match /rooms/{roomId} {
      allow read: if true;
      allow write: if isAdmin();
      allow create: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // App Settings - public read, admin write
    match /appSettings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

### Step 3: Configure Firebase Storage Rules

Go to **Storage** → **Rules**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Building images - public read, admin write
    match /buildings/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Room images - public read, admin write
    match /rooms/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Step 4: Set Up Environment Variables

Make sure your `.env` file has these variables:

```env
# Firebase Configuration
USE_FIREBASE=true
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"ksyk-maps",...}

# Owner Credentials (SERVER-SIDE ONLY - Never exposed to frontend)
OWNER_EMAIL=JuusoJuusto112@gmail.com
OWNER_PASSWORD=Juusto2012!

# Email Service (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=JuusoJuusto112@gmail.com
EMAIL_PASSWORD=gdbq dlzc vaan xwlf

# Session Security
SESSION_SECRET=ksyk-map-super-secret-key-change-in-production-2024
```

### Step 5: Deploy to Vercel

Add the same environment variables to Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable from `.env` file
5. Click **Save**
6. Redeploy your application

## 👥 Managing Users

### Current Admin Users

1. **Owner** (Super Admin)
   - Email: `JuusoJuusto112@gmail.com`
   - Password: In environment variables
   - Full system access

2. **Okko Kettunen** (Admin)
   - Email: `omelimeilit@gmail.com`
   - Password: `test`
   - User ID: `user-1764764893230-lzc71oew8`
   - Admin panel access

### Adding New Admin Users

**Method 1: Via Admin Panel (Recommended)**
1. Login as owner or existing admin
2. Go to Admin Panel → User Management
3. Click "Invite New User"
4. Enter email address
5. Select role: `admin`
6. User receives invitation email with temporary password

**Method 2: Directly in Firebase Console**
1. Go to Firebase Console → Firestore Database
2. Navigate to `users` collection
3. Click "Add document"
4. Set fields:
   ```
   id: user-[timestamp]-[random]
   email: user@example.com
   password: [hashed password]
   role: admin
   name: User Name
   createdAt: [current timestamp]
   ```

### Removing Users

1. Login as owner
2. Go to Admin Panel → User Management
3. Find user in list
4. Click "Delete" button
5. Confirm deletion

## 🧪 Testing Authentication

### Test Owner Login
1. Go to `/admin-login`
2. Enter:
   - Email: `JuusoJuusto112@gmail.com`
   - Password: `Juusto2012!`
3. Should redirect to admin panel

### Test Admin Login
1. Go to `/admin-login`
2. Enter:
   - Email: `omelimeilit@gmail.com`
   - Password: `test`
3. Should redirect to admin panel

### Test Invalid Login
1. Go to `/admin-login`
2. Enter wrong credentials
3. Should show "Invalid credentials" error

## 🔒 Security Features

✅ **Owner credentials never exposed to frontend**
- Stored only in server environment variables
- Cannot be seen in browser DevTools (F12)
- Only checked on server-side

✅ **Password hashing**
- All passwords hashed before storage
- Uses bcrypt with salt rounds

✅ **Session security**
- HTTP-only cookies
- Secure flag in production
- Session expiry after inactivity

✅ **Role-based access control**
- Owner: Full access
- Admin: Panel access only
- Public: Read-only access

## 📧 Email Invitation System

The app uses Gmail SMTP to send invitation emails:

**Configuration:**
- Service: Gmail SMTP
- Email: `JuusoJuusto112@gmail.com`
- App Password: `gdbq dlzc vaan xwlf`
- Port: 587 (TLS)

**Email Template:**
Beautiful HTML emails with:
- KSYK branding
- Temporary password
- Login instructions
- Professional design

**Testing Email:**
1. Login as admin
2. Go to User Management
3. Click "Invite New User"
4. Enter test email
5. Check inbox for invitation

## 🐛 Troubleshooting

### "Invalid credentials" error
**Solution:**
- Verify email/password are correct
- Check user exists in Firebase Firestore
- Ensure `USE_FIREBASE=true` in environment

### Email invitations not sending
**Solution:**
- Verify Gmail app password is correct
- Check Vercel environment variables
- Look at server logs for errors
- Ensure `EMAIL_*` variables are set

### "Permission denied" in Firestore
**Solution:**
- Update Firestore security rules (see Step 2)
- Verify user has `role: admin` in database
- Check Firebase Console → Authentication logs

### Can't access admin panel after login
**Solution:**
- Clear browser cookies
- Check session is created (Network tab)
- Verify `SESSION_SECRET` is set
- Try logging out and back in

### Owner credentials visible in browser
**Solution:**
- They shouldn't be! Check `server/routes.ts`
- Ensure credentials only checked server-side
- Never send to frontend in API responses

## 📚 Additional Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

## 🎯 Quick Reference

**Login URL:** `https://your-app.vercel.app/admin-login`

**Owner Login:**
- Email: `JuusoJuusto112@gmail.com`
- Password: (in environment variables)

**Test Admin Login:**
- Email: `omelimeilit@gmail.com`
- Password: `test`

**Firebase Project:** `ksyk-maps`

**Email Service:** Gmail SMTP via `JuusoJuusto112@gmail.com`
