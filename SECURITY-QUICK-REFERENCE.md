# Security Quick Reference Guide

## 🚨 Emergency Contacts
- **Security Issues**: security@ksyk.fi
- **Admin Support**: admin@ksyk.fi
- **Emergency**: +358 9 310 8220

---

## 🔒 Security Status: ✅ PRODUCTION READY

All critical vulnerabilities have been fixed and the application is protected against OWASP Top 10 threats.

---

## 🛡️ What's Protected

### ✅ Authentication & Authorization
- All sensitive endpoints require login
- Role-based access control (admin, teacher, student, parent)
- Resource ownership validation (users can only access their own data)
- Rate limiting on login (5 attempts per 15 minutes)

### ✅ Common Attacks Prevented
- **SQL Injection**: Input validation + Firestore NoSQL
- **XSS**: Input sanitization + CSP headers
- **CSRF**: SameSite cookies + CORS
- **Clickjacking**: X-Frame-Options: DENY
- **IDOR**: Ownership validation on all endpoints
- **Brute Force**: Rate limiting on auth endpoints
- **Session Hijacking**: Secure cookies + session rotation
- **MITM**: HTTPS enforced via HSTS

---

## 🔑 Key Security Features

### Rate Limits
```
Authentication: 5 attempts / 15 minutes
API Endpoints: 60 requests / minute
Password Reset: 3 attempts / hour
Global API: 100 requests / 15 minutes
```

### Security Headers
```
✅ Content-Security-Policy
✅ X-Frame-Options: DENY
✅ X-Content-Type-Options: nosniff
✅ X-XSS-Protection: 1; mode=block
✅ Strict-Transport-Security
✅ Referrer-Policy
✅ Permissions-Policy
```

### Secured Endpoints
```
✅ /api/wilma/users - Admin/Teacher only
✅ /api/wilma/users/:id - Ownership validation
✅ /api/wilma/grades/:studentId - Ownership validation
✅ /api/wilma/assignments/:studentId - Ownership validation
✅ /api/wilma/messages - User-specific filtering
✅ /api/wilma/attendance/:studentId - Ownership validation
✅ /api/admin-settings - Admin only
✅ /api/analytics/* - Admin only
```

---

## 🧪 Quick Security Tests

### Test 1: Authentication Required
```bash
curl -X GET http://localhost:5000/api/wilma/users
# Expected: 401 Unauthorized
```

### Test 2: IDOR Prevention
```bash
curl -X GET http://localhost:5000/api/wilma/grades/other-user-id \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 403 Forbidden
```

### Test 3: Rate Limiting
```bash
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/admin-login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Expected: 429 Too Many Requests after 5 attempts
```

### Test 4: SQL Injection
```bash
curl -X GET "http://localhost:5000/api/wilma/users?id=1' OR '1'='1"
# Expected: 400 Invalid Input
```

### Test 5: Security Headers
```bash
curl -I https://ksyk-maps.vercel.app
# Expected: All security headers present
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Run `npm run build` successfully
- [ ] Run `npm audit` and fix critical issues
- [ ] Test authentication endpoints
- [ ] Test rate limiting
- [ ] Verify security headers
- [ ] Test IDOR prevention
- [ ] Check error handling
- [ ] Review environment variables
- [ ] Enable HTTPS
- [ ] Configure monitoring
- [ ] Set up backup strategy
- [ ] Document incident response plan

---

## 📊 Monitoring

### What to Monitor
- Failed authentication attempts
- 401/403 responses (unauthorized access)
- Rate limit violations
- Input validation failures
- Unusual traffic patterns
- Error rates

### Where to Check
- Admin Dashboard → Logs
- Admin Dashboard → Analytics
- Server logs
- Vercel deployment logs

---

## 🔧 Maintenance Schedule

### Weekly
- [ ] Run `npm audit`
- [ ] Update dependencies
- [ ] Review security logs

### Monthly
- [ ] Check for anomalies in logs
- [ ] Review failed auth attempts
- [ ] Update documentation

### Quarterly
- [ ] Rotate API keys and secrets
- [ ] Review and update security policies
- [ ] Test disaster recovery

### Annually
- [ ] Third-party security audit
- [ ] Penetration testing
- [ ] Security training for team

---

## 🆘 Incident Response

### If You Detect a Security Issue:

1. **Contain**
   - Disable affected user accounts
   - Block suspicious IP addresses
   - Take affected endpoints offline if needed

2. **Investigate**
   - Check logs for attack vector
   - Identify compromised data
   - Document timeline

3. **Remediate**
   - Fix vulnerability
   - Deploy patch
   - Reset compromised credentials

4. **Notify**
   - Inform affected users
   - Report to authorities if required
   - Update security team

5. **Document**
   - Record incident details
   - Document response actions
   - Update security procedures

---

## 📚 Documentation

- **Full Security Guide**: `SECURITY.md`
- **Implementation Details**: `SECURITY-IMPLEMENTATION-COMPLETE.md`
- **Implementation Summary**: `IMPLEMENTATION-SUMMARY-APRIL-25.md`
- **Test Script**: `scripts/test-security.sh`
- **Vercel Config**: `vercel.json`

---

## 🔐 Security Middleware

Located in `server/securityMiddleware.ts`:

```typescript
// Rate limiting
apiRateLimiter
authRateLimiter
strictRateLimiter

// Headers
securityHeaders

// Authorization
requireRole('admin', 'teacher')
validateResourceOwnership('user')

// Input validation
preventSQLInjection
sanitizeInput(string)
validateUserId(string)
validateEmail(string)

// Logging
securityLogger

// Other
preventParameterPollution
validateFileUpload
```

---

## 💡 Quick Tips

1. **Always authenticate**: Never expose sensitive endpoints
2. **Validate ownership**: Check user owns the resource
3. **Sanitize inputs**: Never trust user data
4. **Log everything**: Security events, failed attempts, errors
5. **Rate limit**: Prevent brute force and abuse
6. **Use HTTPS**: Always enforce secure connections
7. **Keep updated**: Regular dependency updates
8. **Monitor logs**: Watch for suspicious activity
9. **Test regularly**: Run security tests frequently
10. **Document changes**: Keep security docs up to date

---

## ✅ Security Checklist

- [x] Authentication on all sensitive endpoints
- [x] Authorization with role-based access
- [x] IDOR prevention with ownership validation
- [x] Rate limiting on auth endpoints
- [x] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] Input validation and sanitization
- [x] SQL injection prevention
- [x] XSS prevention
- [x] CSRF prevention
- [x] Clickjacking prevention
- [x] Session security
- [x] HTTPS enforcement
- [x] Error handling (no info leakage)
- [x] Security logging
- [x] File upload validation
- [x] CORS configuration
- [x] Documentation complete

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: April 25, 2026  
**Version**: 1.0.0
