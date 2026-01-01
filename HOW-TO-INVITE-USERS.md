# 📧 How to Invite Users - Step by Step Guide

## ✅ What You Need

- Owner account login (JuusoJuusto112@gmail.com)
- User's email address
- Gmail SMTP configured (already done!)

## 🚀 Step-by-Step Instructions

### Step 1: Login as Owner
1. Go to your app: `https://your-app.vercel.app/admin-login`
2. Enter owner credentials:
   - Email: `JuusoJuusto112@gmail.com`
   - Password: `Juusto2012!`
3. Click **Login**

### Step 2: Go to User Management
1. You're now in the Admin Dashboard
2. Click the **Users** tab at the top
3. You'll see a list of all current users

### Step 3: Click "Add User"
1. Click the blue **"Add User"** button (top right)
2. A form will appear

### Step 4: Fill in User Details
Fill in these fields:
- **First Name**: User's first name (e.g., "John")
- **Last Name**: User's last name (e.g., "Doe")
- **Email**: User's email address (e.g., "john@example.com")
- **Role**: Select "Admin" (or other role)

### Step 5: Choose Password Option

You have 2 options:

**Option A: Send Email Invitation** (Recommended)
1. Select the radio button: **"Send email invitation"**
2. You'll see a blue box saying: "📧 An email will be sent to..."
3. That's it! The system will:
   - Generate a random password
   - Send it to the user via email
   - User receives beautiful invitation email

**Option B: Set Password Manually**
1. Select the radio button: **"Set password manually"**
2. Enter a password in the field
3. You'll need to share this password with the user yourself

### Step 6: Click "Create User"
1. Click the blue **"Create User"** button
2. Wait a moment...
3. You'll see a success message!

### Step 7: What Happens Next?

**If you chose "Send email invitation":**
- ✅ User is created in Firebase database
- ✅ Email is sent automatically via Gmail
- ✅ User receives email with:
  - Welcome message
  - Their email address
  - Temporary password
  - Link to login page
- ✅ Success popup shows the password (in case email fails)

**If you chose "Set password manually":**
- ✅ User is created with your password
- ⚠️ You need to tell the user their password yourself

### Step 8: User Logs In
1. User goes to: `https://your-app.vercel.app/admin-login`
2. Enters their email and password
3. Clicks **Login**
4. They're in!



## 📧 What the Email Looks Like

The user receives a beautiful HTML email with:

```
Subject: Welcome to KSYK Maps - Your Account is Ready!

┌─────────────────────────────────────┐
│  🏫 KSYK MAPS                       │
│                                     │
│  Welcome to KSYK Maps!              │
│                                     │
│  Your account has been created.     │
│  Here are your login credentials:   │
│                                     │
│  📧 Email: john@example.com         │
│  🔑 Password: Abc123XYZ             │
│                                     │
│  [Login to KSYK Maps]               │
│                                     │
│  Please change your password after  │
│  your first login.                  │
└─────────────────────────────────────┘
```

## 🔧 How It Works Behind the Scenes

1. **You click "Create User"**
   - Frontend sends request to `/api/users`
   
2. **Server creates user**
   - Generates random password (if email option)
   - Saves user to Firebase Firestore
   - User document includes: email, name, role, password
   
3. **Server sends email**
   - Uses Gmail SMTP (smtp.gmail.com:587)
   - From: JuusoJuusto112@gmail.com
   - Uses app password: `gdbq dlzc vaan xwlf`
   - Sends beautiful HTML email
   
4. **User receives email**
   - Email arrives in their inbox
   - Contains login credentials
   - Has link to login page

## ✅ Verify It Worked

### Check in Admin Panel:
1. Stay in the **Users** tab
2. Look for the new user in the list
3. You should see:
   - Their name
   - Their email
   - Their role
   - Edit/Delete buttons

### Check in Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **ksyk-maps**
3. Click **Firestore Database**
4. Click **users** collection
5. Find the new user document
6. You'll see all their data

### Check Email Was Sent:
1. Look at the success popup after creating user
2. It shows the password (in case email failed)
3. Ask the user to check their inbox
4. Check spam folder if not in inbox

## 🐛 Troubleshooting

### Problem: "Failed to create user"
**Solutions:**
- Check all fields are filled in
- Make sure email is valid format
- Verify user doesn't already exist
- Check browser console for errors

### Problem: Email not received
**Solutions:**
- Check user's spam/junk folder
- Verify email address is correct
- Check Vercel environment variables are set:
  - `EMAIL_HOST=smtp.gmail.com`
  - `EMAIL_PORT=587`
  - `EMAIL_USER=JuusoJuusto112@gmail.com`
  - `EMAIL_PASSWORD=gdbq dlzc vaan xwlf`
- Use the password from success popup to share manually
- Check Vercel function logs for email errors

### Problem: User can't login
**Solutions:**
- Verify email and password are correct
- Check user exists in Firebase Firestore
- Make sure user has `role: admin` set
- Try resetting password in admin panel
- Check browser console for errors

### Problem: "Admin access required"
**Solutions:**
- Make sure you're logged in as owner
- Owner email must be: JuusoJuusto112@gmail.com
- Regular admins cannot create users (owner only)
- Try logging out and back in

## 📝 Quick Reference

**Owner Login:**
- Email: `JuusoJuusto112@gmail.com`
- Password: `Juusto2012!`

**Admin Panel URL:**
- `https://your-app.vercel.app/admin-login`

**User Management:**
- Tab: **Users**
- Button: **Add User**
- Options: Manual password OR Email invitation

**Email Service:**
- Provider: Gmail SMTP
- From: JuusoJuusto112@gmail.com
- Port: 587 (TLS)
- Status: ✅ Configured

## 🎯 Example: Adding a New Admin

Let's say you want to add "Sarah Johnson" as an admin:

1. **Login** as owner
2. Go to **Users** tab
3. Click **Add User**
4. Fill in:
   - First Name: `Sarah`
   - Last Name: `Johnson`
   - Email: `sarah.johnson@example.com`
   - Role: `Admin`
5. Select: **"Send email invitation"**
6. Click **Create User**
7. ✅ Success! Sarah receives email with password
8. Sarah logs in at `/admin-login`
9. Done!

## 💡 Pro Tips

1. **Always use email invitation** - It's automatic and professional
2. **Check spam folder** - Gmail sometimes filters automated emails
3. **Save the password** - The success popup shows it in case email fails
4. **Test with your own email first** - Make sure everything works
5. **Delete test users** - Keep your user list clean

## 🎉 That's It!

You now know how to:
- ✅ Login as owner
- ✅ Add new users
- ✅ Send email invitations
- ✅ Verify users were created
- ✅ Troubleshoot issues

The system is ready to use! Just login and start inviting your team.

---

**Need Help?**
- Check Firebase Console for user data
- Check Vercel logs for email errors
- Verify environment variables are set
- Test with your own email first
