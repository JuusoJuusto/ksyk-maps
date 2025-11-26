# 🎉 COMPLETE SETUP GUIDE - Email & App Customization

## ✅ What's Been Done

### 1. Email System (Resend SDK)
- ✅ Switched from nodemailer to Resend SDK
- ✅ Beautiful HTML email template with gradients
- ✅ Mobile-responsive design
- ✅ Security warnings and instructions
- ✅ Direct login button
- ✅ API key configured: `re_cjxCHufh_6dt8g21HwgeMNLvn81wbdcMC`

### 2. App Customization System
- ✅ Complete Settings tab in Admin Panel
- ✅ 4 customization sections:
  - **Branding**: Colors, logo, app name
  - **Content**: Multilingual text (EN/FI)
  - **Features**: Toggle stats, search, announcements
  - **Contact**: Email and phone
- ✅ All settings save to Firebase
- ✅ Changes apply to all users instantly

---

## 🚀 HOW TO USE

### Email System

#### Step 1: Verify Recipient Emails (REQUIRED for free tier)
1. Go to https://resend.com/login
2. Login to your Resend account
3. Navigate to "Audience" or "Emails"
4. Add the email addresses you want to send to
5. Verify them by clicking the link sent to those emails

#### Step 2: Test Locally
```bash
# Your .env already has:
RESEND_API_KEY=re_cjxCHufh_6dt8g21HwgeMNLvn81wbdcMC

# Restart your server
npm run dev

# Then:
1. Login as admin
2. Go to Admin Panel → Users
3. Click "Add User"
4. Fill in details
5. Select "Send via email"
6. Click Create
7. Check server console for status
8. Check recipient inbox
```

#### Step 3: Deploy to Vercel
```bash
# Add environment variable in Vercel Dashboard:
RESEND_API_KEY=re_cjxCHufh_6dt8g21HwgeMNLvn81wbdcMC

# Then redeploy
```

---

### App Customization

#### Accessing Settings Tab
1. Login as admin at `/admin-login`
2. Go to Admin Panel
3. Click the **"Settings"** tab (7th tab, after Announcements)

#### Customization Options

**Branding Tab:**
- App Name (default display name)
- Logo URL (your custom logo image)
- Primary Color (main theme color with color picker)
- Secondary Color (accent color with color picker)

**Content Tab:**
- Header Titles (English & Finnish)
- App Names (English & Finnish)
- Footer Text (English & Finnish)
- Default Language (en/fi dropdown)

**Features Tab:**
- Show Statistics (toggle campus stats display)
- Show Announcements (toggle announcement banner)
- Enable Search (toggle search functionality)

**Contact Tab:**
- Contact Email (support email)
- Contact Phone (support phone number)

#### Saving Changes
1. Make your changes in any tab
2. Click "Save Changes" button (top right)
3. Page will reload automatically
4. Changes apply to ALL users immediately!

---

## 🔍 Troubleshooting

### Email Not Sending?

**Check 1: API Key**
```bash
# In server console, you should see:
RESEND_API_KEY: SET
```

**Check 2: Recipient Verified**
- Free tier ONLY sends to verified emails
- Verify at https://resend.com/emails

**Check 3: Server Logs**
```bash
# Look for:
✅ Email sent successfully via Resend!
   Email ID: [some-id]

# Or error:
❌ Resend error: [error message]
```

### Settings Tab Not Visible?

**Check 1: Login Status**
- Make sure you're logged in as admin
- Owner email: JuusoJuusto112@gmail.com

**Check 2: Browser Cache**
- Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Or clear browser cache

**Check 3: Tab Count**
- You should see 7 tabs total:
  1. Overview
  2. Users
  3. KSYK Builder
  4. Buildings
  5. Staff
  6. Announcements
  7. **Settings** ← This one!

**Check 4: Console Errors**
- Open browser DevTools (F12)
- Check Console tab for errors
- If you see errors, share them

---

## 📧 Email Template Preview

Your emails now look like this:

```
┌─────────────────────────────────────┐
│  🗺️ Welcome to KSYK Map            │
│  Your admin account is ready!       │
│  (Blue gradient header)             │
├─────────────────────────────────────┤
│                                     │
│  Hello [Name]! 👋                   │
│                                     │
│  Your administrator account has     │
│  been successfully created...       │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Your Temporary Password       │ │
│  │                               │ │
│  │      ABC123xyz!@#             │ │
│  │   (Large, bold, monospace)    │ │
│  └───────────────────────────────┘ │
│                                     │
│  🔒 Important Security Notice       │
│  • Change password after login      │
│  • Never share your password        │
│  • Delete this email after login    │
│                                     │
│  📋 Your Login Credentials          │
│  Email: user@example.com            │
│  Password: See above                │
│  Login URL: ksykmaps.vercel.app     │
│                                     │
│      [🚀 Login to Admin Panel]      │
│         (Blue button)               │
│                                     │
├─────────────────────────────────────┤
│  KSYK Map Admin System              │
│  © 2025 KSYK Map                    │
└─────────────────────────────────────┘
```

---

## 🎨 Customization Example

**Before:**
- App Name: "KSYK Map"
- Primary Color: Blue (#3B82F6)
- Header: "Campus Map"

**After Customization:**
1. Go to Settings → Branding
2. Change App Name to "My School Navigator"
3. Change Primary Color to Green (#10B981)
4. Go to Content tab
5. Change Header Title to "School Campus"
6. Click "Save Changes"
7. **Result**: Entire app updates with new branding!

---

## 📊 Database Structure

Settings are stored in Firebase:
```
appSettings/
  └── default/
      ├── appName: "KSYK Map"
      ├── primaryColor: "#3B82F6"
      ├── secondaryColor: "#2563EB"
      ├── showStats: true
      ├── showAnnouncements: true
      ├── enableSearch: true
      └── ... (all other settings)
```

---

## 🎯 Quick Checklist

### Email Setup
- [ ] API key in .env: `RESEND_API_KEY=re_cjxCHufh_6dt8g21HwgeMNLvn81wbdcMC`
- [ ] Recipient emails verified at resend.com
- [ ] Server restarted
- [ ] Test email sent successfully
- [ ] API key added to Vercel
- [ ] Vercel redeployed

### App Customization
- [ ] Logged in as admin
- [ ] Can see Settings tab (7th tab)
- [ ] Can change branding settings
- [ ] Can change content settings
- [ ] Can toggle features
- [ ] Can add contact info
- [ ] Changes save successfully
- [ ] Changes apply to all users

---

## 🆘 Still Having Issues?

1. **Check server console** for detailed logs
2. **Check browser console** (F12) for errors
3. **Verify you're logged in** as admin
4. **Hard refresh** the page (Ctrl+F5)
5. **Restart the server** completely
6. **Check Resend dashboard** for email delivery status

---

## 🎉 Success Indicators

### Email Working:
```bash
# Server console shows:
✅ Email sent successfully via Resend!
   Email ID: abc123...
```

### Settings Working:
- You can see the Settings tab
- You can change values
- Clicking "Save Changes" shows success toast
- Page reloads with new settings

---

**Everything is set up and ready to go! 🚀**

Just verify your recipient emails at resend.com and you're done!
