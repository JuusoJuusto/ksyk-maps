# 🧪 COMPLETE TESTING GUIDE - April 17, 2026

## ✅ WHAT'S BEEN DONE

### Security Integration:
- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ Input validation with Zod schemas
- ✅ Security headers (5 headers)
- ✅ Professional email templates (dark mode)
- ✅ Owner role protection
- ✅ Temporary password system
- ✅ Generic sendEmail function

### Schema Updates:
- ✅ Added `isTemporaryPassword` field to wilmaUsers
- ✅ Social worker role already exists

### Mobile UI:
- ✅ Touch-friendly button utilities added

### Git:
- ✅ All changes committed
- ✅ Pushed to GitHub

---

## 🧪 CRITICAL TESTS TO RUN NOW

### Test 1: Password Hashing ✅
**What to test**: Verify passwords are hashed in database

**Steps**:
1. Create a new Wilma user with email invitation
2. Check the database (Firebase or Postgres)
3. Look at the `password` field
4. It should start with `$2b$10$` (bcrypt hash)
5. It should NOT be plain text

**Expected Result**: Password is hashed, not plain text

**How to check Firebase**:
```bash
# Open Firebase Console
# Go to Firestore Database
# Navigate to wilmaUsers collection
# Check any user's password field
# Should see: $2b$10$... (hashed)
```

---

### Test 2: Email Delivery 📧
**What to test**: Verify emails are actually sent

**Steps**:
1. Make sure `.env` has email credentials:
   ```
   EMAIL_USER=support.slstudio@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   ```

2. Create a new Wilma user with email invitation
3. Check the email inbox
4. Email should arrive within 1-2 minutes

**Expected Result**: 
- Email arrives with dark background
- Light text is readable
- Password is visible
- Login button works

**If email doesn't arrive**:
- Check spam folder
- Verify EMAIL_USER and EMAIL_PASSWORD in .env
- Check server logs for email errors
- Verify Gmail app password is correct

---

### Test 3: Temporary Password System 🔑
**What to test**: Users must change password on first login

**Steps**:
1. Create user with email invitation
2. Login with the emailed password
3. Check the response - should include `requiresPasswordChange: true`
4. Frontend should force password change
5. Change the password
6. Login again - `requiresPasswordChange` should be `false`

**Expected Result**: 
- First login: `requiresPasswordChange: true`
- After password change: `requiresPasswordChange: false`

---

### Test 4: Input Validation ✅
**What to test**: Invalid input is rejected

**Test Cases**:
```bash
# Test 1: Username too short
POST /api/wilma/login
{
  "username": "ab",  # Too short (min 3)
  "password": "password123"
}
Expected: 400 error with validation message

# Test 2: Password too short
POST /api/wilma/login
{
  "username": "testuser",
  "password": "1234567"  # Too short (min 8)
}
Expected: 400 error with validation message

# Test 3: Invalid email
POST /api/wilma/users
{
  "username": "testuser",
  "firstName": "Test",
  "lastName": "User",
  "email": "invalid-email",  # Invalid format
  "role": "student"
}
Expected: 400 error with validation message
```

---

### Test 5: Owner Role Protection 👑
**What to test**: Only juusojuusto112@gmail.com can have owner role

**Test Cases**:
```bash
# Test 1: Try to create owner with different email
POST /api/wilma/users
{
  "username": "testowner",
  "firstName": "Test",
  "lastName": "Owner",
  "email": "test@test.com",
  "role": "owner",
  "password": "password123"
}
Expected: 403 Forbidden

# Test 2: Create owner with correct email
POST /api/wilma/users
{
  "username": "realowner",
  "firstName": "Real",
  "lastName": "Owner",
  "email": "juusojuusto112@gmail.com",
  "role": "owner",
  "password": "password123"
}
Expected: 201 Created

# Test 3: Try to update non-owner to owner
PUT /api/wilma/users/{id}
{
  "role": "owner"
}
Expected: 403 Forbidden (if email is not juusojuusto112@gmail.com)
```

---

### Test 6: Security Headers 🛡️
**What to test**: All API responses have security headers

**Steps**:
1. Open browser dev tools (F12)
2. Go to Network tab
3. Make any API request (e.g., GET /api/buildings)
4. Click on the request
5. Check Response Headers

**Expected Headers**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

---

### Test 7: Login Flow 🔐
**What to test**: Complete login flow works

**Steps**:
1. Create user with email invitation
2. Receive email with password
3. Login with username and password
4. Should get user object with `requiresPasswordChange: true`
5. Change password
6. Login again
7. Should get user object with `requiresPasswordChange: false`

**Expected Result**: Login works, password change works, temporary flag is cleared

---

## 🐛 TROUBLESHOOTING

### Problem: Passwords are still plain text
**Solution**:
1. Check if bcrypt is installed: `npm list bcrypt`
2. Check api/index.ts has password hashing code
3. Check logs for "🔒 Password hashed successfully"
4. Verify hashPassword function is being called

### Problem: Emails not sending
**Solution**:
1. Check .env file has EMAIL_USER and EMAIL_PASSWORD
2. Verify Gmail app password (not regular password)
3. Check logs for email errors
4. Test SMTP connection manually
5. Check spam folder

### Problem: Validation not working
**Solution**:
1. Check if zod is installed: `npm list zod`
2. Check api/index.ts has validation code
3. Check logs for validation errors
4. Verify validation schemas are imported

### Problem: Owner role not protected
**Solution**:
1. Check api/index.ts has owner protection code
2. Verify email comparison is exact
3. Check logs for protection messages

---

## 📊 TEST RESULTS CHECKLIST

- [ ] Password hashing works (passwords are hashed in database)
- [ ] Emails are delivered (check inbox)
- [ ] Email template looks good (dark background, readable text)
- [ ] Temporary password system works (requiresPasswordChange flag)
- [ ] Input validation rejects invalid data
- [ ] Owner role is protected (403 for non-owner emails)
- [ ] Security headers are present in all responses
- [ ] Login flow works end-to-end
- [ ] Password change clears temporary flag
- [ ] Mobile buttons are touch-friendly (44x44px)

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All tests pass
- [ ] Database backup created
- [ ] Environment variables set correctly
- [ ] Email credentials verified
- [ ] Security headers confirmed
- [ ] Password hashing confirmed
- [ ] Owner role protection confirmed
- [ ] Temporary password system confirmed
- [ ] Monitoring set up
- [ ] Rollback plan ready

---

## 📝 NOTES

### Email Configuration:
- Use Gmail app password, not regular password
- Enable "Less secure app access" if needed
- Check spam folder for test emails
- Verify SMTP settings in .env

### Database:
- Passwords should start with `$2b$10$`
- isTemporaryPassword should be boolean
- Check both Firebase and Postgres if using both

### Security:
- Never log plain text passwords
- Always hash before storing
- Clear temporary flag after password change
- Protect owner role at all endpoints

---

## 🎯 SUCCESS CRITERIA

✅ **Security Integration Complete** when:
- All passwords are hashed in database
- Emails are delivered successfully
- Temporary password system works
- Input validation rejects invalid data
- Owner role is protected
- Security headers are present
- All tests pass

---

**Testing Date**: April 17, 2026  
**Version**: 3.7.0  
**Status**: 🟡 READY FOR TESTING  
**Next**: Run all tests, then deploy

**Test thoroughly before deploying to production!** 🧪
