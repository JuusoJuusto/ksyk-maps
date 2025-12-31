# 📧 Email Setup Guide - Gmail (FREE)

This guide shows you how to set up email sending using Gmail for free.

## Why Gmail?

- ✅ **100% Free** - No credit card required
- ✅ **Reliable** - Gmail's SMTP is very stable
- ✅ **Easy Setup** - Just need an App Password
- ✅ **500 emails/day** - More than enough for admin invitations

## Setup Steps

### 1. Enable 2-Factor Authentication

Gmail App Passwords require 2FA to be enabled first.

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Follow the steps to enable it (you'll need your phone)

### 2. Create an App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. You might need to sign in again
3. In the "Select app" dropdown, choose **"Mail"**
4. In the "Select device" dropdown, choose **"Other (Custom name)"**
5. Type: **"KSYK Map"**
6. Click **"Generate"**
7. Google will show you a 16-character password like: `abcd efgh ijkl mnop`
8. **Copy this password** (you won't see it again!)

### 3. Add to Environment Variables

#### For Local Development (.env file):

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

#### For Vercel (Production):

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value |
|------|-------|
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | `abcd efgh ijkl mnop` |

5. Click **Save**
6. Redeploy your app

## Testing

After setup, test the email by:

1. Go to Admin Panel → Users tab
2. Click "Add User"
3. Fill in the details
4. Select "Send via Email"
5. Click "Create User"
6. Check the recipient's inbox!

## Troubleshooting

### "Invalid credentials" error

- Make sure you're using the **App Password**, not your regular Gmail password
- The App Password should be 16 characters (with or without spaces)
- Make sure 2FA is enabled on your Google account

### "Less secure app access" error

- This shouldn't happen with App Passwords
- If it does, you're probably using your regular password instead of the App Password

### Email not received

- Check spam/junk folder
- Make sure the recipient email is correct
- Check Vercel logs for errors
- Try sending a test email to yourself first

### "Connection timeout" error

- Make sure `EMAIL_PORT` is set to `587` (not 465 or 25)
- Check if your hosting provider blocks SMTP ports
- Vercel should work fine with Gmail SMTP

## Security Notes

- ✅ App Passwords are safer than using your main password
- ✅ You can revoke App Passwords anytime from Google Account settings
- ✅ Each app should have its own App Password
- ❌ Never commit the App Password to Git
- ❌ Never share your App Password

## Alternative: Other Email Services

If you don't want to use Gmail, you can also use:

- **Outlook/Hotmail** (free, similar setup)
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **Amazon SES** (very cheap, $0.10 per 1,000 emails)

Just update the `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASSWORD` accordingly.

## Current Configuration

Your app is currently configured with:
- Email: JuusoJuusto112@gmail.com
- App Password: Already set in .env file
- Ready to send emails! ✅

## Need Help?

If you have issues:
1. Check the Vercel logs for error messages
2. Make sure all environment variables are set correctly
3. Test with a simple email to yourself first
4. Verify 2FA is enabled and App Password is correct
