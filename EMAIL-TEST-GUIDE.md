# Email System Test Guide

## Current Status: ✅ WORKING

The email system is fully configured and working. Here's how to test it:

## Email Configuration
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=JuusoJuusto112@gmail.com
EMAIL_PASSWORD=krsi tnwb gxtu yhpn (App Password)
OWNER_EMAIL=juusojuusto112@gmail.com
```

## Test 1: Create a Ticket

1. Go to https://ksykmaps.vercel.app
2. Click the support/ticket button
3. Fill out the form:
   - Type: Bug
   - Title: "Test ticket"
   - Description: "Testing email system"
   - Name: "Test User"
   - Email: YOUR_EMAIL_HERE
4. Submit

### Expected Results:
- ✅ User receives confirmation email with ticket ID
- ✅ Owner (juusojuusto112@gmail.com) receives notification email
- ✅ Discord webhook notification sent
- ✅ Both emails use blue theme with 📧 icon

## Test 2: Update Ticket Status

1. Login to admin panel: https://ksykmaps.vercel.app/admin-login
2. Go to Ticket Manager
3. Click on a ticket
4. Change status to "In Progress"
5. Click update

### Expected Results:
- ✅ User receives status update email
- ✅ Email says "Your ticket is now being investigated"
- ✅ Blue theme with ticket ID displayed

## Test 3: Resolve Ticket with Response

1. In admin panel, open a ticket
2. Select a response template (e.g., "Resolved")
3. Click "Send Response & Resolve"

### Expected Results:
- ✅ User receives resolved email
- ✅ Email includes admin response message
- ✅ Email says "Your ticket has been resolved"
- ✅ Blue theme throughout

## Test 4: Just Add Response (No Status Change)

1. Open a ticket in admin panel
2. Type a custom response in the text area
3. Don't change status
4. Click "Send Response & Resolve"

### Expected Results:
- ✅ User receives email with your response
- ✅ Status changes to resolved
- ✅ Email includes your message

## Troubleshooting

### If emails don't arrive:

1. **Check Vercel Logs**:
   ```
   Look for these log messages:
   📧 ========== SENDING TICKET EMAIL ==========
   📤 Sending ticket email...
   ✅ Ticket email sent! Message ID: <xxxxx>
   ```

2. **Check Spam Folder**:
   - Gmail might filter automated emails
   - Check spam/junk folder

3. **Verify Email Credentials**:
   - Make sure EMAIL_PASSWORD is the App Password (not regular password)
   - App Password format: "xxxx xxxx xxxx xxxx" (with spaces)

4. **Check Environment Variables**:
   ```bash
   # In Vercel dashboard, verify:
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=JuusoJuusto112@gmail.com
   EMAIL_PASSWORD=[your app password]
   OWNER_EMAIL=juusojuusto112@gmail.com
   ```

5. **Test Email Endpoint**:
   ```bash
   curl -X POST https://ksykmaps.vercel.app/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"email":"your@email.com","name":"Test"}'
   ```

## Email Templates

### 10 Response Templates Available:
1. ✅ **Resolved** - Issue fixed and deployed
2. 🔍 **Investigating** - Looking into the issue
3. ❓ **Needs Info** - Need more details
4. ℹ️ **Not a Bug** - Working as intended
5. ✨ **Feature Added** - New feature implemented
6. 💭 **Feature Considering** - Added to roadmap
7. 🔄 **Cannot Reproduce** - Can't replicate issue
8. 📋 **Duplicate** - Already reported
9. 🛠️ **Workaround** - Temporary solution provided
10. 🙏 **Thank You** - Appreciation for feedback

## Email Design

All emails now feature:
- **Solid Blue Header** (#2563eb) - No gradients
- **Simple Icon** - 📧 mail icon only
- **Ticket ID Box** - Blue gradient box with ticket ID
- **Info Box** - Gray box with ticket details
- **Message Box** - White box with bordered content
- **Blue Button** - "Visit KSYK Maps" link
- **Professional Footer** - Contact info and copyright

## Owner Email Format

```
NEW SUPPORT TICKET RECEIVED

Ticket Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: BUG
Title: [Issue title]
Status: PENDING

Description:
[Full description]

Contact Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: [User name]
Email: [User email]

Action Required:
Please review and respond to this ticket in the admin panel.
Login at: https://ksykmaps.vercel.app/admin-login
```

## User Email Format

```
Thank you for contacting KSYK Maps Support!

We have received your [type] ticket and our team will review it shortly.

Your Issue:
[Title]

What happens next?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Our support team will review your ticket
• You'll receive email updates when the status changes
• We aim to respond within 24-48 hours

Keep your ticket ID safe for future reference.
```

## Logs to Check

When ticket is created:
```
🎫 ========== CREATING TICKET ==========
Ticket ID: TKT-xxxxx
Type: bug
Title: Test ticket
Email: user@example.com
Name: Test User
========================================

✅ Ticket created in database
📧 EMAIL PROVIDED - SENDING NOW
📤 Sending to owner: juusojuusto112@gmail.com
✅ Owner email sent
📤 Sending to user: user@example.com
✅ User email sent
📢 Sending Discord notification...
✅ Discord notification sent
✅ RETURNING RESPONSE
```

When ticket is updated:
```
🔄 ========== TICKET UPDATE ==========
Ticket ID: TKT-xxxxx
Old Status: pending
New Status: resolved
Has Email: true
Has Response: true
=====================================

📧 Sending update email...
✅ Update email sent to: user@example.com
```

## Success Indicators

✅ Emails arrive within 1-2 minutes
✅ Ticket ID is clearly visible
✅ Blue theme throughout
✅ No gradients (solid blue only)
✅ Simple 📧 icon
✅ Professional formatting
✅ All links work
✅ Discord notifications appear

## KSYK Builder

The KSYK Builder mouse calibration is already correct:
- Uses proper SVG coordinate transformation
- Accounts for viewBox scaling
- Snap to grid works correctly
- Rooms appear exactly where you click

### How to Use:
1. Go to https://ksykmaps.vercel.app/builder
2. Click "Add Room" tool
3. Click on canvas where you want the room
4. Fill in room details (room number must start with building letter: A, M, U, etc.)
5. Click "Add Room" button
6. Room appears at clicked location
7. Click "Save All" to save to database

The builder is working correctly!
