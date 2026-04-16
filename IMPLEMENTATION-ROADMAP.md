# 🚀 Implementation Roadmap - Comprehensive Task List

## 📋 TASKS OVERVIEW

### ✅ COMPLETED (5/11 - 45%)
1. ✅ Removed Wilma tab from admin
2. ✅ Added substitute teacher role
3. ✅ Case-insensitive login
4. ✅ Mobile UI improvements
5. ✅ Security packages installed

### 🔄 IN PROGRESS (6/11 - 55%)
6. 🔄 Password hashing implementation
7. 🔄 Rate limiting
8. 🔄 Owner role protection
9. 🔄 Button size fixes
10. 🔄 Demo user routes
11. 🔄 ID-based routing
12. 🔄 Make admin panel functional

---

## 🎯 IMPLEMENTATION PRIORITY

### 🔴 CRITICAL (Do First):
1. **Password Hashing** - Security critical
2. **Rate Limiting** - Prevent brute force
3. **Owner Role Protection** - Access control
4. **Input Validation** - Prevent injection

### 🟡 HIGH (Do Next):
5. **Security Headers** - Helmet configuration
6. **Button Size Fixes** - UX improvement
7. **ID-Based Routing** - Better URLs

### 🟢 MEDIUM (Do After):
8. **Demo User Routes** - Testing convenience
9. **Make Admin Panel Functional** - Large task

---

## 📝 DETAILED IMPLEMENTATION PLAN

### 1. PASSWORD HASHING ⚠️ CRITICAL

**Files to Modify**:
- `api/index.ts` - Login endpoint
- `api/index.ts` - User creation endpoint
- Create `server/passwordUtils.ts` - Utility functions

**Implementation**:
```typescript
// server/passwordUtils.ts
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// api/index.ts - Login
const isValid = await verifyPassword(password, wilmaUser.password);
if (!isValid) {
  return res.status(401).json({ message: "Invalid credentials" });
}

// api/index.ts - User Creation
userData.password = await hashPassword(userData.password);
```

**Testing**:
- [ ] Test user creation with hashed password
- [ ] Test login with hashed password
- [ ] Test password verification
- [ ] Migrate existing users (if any)

---

### 2. RATE LIMITING ⚠️ CRITICAL

**Files to Modify**:
- `api/index.ts` - Add rate limiting middleware

**Implementation**:
```typescript
import rateLimit from 'express-rate-limit';

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later'
});

// Apply to endpoints
app.post('/api/wilma/login', loginLimiter, async (req, res) => {
  // ...
});

app.use('/api/', apiLimiter);
```

**Testing**:
- [ ] Test login rate limiting
- [ ] Test API rate limiting
- [ ] Verify error messages
- [ ] Test bypass for testing

---

### 3. OWNER ROLE PROTECTION ⚠️ CRITICAL

**Files to Modify**:
- `shared/wilmaConfig.ts` - Add owner role
- `api/index.ts` - User creation/update validation
- `server/seedData.ts` - Create owner user

**Implementation**:
```typescript
// shared/wilmaConfig.ts
export const WILMA_ROLES = [
  { value: 'owner', label: 'Omistaja', labelEn: 'Owner', icon: '👑', color: 'bg-yellow-100 text-yellow-800' },
  // ... other roles
];

// api/index.ts - User creation
if (userData.role === 'owner' && userData.email !== 'juusojuusto112@gmail.com') {
  return res.status(403).json({ message: 'Owner role is reserved' });
}

// api/index.ts - User update
if (updates.role === 'owner' && user.email !== 'juusojuusto112@gmail.com') {
  return res.status(403).json({ message: 'Cannot assign owner role' });
}

// Prevent removing owner role
if (user.role === 'owner' && updates.role !== 'owner') {
  return res.status(403).json({ message: 'Cannot remove owner role' });
}
```

**Testing**:
- [ ] Test owner user creation
- [ ] Test owner role protection
- [ ] Test role change prevention
- [ ] Verify permissions

---

### 4. SECURITY HEADERS 🟡 HIGH

**Files to Modify**:
- `api/index.ts` - Add helmet middleware

**Implementation**:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 5. INPUT VALIDATION 🟡 HIGH

**Files to Modify**:
- Create `shared/validationSchemas.ts`
- `api/index.ts` - Add validation middleware

**Implementation**:
```typescript
// shared/validationSchemas.ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-z0-9._-]+$/),
  password: z.string().min(8).max(100)
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-z0-9._-]+$/),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  role: z.enum(['student', 'teacher', 'parent', 'admin', 'owner']),
});

// api/index.ts
const result = loginSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.errors });
}
```

---

### 6. BUTTON SIZE FIXES 🟡 HIGH

**Files to Check**:
- `client/src/pages/wilma-admin.tsx`
- `client/src/components/EnhancedWilmaUserManager.tsx`
- All Wilma components

**Implementation**:
```typescript
// Ensure all buttons have minimum touch target
className="min-h-[44px] min-w-[44px] px-4 py-2"

// Mobile-friendly buttons
className="h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base"
```

**Testing**:
- [ ] Test on mobile devices
- [ ] Verify 44x44px minimum
- [ ] Check all interactive elements
- [ ] Test touch targets

---

### 7. ID-BASED ROUTING 🟡 HIGH

**Files to Modify**:
- `client/src/App.tsx` - Add new routes
- `client/src/pages/wilma-admin.tsx` - Handle ID parameter
- `client/src/pages/wilma.tsx` - Update routing logic

**Implementation**:
```typescript
// client/src/App.tsx
<Route path="/wilma-admin/:id" component={WilmaAdmin} />
<Route path="/wilma-admin/studentdemo" component={WilmaAdminDemo} />
<Route path="/wilma-admin/teacherdemo" component={WilmaAdminDemo} />

// client/src/pages/wilma-admin.tsx
const [match, params] = useRoute('/wilma-admin/:id');
const userId = params?.id;

// Redirect logic
if (currentUser.role === 'student') {
  setLocation(`/wilma-admin/${currentUser.studentId}`);
} else {
  setLocation(`/wilma-admin/${currentUser.id}`);
}
```

---

### 8. DEMO USER ROUTES 🟢 MEDIUM

**Files to Create**:
- `client/src/pages/wilma-admin-demo.tsx`
- `client/src/data/demoData.ts`

**Implementation**:
```typescript
// client/src/pages/wilma-admin-demo.tsx
export default function WilmaAdminDemo() {
  const [match, params] = useRoute('/wilma-admin/:demoType');
  const demoType = params?.demoType; // studentdemo, teacherdemo, etc.
  
  const demoUser = getDemoUser(demoType);
  const demoData = getDemoData(demoType);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-yellow-100 border-b-2 border-yellow-300 p-3 text-center">
        <p className="text-yellow-800 font-semibold">
          🎭 DEMO MODE - Read-only preview
        </p>
      </div>
      {/* Render demo interface */}
    </div>
  );
}

// client/src/data/demoData.ts
export function getDemoUser(type: string) {
  const demoUsers = {
    studentdemo: {
      id: 'demo-student',
      studentId: '123456',
      firstName: 'Demo',
      lastName: 'Student',
      role: 'student',
      studentClass: '9A'
    },
    teacherdemo: {
      id: 'demo-teacher',
      firstName: 'Demo',
      lastName: 'Teacher',
      role: 'teacher',
      department: 'Mathematics'
    },
    // ... more demo users
  };
  return demoUsers[type];
}
```

---

### 9. MAKE ADMIN PANEL FUNCTIONAL 🟢 LARGE TASK

This is a MASSIVE task. Breaking it down:

#### 9.1 Schedule Management
**Files to Create**:
- `client/src/components/WilmaScheduleManager.tsx`
- `server/wilmaScheduleRoutes.ts`

**Features**:
- Create schedule entries
- Edit schedules
- Import/export CSV
- Conflict detection
- Bulk operations

#### 9.2 Course Management
**Files to Create**:
- `client/src/components/WilmaCourseManager.tsx`
- `server/wilmaCourseRoutes.ts`

**Features**:
- Add/edit courses
- Course enrollment
- Prerequisites
- Grade tracking

#### 9.3 Teacher Directory
**Files to Create**:
- `client/src/components/WilmaTeacherDirectory.tsx`

**Features**:
- Teacher profiles
- Subject assignments
- Schedule management
- Contact information

#### 9.4 Room Directory
**Files to Create**:
- `client/src/components/WilmaRoomDirectory.tsx`

**Features**:
- Room management
- Availability tracking
- Equipment inventory
- Booking system

#### 9.5 Announcements
**Files to Create**:
- `client/src/components/WilmaAnnouncementManager.tsx`

**Features**:
- Create announcements
- Target specific groups
- Schedule publishing
- Priority levels

#### 9.6 Analytics
**Files to Create**:
- `client/src/components/WilmaAnalytics.tsx`

**Features**:
- Performance trends
- Attendance statistics
- Grade distributions
- Custom reports

#### 9.7 Settings
**Files to Create**:
- `client/src/components/WilmaSettings.tsx`

**Features**:
- General settings
- Email configuration
- Notification preferences
- Security settings

---

## 📊 ESTIMATED TIME

### Critical Tasks (1-2 days):
- Password hashing: 2 hours
- Rate limiting: 1 hour
- Owner role protection: 2 hours
- Input validation: 3 hours
- Security headers: 1 hour
- **Total**: ~9 hours

### High Priority (1 day):
- Button size fixes: 2 hours
- ID-based routing: 3 hours
- **Total**: ~5 hours

### Medium Priority (2-3 days):
- Demo user routes: 4 hours
- **Total**: ~4 hours

### Large Task (1-2 weeks):
- Make admin panel functional: 40-80 hours
- **Total**: ~40-80 hours

---

## 🎯 RECOMMENDED APPROACH

### Week 1 (Critical):
- Day 1: Password hashing + Rate limiting
- Day 2: Owner role + Input validation
- Day 3: Security headers + Button fixes
- Day 4: ID-based routing
- Day 5: Testing + Bug fixes

### Week 2 (Features):
- Day 1-2: Demo user routes
- Day 3-5: Start admin panel (Schedule)

### Week 3-4 (Admin Panel):
- Implement remaining admin features
- Testing
- Documentation

---

## 🚨 CRITICAL NOTES

1. **Password Hashing**: MUST be done before any real users
2. **Rate Limiting**: MUST be done to prevent attacks
3. **Owner Role**: MUST be done for access control
4. **Testing**: Test each feature thoroughly
5. **Backup**: Backup database before major changes

---

## 📞 SUPPORT

If you need help with any implementation:
- Check documentation in each section
- Test in development first
- Commit frequently
- Ask for help if stuck

---

**Created**: April 17, 2026  
**Status**: 🔄 Ready for Implementation  
**Priority**: 🔴 CRITICAL tasks first

