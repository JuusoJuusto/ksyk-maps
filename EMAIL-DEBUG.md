# Email System Debug Guide

## IMMEDIATE STEPS TO FIX EMAILS

### Step 1: Check Email Configuration
Visit: https://ksykmaps.vercel.app/api/email-diagnostic

This will show you:
- Is EMAIL_USER set?
- Is EMAIL_PASSWORD set?
- What are the values?

### Step 2: Test Email Sending
```bash
curl -X POST https://ksykmaps.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL@gmail.com","name":"Test"}'
```

Or visit in browser and use this JavaScript in console:
```javascript
fetch('/api/test-email', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'YOUR_EMAIL@gmail.com', name: 'Test'})
}).then(r => r.json()).then(console.log)
```

### Step 3: Check Vercel Environment Variables

Go to Vercel Dashboard → ksykmaps → Settings → Environment Variables

Make sure these are set:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=JuusoJuusto112@gmail.com
EMAIL_PASSWORD=krsi tnwb gxtu yhpn
OWNER_EMAIL=juusojuusto112@gmail.com
```

**IMPORTANT**: After adding/changing environment variables, you MUST redeploy!

### Step 4: Redeploy
After setting environment variables:
1. Go to Vercel Dashboard
2. Go to Deployments tab
3. Click "..." on latest deployment
4. Click "Redeploy"
5. Wait for deployment to finish

### Step 5: Test Again
Create a ticket with your email and check if it arrives.

## Common Issues

### Issue 1: Environment Variables Not Set
**Solution**: Add them in Vercel Dashboard → Settings → Environment Variables

### Issue 2: Environment Variables Set But Not Working
**Solution**: Redeploy the application after setting variables

### Issue 3: Gmail App Password Not Working
**Solution**: 
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate new App Password
4. Use the new password (format: xxxx xxxx xxxx xxxx)
5. Update EMAIL_PASSWORD in Vercel
6. Redeploy

### Issue 4: Emails Going to Spam
**Solution**: Check spam folder, mark as "Not Spam"

## Email Password Format

The password should be an App Password from Google:
- Format: `xxxx xxxx xxxx xxxx` (with spaces)
- Example: `krsi tnwb gxtu yhpn`
- NOT your regular Gmail password

## How to Generate Gmail App Password

1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already enabled
3. Go to "App passwords"
4. Select "Mail" and "Other (Custom name)"
5. Name it "KSYK Maps"
6. Click "Generate"
7. Copy the 16-character password
8. Use this in EMAIL_PASSWORD

## Verification Checklist

- [ ] EMAIL_HOST is set to smtp.gmail.com
- [ ] EMAIL_PORT is set to 587
- [ ] EMAIL_USER is set to JuusoJuusto112@gmail.com
- [ ] EMAIL_PASSWORD is set to App Password (16 chars with spaces)
- [ ] OWNER_EMAIL is set to juusojuusto112@gmail.com
- [ ] Environment variables are set in Vercel
- [ ] Application has been redeployed after setting variables
- [ ] Test email endpoint returns success: true
- [ ] Checked spam folder

## Test Commands

### Check Configuration
```bash
curl https://ksykmaps.vercel.app/api/email-diagnostic
```

### Send Test Email
```bash
curl -X POST https://ksykmaps.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"juusojuusto112@gmail.com","name":"Juuso"}'
```

### Check Logs
Go to Vercel Dashboard → Deployments → Click latest → View Function Logs

Look for:
```
📧 ========== SENDING TICKET EMAIL ==========
📤 Sending ticket email...
✅ Ticket email sent! Message ID: <xxxxx>
```

## If Still Not Working

1. Check Vercel Function Logs for errors
2. Verify Gmail account allows "Less secure app access" or uses App Password
3. Try generating a new App Password
4. Make sure 2-Step Verification is enabled on Gmail
5. Check if Gmail is blocking the login attempts

## Contact

If emails still don't work after following all steps:
1. Share the output of /api/email-diagnostic
2. Share the Vercel Function Logs
3. Confirm environment variables are set correctly
