# Password Security Quick Reference 🔒

**For Developers Working on KSYKMaps**

---

## ✅ What We Do (CORRECT)

### 1. Hash Passwords with bcrypt
```typescript
import { hashPassword } from './server/passwordUtils';

// When creating a user
const hashedPassword = await hashPassword(plainPassword);
await storage.createUser({ password: hashedPassword });
```

### 2. Verify Passwords with bcrypt.compare()
```typescript
import { verifyPassword } from './server/passwordUtils';

// When logging in
const isValid = await verifyPassword(inputPassword, user.password);
if (isValid) {
  // Login successful
}
```

### 3. Apply Rate Limiting
```typescript
import { checkRateLimit, recordLoginAttempt } from './server/rateLimiter';

// Before authentication
const rateLimit = await checkRateLimit(username, ipAddress);
if (!rateLimit.allowed) {
  return res.status(429).json({ message: "Too many attempts" });
}

// After authentication attempt
await recordLoginAttempt(username, success, ipAddress);
```

---

## ❌ What NOT to Do (WRONG)

### ❌ DON'T Use Encryption
```typescript
// WRONG - Can be decrypted!
const encrypted = crypto.encrypt(password, key);
```

### ❌ DON'T Use SHA-256 Alone
```typescript
// WRONG - Too fast, no salt
const hash = crypto.createHash('sha256').update(password).digest('hex');
```

### ❌ DON'T Compare Manually
```typescript
// WRONG - Timing attack vulnerable
if (inputPassword === storedHash) { ... }
```

### ❌ DON'T Store Plain Text
```typescript
// WRONG - Security disaster
user.password = "mypassword123";
```

### ❌ DON'T Skip Rate Limiting
```typescript
// WRONG - Allows brute force
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body); // No rate limit check!
});
```

---

## 📚 Available Functions

### Password Hashing (`server/passwordUtils.ts`)

#### `hashPassword(password: string): Promise<string>`
Hash a plain text password using bcrypt.

**Example:**
```typescript
const hash = await hashPassword("mypassword123");
// Returns: $2b$10$IRZOOy8N2rSwPcWKLc0WHO...
```

#### `verifyPassword(password: string, hash: string): Promise<boolean>`
Verify a password against a bcrypt hash.

**Example:**
```typescript
const isValid = await verifyPassword("mypassword123", storedHash);
// Returns: true or false
```

#### `generateSecurePassword(length: number = 16): string`
Generate a random secure password.

**Example:**
```typescript
const tempPassword = generateSecurePassword(12);
// Returns: "aB3$xY9@mK2!"
```

---

### Rate Limiting (`server/rateLimiter.ts`)

#### `checkRateLimit(email: string, ipAddress?: string)`
Check if a login attempt is allowed.

**Returns:**
```typescript
{
  allowed: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  message?: string;
}
```

**Example:**
```typescript
const rateLimit = await checkRateLimit("user@example.com", "192.168.1.1");
if (!rateLimit.allowed) {
  console.log(rateLimit.message); // "Tili on lukittu. Yritä uudelleen 15 minuutin kuluttua."
}
```

#### `recordLoginAttempt(email: string, success: boolean, ipAddress?: string)`
Record a login attempt (success or failure).

**Example:**
```typescript
await recordLoginAttempt("user@example.com", true, "192.168.1.1");
```

#### `unlockAccount(email: string)`
Manually unlock a locked account (admin function).

**Example:**
```typescript
await unlockAccount("user@example.com");
```

---

### Two-Factor Authentication (`server/twoFactorAuth.ts`)

#### `TwoFactorAuthService.generateSecret(userEmail: string, userName: string)`
Generate a new 2FA secret for a user.

**Returns:**
```typescript
{
  secret: string;
  otpauthUrl: string;
}
```

#### `TwoFactorAuthService.verifyToken(secret: string, token: string): boolean`
Verify a TOTP token.

**Example:**
```typescript
const isValid = TwoFactorAuthService.verifyToken(user.twoFactorSecret, "123456");
```

#### `TwoFactorAuthService.enableTwoFactor(userId: string, secret: string, verificationCode: string)`
Enable 2FA for a user.

**Returns:**
```typescript
{
  success: boolean;
  message: string;
  backupCodes?: string[];
}
```

---

## 🔐 Security Configuration

### Rate Limiting Settings (`server/rateLimiter.ts`)
```typescript
const MAX_ATTEMPTS = 5;              // Max failed login attempts
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes lockout
const RESET_WINDOW = 60 * 60 * 1000;  // 1 hour reset window
```

### Bcrypt Settings (`server/passwordUtils.ts`)
```typescript
const SALT_ROUNDS = 10; // 2^10 = 1,024 iterations
```

### Session Settings (`server/simpleAuth.ts`)
```typescript
cookie: {
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  httpOnly: true,                                 // No JavaScript access
  maxAge: 24 * 60 * 60 * 1000                    // 24 hours
}
```

---

## 🚀 Common Use Cases

### Use Case 1: User Registration
```typescript
import { hashPassword } from './server/passwordUtils';

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  
  // Hash password
  const hashedPassword = await hashPassword(password);
  
  // Create user
  await storage.createUser({
    email,
    password: hashedPassword, // ✅ Store only hash
  });
  
  res.json({ message: "User created" });
});
```

### Use Case 2: User Login
```typescript
import { verifyPassword } from './server/passwordUtils';
import { checkRateLimit, recordLoginAttempt } from './server/rateLimiter';

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Step 1: Check rate limit
  const rateLimit = await checkRateLimit(email, ipAddress);
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      message: rateLimit.message,
      lockedUntil: rateLimit.lockedUntil
    });
  }
  
  // Step 2: Get user
  const user = await storage.getUserByEmail(email);
  if (!user) {
    await recordLoginAttempt(email, false, ipAddress);
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  // Step 3: Verify password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    await recordLoginAttempt(email, false, ipAddress);
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  // Step 4: Record success
  await recordLoginAttempt(email, true, ipAddress);
  
  // Step 5: Create session
  req.login(user, (err) => {
    if (err) return res.status(500).json({ message: "Login failed" });
    res.json({ message: "Login successful", user });
  });
});
```

### Use Case 3: Password Change
```typescript
import { hashPassword, verifyPassword } from './server/passwordUtils';

app.post('/api/change-password', isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Verify current password
  const user = await storage.getUser(req.user.id);
  const isValid = await verifyPassword(currentPassword, user.password);
  
  if (!isValid) {
    return res.status(401).json({ message: "Current password incorrect" });
  }
  
  // Hash new password
  const hashedPassword = await hashPassword(newPassword);
  
  // Update user
  await storage.updateUser(req.user.id, {
    password: hashedPassword
  });
  
  res.json({ message: "Password changed successfully" });
});
```

### Use Case 4: Password Reset
```typescript
import { hashPassword } from './server/passwordUtils';
import { generateSecurePassword } from './server/passwordUtils';

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  // Generate temporary password
  const tempPassword = generateSecurePassword(12);
  const hashedPassword = await hashPassword(tempPassword);
  
  // Update user
  await storage.updateUser(user.id, {
    password: hashedPassword,
    passwordResetRequired: true
  });
  
  // Send email with tempPassword (not hashedPassword!)
  await sendPasswordResetEmail(email, tempPassword);
  
  res.json({ message: "Password reset email sent" });
});
```

---

## 🧪 Testing

### Test Password Hashing
```typescript
import { hashPassword, verifyPassword } from './server/passwordUtils';

// Test hashing
const password = "testpassword123";
const hash = await hashPassword(password);
console.log(hash); // $2b$10$...

// Test verification
const isValid = await verifyPassword("testpassword123", hash);
console.log(isValid); // true

const isInvalid = await verifyPassword("wrongpassword", hash);
console.log(isInvalid); // false
```

### Test Rate Limiting
```typescript
import { checkRateLimit, recordLoginAttempt } from './server/rateLimiter';

const email = "test@example.com";

// Simulate 5 failed attempts
for (let i = 0; i < 5; i++) {
  await recordLoginAttempt(email, false);
}

// Check if locked
const rateLimit = await checkRateLimit(email);
console.log(rateLimit.allowed); // false
console.log(rateLimit.message); // "Tili on lukittu..."
```

---

## 📖 Further Reading

### Official Documentation
- [bcrypt npm package](https://www.npmjs.com/package/bcrypt)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

### Internal Documentation
- `PASSWORD-SECURITY-AUDIT.md` - Full security audit report
- `SECURITY-VERIFICATION-COMPLETE.md` - Verification results
- `server/passwordUtils.ts` - Password utility functions
- `server/rateLimiter.ts` - Rate limiting implementation
- `server/twoFactorAuth.ts` - 2FA implementation

---

## ⚠️ Important Reminders

1. **NEVER** store plain text passwords (except temporarily for email sending)
2. **ALWAYS** use `hashPassword()` before storing passwords
3. **ALWAYS** use `verifyPassword()` for authentication (never manual comparison)
4. **ALWAYS** check rate limits before authentication
5. **ALWAYS** record login attempts (success and failure)
6. **NEVER** log passwords (plain text or hashed) in production
7. **NEVER** send hashed passwords in API responses
8. **ALWAYS** use HTTPS in production (secure cookies)

---

## 🆘 Troubleshooting

### Problem: "Invalid password" but password is correct
**Solution:** Check if password is hashed in database
```typescript
const user = await storage.getUser(userId);
console.log('Password starts with:', user.password.substring(0, 4));
// Should be: "$2b$" (bcrypt hash)
// If not, password needs to be migrated
```

### Problem: User locked out after 5 attempts
**Solution:** Admin can unlock account
```typescript
import { unlockAccount } from './server/rateLimiter';
await unlockAccount("user@example.com");
```

### Problem: bcrypt.compare() always returns false
**Solution:** Check if comparing correct values
```typescript
// WRONG
const isValid = await bcrypt.compare(hashedPassword, plainPassword);

// CORRECT
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

---

**Last Updated:** May 3, 2026  
**Maintained By:** KSYKMaps Development Team
