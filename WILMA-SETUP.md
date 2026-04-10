# Wilma Setup Guide

## How to Use Wilma

### Step 1: Create Wilma Users in Admin Panel

1. Login to KSYK Maps admin panel at `/admin-login`
2. Navigate to the **Wilma** tab
3. Click **Add Wilma User**
4. Fill in the form:
   - **Username** (required): User's login username
   - **Password** (required if not using email): User's password
   - **First Name** (required): User's first name
   - **Last Name** (required): User's last name
   - **Email** (optional): User's email address
   - **Role** (required): Select from:
     - Teacher
     - Student
     - Parent
     - Admin
   - **Student Class** (for students): e.g., "9A", "8B"
   - **Send email invitation**: Check this to send login credentials via email

### Step 2: Email Invitation Option

When you check "Send email invitation":
- A random secure password will be generated automatically
- The user will receive an email with their username and password
- Email must be provided for this option
- The email contains:
  - Username
  - Generated password
  - Role
  - Link to Wilma login page

### Step 3: Users Login to Wilma

1. Users go to `/wilma`
2. Enter their username and password
3. Click "Login"
4. They will see the Wilma dashboard with their role

### Step 4: Manage Users

From the Admin Panel → Wilma tab, you can:
- **View all users** with their roles and status
- **Edit users** by clicking the edit icon
- **Delete users** by clicking the trash icon
- **See statistics** showing total users by role

## Troubleshooting

### Login Not Working

1. **Check browser console** (F12) for error messages
2. **Verify user exists** in Admin Panel → Wilma tab
3. **Check credentials** are correct (username and password)
4. **Ensure user is active** (isActive = true)
5. **Check server is running** and `/api/wilma/login` endpoint is accessible

### Email Not Sending

1. **Check email configuration** in `.env` file:
   - `EMAIL_USER` should be set
   - `EMAIL_PASS` should be set
2. **Verify email service** is working
3. **Check server logs** for email errors

### Can't See Wilma Tab

1. **Login as admin** to KSYK Maps admin panel
2. **Check role** - only admins can manage Wilma users
3. **Refresh the page** if tab doesn't appear

## Security Notes

⚠️ **Important:**
- Passwords are currently stored in plain text
- In production, implement password hashing (bcrypt, argon2)
- Use HTTPS in production
- Implement rate limiting on login endpoint
- Consider adding password reset functionality

## API Endpoints

- `POST /api/wilma/login` - Login with username/password
- `GET /api/wilma/users` - List all users (admin only)
- `POST /api/wilma/users` - Create user (admin only)
- `PUT /api/wilma/users/:id` - Update user (admin only)
- `DELETE /api/wilma/users/:id` - Delete user (admin only)

## Features

✅ Secure login with username/password
✅ Role-based access (Teacher, Student, Parent, Admin)
✅ Email invitation with auto-generated passwords
✅ Multi-language support (Finnish/English)
✅ Session persistence
✅ Admin panel for user management
✅ User statistics dashboard
✅ Professional Wilma-style interface

## Coming Soon

- Schedule management
- Grades and assignments
- Messages system
- Attendance tracking
- Reports and analytics
