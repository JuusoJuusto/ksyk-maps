# 📧 Email Testing Guide - KSYK Map

## ✅ Email Configuration Status

Your email is **CONFIGURED** and ready to use:
- **Email:** JuusoJuusto112@gmail.com
- **SMTP:** smtp.gmail.com:587
- **App Password:** ✅ SET (vvzvffmzwbdibwrb)

## 🧪 How to Test Emails

### Method 1: Create a New User (Recommended)
1. Start the server: `npm run dev`
2. Login as admin:
   - Email: JuusoJuusto112@gmail.com
   - Password: Juusto2012!
3. Go to Admin Dashboard → Users tab
4. Click "Add New User"
5. Fill in the form:
   - Email: (any email you want to test)
   - First Name: Test
   - Last Name: User
   - Role: Admin
   - Password Option: **"Email password to user"**
6. Click "Create User"
7. Check the server console for detailed logs
8. Check the email inbox

### Method 2: Use Test Endpoint
1. Login as admin first
2. Open browser console or use curl:

```bash
# Get your session cookie from browser DevTools → Application → Cookies
# Then run:
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE" \
  -d '{"email":"your-test-email@example.com"}'
```

Or use the browser console:
```javascript
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'your-test-email@example.com' })
})
.then(r => r.json())
.then(console.log);
```

## 📊 What to Look For

### In Server Console:
```
🔧 ========== EMAIL SERVICE DEBUG ==========
📧 EMAIL_USER: JuusoJuusto112@gmail.com
🔑 EMAIL_PASSWORD: ***SET***
📮 EMAIL_HOST: smtp.gmail.com
🔌 EMAIL_PORT: 587
👤 Sending to: test@example.com
==========================================

🔧 Creating email transporter...
   Host: smtp.gmail.com
   Port: 587
   User: JuusoJuusto112@gmail.com
🔍 Verifying email connection...
✅ Email service initialized and verified successfully!
   Ready to send emails via smtp.gmail.com

📧 Attempting to send email to: test@example.com
📧 Using SMTP: smtp.gmail.com:587
📧 From: JuusoJuusto112@gmail.com
✅ Email sent successfully!
   Message ID: <some-id@gmail.com>
   To: test@example.com
   Temp Password: Abc123XYZ!@#
```

### In Email Inbox:
You should receive an email with:
- **Subject:** "Welcome to KSYK Map - Set Your Password"
- **From:** KSYK Map Admin <JuusoJuusto112@gmail.com>
- **Content:** Beautiful HTML email with:
  - Welcome message
  - Temporary password in a highlighted box
  - Security warnings
  - Login instructions
  - Login button

## 🔧 Troubleshooting

### If Email Fails:

#### 1. Check Gmail App Password
- The password `vvzvffmzwbdibwrb` is an App Password
- If it doesn't work, generate a new one:
  1. Go to https://myaccount.google.com/apppasswords
  2. Sign in with JuusoJuusto112@gmail.com
  3. Create new app password for "Mail"
  4. Update `.env` file with new password
  5. Restart server

#### 2. Check 2-Factor Authentication
- Gmail App Passwords require 2FA to be enabled
- Enable 2FA at: https://myaccount.google.com/security

#### 3. Check Less Secure Apps
- This shouldn't be needed with App Passwords
- But if issues persist, check: https://myaccount.google.com/lesssecureapps

#### 4. Check Server Logs
The server will show detailed error messages:
```
❌ Email service verification failed:
   Error: Invalid login: 535-5.7.8 Username and Password not accepted
   Code: EAUTH
   💡 Authentication failed. Check your EMAIL_USER and EMAIL_PASSWORD
   💡 For Gmail, you need an App Password, not your regular password
   💡 Generate one at: https://myaccount.google.com/apppasswords
```

## 🎯 Expected Behavior

### Success Case:
1. ✅ Server logs show connection verified
2. ✅ Email sent successfully message
3. ✅ Message ID returned
4. ✅ Email arrives in inbox within seconds
5. ✅ Email is properly formatted HTML

### Fallback Case (if SMTP fails):
1. ⚠️ Server logs show verification failed
2. 📧 Falls back to console mode
3. 📝 Password printed in server console
4. ℹ️ User can still be created
5. 🔧 Admin can manually share password

## 📝 Email Template Preview

The email includes:
- 🎨 Professional gradient header (blue to purple)
- 📦 Password in highlighted box
- ⚠️ Security warnings
- 🔗 Login button
- 📱 Mobile-responsive design
- 📄 Plain text fallback

## 🚀 Production Checklist

Before deploying to production:
- [ ] Verify email credentials work
- [ ] Test with real email addresses
- [ ] Check spam folder if emails don't arrive
- [ ] Update login URL in email template (currently localhost:3000)
- [ ] Consider using a professional email service (SendGrid, AWS SES)
- [ ] Set up email monitoring/logging
- [ ] Add rate limiting for email sending

## 💡 Tips

1. **Test with your own email first** to verify it works
2. **Check spam folder** - first emails might go there
3. **Use the test endpoint** for quick debugging
4. **Watch server console** for detailed logs
5. **Gmail has sending limits** - 500 emails/day for free accounts

## 🔐 Security Notes

- ✅ App Password is used (more secure than regular password)
- ✅ Password is only shown once in email
- ✅ Users are prompted to change password on first login
- ✅ Temporary passwords are randomly generated
- ✅ Email credentials are in .env (not committed to git)

---

**Your email system is ready to use!** 🎉

Just create a new user with "Email password" option and watch it work!
