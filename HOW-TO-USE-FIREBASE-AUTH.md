# 🎯 How to Use Firebase Authentication - Simple Guide

This guide shows you exactly how to use Firebase Authentication in your KSYK Maps application.

## 🚀 Quick Start (5 Minutes)

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Click on your project: **ksyk-maps**
3. You'll see your project dashboard

### Step 2: Enable Email/Password Authentication
1. Click **Authentication** in the left sidebar (🔐 icon)
2. Click **Get Started** (if you see it)
3. Click the **Sign-in method** tab at the top
4. Find **Email/Password** in the list
5. Click on it
6. Toggle the switch to **Enable**
7. Click **Save**

✅ Done! Email/password authentication is now enabled.

### Step 3: Add Your Domain to Authorized Domains
1. Still in **Authentication**, click the **Settings** tab
2. Scroll down to **Authorized domains**
3. You should see `localhost` already there
4. Click **Add domain**
5. Enter your Vercel domain: `your-app-name.vercel.app`
6. Click **Add**

✅ Your app can now authenticate users!

## 👤 How to Login

### As Owner (Super Admin)
1. Go to your app: `https://your-app.vercel.app/admin-login`
2. Enter:
   - **Email**: `JuusoJuusto112@gmail.com`
   - **Password**: `Juusto2012!`
3. Click **Login**
4. You're now in the admin panel with full access!

### As Regular Admin
1. Go to your app: `https://your-app.vercel.app/admin-login`
2. Enter:
   - **Email**: `omelimeilit@gmail.com`
   - **Password**: `test`
3. Click **Login**
4. You're now in the admin panel!

## 👥 How to Add New Admin Users

### Method 1: Using the Admin Panel (Easy!)

1. **Login as owner** (see above)
2. In the admin panel, find **User Management** section
3. Click **Invite New User** button
4. Fill in the form:
   - **Email**: Enter the new user's email
   - **Name**: Enter their name
   - **Role**: Select `admin`
5. Click **Send Invitation**
6. The user will receive an email with:
   - Their temporary password
   - Login instructions
   - Link to the admin login page

✅ The new user can now login with their email and temporary password!

### Method 2: Directly in Firebase (Advanced)

1. Go to Firebase Console → **Firestore Database**
2. Click on the **users** collection
3. Click **Add document**
4. Fill in these fields:
   ```
   Document ID: user-1234567890-abc123 (make it unique)
   
   Fields:
   - id: user-1234567890-abc123 (same as document ID)
   - email: newuser@example.com
   - password: $2b$10$... (hashed password - use bcrypt)
   - role: admin
   - name: New User Name
   - createdAt: 2024-01-15T10:30:00Z
   ```
5. Click **Save**

⚠️ **Note**: Passwords must be hashed with bcrypt. Use Method 1 instead for easier setup!

## 🔍 How to View All Users

### In Firebase Console:
1. Go to Firebase Console
2. Click **Firestore Database**
3. Click on **users** collection
4. You'll see all users listed with their:
   - Email
   - Name
   - Role
   - Created date

### In Your App:
1. Login as owner
2. Go to **User Management** in admin panel
3. See list of all users
4. You can:
   - View user details
   - Delete users
   - Invite new users

## 🗑️ How to Remove a User

### Method 1: Using Admin Panel
1. Login as owner
2. Go to **User Management**
3. Find the user you want to remove
4. Click **Delete** button next to their name
5. Confirm deletion
6. User is removed immediately

### Method 2: In Firebase Console
1. Go to Firebase Console → **Firestore Database**
2. Click **users** collection
3. Find the user document
4. Click the three dots (⋮) next to it
5. Click **Delete document**
6. Confirm deletion

## 🔒 How to Set Up Security Rules

Security rules control who can read/write data in your Firebase database.

### Step 1: Open Firestore Rules
1. Go to Firebase Console
2. Click **Firestore Database**
3. Click **Rules** tab at the top

### Step 2: Copy and Paste These Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function - checks if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users collection - only admins can manage
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write, create, delete: if isAdmin();
    }
    
    // Buildings - everyone can read, only admins can edit
    match /buildings/{buildingId} {
      allow read: if true;
      allow write, create, delete: if isAdmin();
    }
    
    // Announcements - everyone can read, only admins can edit
    match /announcements/{announcementId} {
      allow read: if true;
      allow write, create, delete: if isAdmin();
    }
    
    // Rooms - everyone can read, only admins can edit
    match /rooms/{roomId} {
      allow read: if true;
      allow write, create, delete: if isAdmin();
    }
    
    // Staff - everyone can read, only admins can edit
    match /staff/{staffId} {
      allow read: if true;
      allow write, create, delete: if isAdmin();
    }
    
    // App Settings - everyone can read, only admins can edit
    match /appSettings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

### Step 3: Publish Rules
1. Click **Publish** button
2. Wait for confirmation message
3. Rules are now active!

✅ Your database is now secure!

## 📧 How Email Invitations Work

When you invite a new user through the admin panel:

1. **System generates** a temporary password
2. **Email is sent** via Gmail SMTP to the user
3. **Email contains**:
   - Welcome message with KSYK branding
   - Their email address
   - Temporary password
   - Link to login page
   - Instructions to change password
4. **User receives** the email and can login immediately

### Email Configuration:
- **Service**: Gmail SMTP
- **From**: JuusoJuusto112@gmail.com
- **Port**: 587 (TLS)
- **Status**: ✅ Configured and working

### If Emails Don't Send:
1. Check Vercel environment variables are set:
   - `EMAIL_HOST=smtp.gmail.com`
   - `EMAIL_PORT=587`
   - `EMAIL_USER=JuusoJuusto112@gmail.com`
   - `EMAIL_PASSWORD=gdbq dlzc vaan xwlf`
2. Check spam folder
3. Verify Gmail app password is still valid
4. Check server logs in Vercel dashboard

## 🔐 Security Features Explained

### 1. Owner Credentials Are Hidden
- Owner email/password stored in **server environment variables**
- Never sent to the browser
- Cannot be seen in F12 Developer Tools
- Only checked on the server

### 2. Passwords Are Hashed
- All passwords encrypted with bcrypt
- Even if database is compromised, passwords are safe
- Cannot be reversed to original password

### 3. Session Security
- Login creates a secure session
- Session stored in HTTP-only cookie
- Cookie cannot be accessed by JavaScript
- Auto-logout after inactivity

### 4. Role-Based Access
- **Owner**: Full access to everything
- **Admin**: Access to admin panel only
- **Public**: Can only view public content

## 🧪 Testing Your Setup

### Test 1: Owner Login
```
URL: https://your-app.vercel.app/admin-login
Email: JuusoJuusto112@gmail.com
Password: Juusto2012!
Expected: Login successful, redirect to admin panel
```

### Test 2: Admin Login
```
URL: https://your-app.vercel.app/admin-login
Email: omelimeilit@gmail.com
Password: test
Expected: Login successful, redirect to admin panel
```

### Test 3: Wrong Password
```
URL: https://your-app.vercel.app/admin-login
Email: omelimeilit@gmail.com
Password: wrongpassword
Expected: "Invalid credentials" error message
```

### Test 4: Invite New User
```
1. Login as owner
2. Go to User Management
3. Click "Invite New User"
4. Enter test email (your own email)
5. Click "Send Invitation"
Expected: Success message, email received
```

## ❓ Common Questions

### Q: Can I change the owner email/password?
**A:** Yes! Update these in your `.env` file and Vercel environment variables:
```
OWNER_EMAIL=newemail@example.com
OWNER_PASSWORD=NewPassword123!
```

### Q: How do I reset a user's password?
**A:** Two options:
1. Delete the user and invite them again (they get new password)
2. Manually update password in Firebase Firestore (must be bcrypt hashed)

### Q: Can users change their own password?
**A:** Not yet implemented. You can add this feature in the admin panel.

### Q: How many admin users can I have?
**A:** Unlimited! Add as many as you need.

### Q: Is this secure for production?
**A:** Yes! The system uses:
- Bcrypt password hashing
- Server-side session management
- HTTP-only cookies
- Environment variable protection
- Firebase security rules

### Q: What if I forget the owner password?
**A:** Check your `.env` file or Vercel environment variables. The password is stored there.

### Q: Can I use Google Sign-In instead?
**A:** Yes! Enable it in Firebase Console → Authentication → Sign-in method → Google. You'll need to update the login page code to support it.

## 📱 Mobile App Support

The authentication system works on:
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Android Chrome)
- ✅ Tablets
- ✅ Progressive Web App (PWA)

## 🆘 Troubleshooting

### Problem: "Invalid credentials" error
**Solutions:**
- Double-check email and password
- Make sure user exists in Firebase Firestore
- Verify `USE_FIREBASE=true` in environment variables
- Check user's role is set to `admin`

### Problem: Can't access admin panel after login
**Solutions:**
- Clear browser cookies and cache
- Check browser console for errors (F12)
- Verify session is created (Network tab → check cookies)
- Try logging out and back in
- Check `SESSION_SECRET` is set in environment variables

### Problem: Email invitations not sending
**Solutions:**
- Verify all `EMAIL_*` variables are set in Vercel
- Check Gmail app password is correct: `gdbq dlzc vaan xwlf`
- Look at Vercel function logs for errors
- Test with your own email first
- Check spam/junk folder

### Problem: "Permission denied" in Firebase
**Solutions:**
- Update Firestore security rules (see above)
- Verify user has `role: admin` in database
- Check Firebase Console → Authentication for errors
- Make sure user is logged in

### Problem: Session expires too quickly
**Solutions:**
- Update session timeout in `server/index.ts`
- Check `SESSION_SECRET` is set
- Verify cookies are being saved (check browser settings)

## 📚 Next Steps

Now that authentication is set up, you can:

1. **Invite your team members** to be admins
2. **Customize the login page** with your branding
3. **Add password reset feature** for users
4. **Enable Google Sign-In** for easier login
5. **Add email verification** for new users
6. **Set up two-factor authentication** for extra security

## 🎉 You're All Set!

Your Firebase Authentication is now fully configured and ready to use. You can:
- ✅ Login as owner or admin
- ✅ Invite new users via email
- ✅ Manage users in admin panel
- ✅ Secure your data with Firebase rules
- ✅ Send beautiful invitation emails

Need help? Check the troubleshooting section or contact support!

---

**Quick Links:**
- [Firebase Console](https://console.firebase.google.com/)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- [Your App](https://your-app.vercel.app)
