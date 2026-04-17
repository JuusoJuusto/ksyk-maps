# Quick Reference Guide - New Features

## 🚀 Rate Limiting

### How to Use
```typescript
import { rateLimiters } from "./rateLimiter";

// Apply to any route
app.post('/api/your-endpoint', rateLimiters.auth, async (req, res) => {
  // Your logic here
});
```

### Available Rate Limiters
| Name | Limit | Window | Use Case |
|------|-------|--------|----------|
| `auth` | 5 requests | 15 minutes | Login endpoints |
| `api` | 60 requests | 1 minute | General API calls |
| `general` | 100 requests | 1 minute | Public endpoints |
| `passwordReset` | 3 requests | 1 hour | Password changes |
| `externalService` | 30 requests | 1 minute | HSL, lunch menu |

### Create Custom Rate Limiter
```typescript
import { createRateLimiter } from "./rateLimiter";

const customLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests
  message: 'Custom rate limit message',
  keyGenerator: (req) => req.user?.id || req.ip // Custom key
});

app.post('/api/custom', customLimiter, handler);
```

## 🎮 Demo Routes

### Available Endpoints

#### Campus Data
```bash
GET /api/demo/campus
```
Returns: Buildings, rooms, and staff data

#### User Profile
```bash
GET /api/demo/user
```
Returns: Sample student profile

#### Schedule
```bash
GET /api/demo/schedule
```
Returns: Today's class schedule

#### Grades
```bash
GET /api/demo/grades
```
Returns: Courses, grades, and assignments

#### Messages
```bash
GET /api/demo/messages
```
Returns: Sample Wilma messages

#### Health Check
```bash
GET /api/demo/health
```
Returns: Server status and uptime

#### Rate Limit Test
```bash
GET /api/demo/rate-limit-test
```
Returns: Test rate limiting (30 req/min)

### Testing Demo Routes
```bash
# Using curl
curl http://localhost:5000/api/demo/campus

# Using fetch in browser console
fetch('/api/demo/user').then(r => r.json()).then(console.log)

# Using Postman
GET http://localhost:5000/api/demo/schedule
```

## 🔗 ID-Based Routing

### Wilma Routes
```typescript
// Student routes
/wilma/:studentId                    // Main view
/wilma/:studentId/message/:messageId // View message
/wilma/:studentId/compose            // Compose message
/wilma/:studentId/:section           // Specific section

// Teacher routes
/wilma/teacher/:teacherId            // Teacher main view
/wilma/teacher/:teacherId/:section   // Teacher section
```

### Usage Examples
```typescript
// Navigate to student view
<Link href={`/wilma/${studentId}`}>View Wilma</Link>

// Navigate to specific message
<Link href={`/wilma/${studentId}/message/${messageId}`}>Read Message</Link>

// Navigate to compose
<Link href={`/wilma/${studentId}/compose`}>New Message</Link>

// Navigate to section
<Link href={`/wilma/${studentId}/schedule`}>Schedule</Link>
```

### Access Route Parameters
```typescript
import { useRoute } from 'wouter';

function WilmaPage() {
  const [match, params] = useRoute('/wilma/:studentId/:section?');
  
  if (match) {
    console.log('Student ID:', params.studentId);
    console.log('Section:', params.section);
  }
}
```

## 📱 Mobile UI Classes

### Responsive Breakpoints
```css
/* Tailwind breakpoints */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Common Patterns

#### Responsive Sizing
```tsx
<div className="w-full sm:w-1/2 lg:w-1/3">
  {/* Full width on mobile, half on tablet, third on desktop */}
</div>
```

#### Responsive Text
```tsx
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Responsive Heading
</h1>
```

#### Responsive Padding/Margin
```tsx
<div className="p-2 sm:p-4 md:p-6 lg:p-8">
  Responsive padding
</div>
```

#### Show/Hide by Screen Size
```tsx
{/* Show only on mobile */}
<div className="block lg:hidden">Mobile only</div>

{/* Show only on desktop */}
<div className="hidden lg:block">Desktop only</div>
```

#### Responsive Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* 1 column mobile, 2 tablet, 3 laptop, 4 desktop */}
</div>
```

#### Responsive Flex
```tsx
<div className="flex flex-col sm:flex-row gap-4">
  {/* Stack on mobile, row on tablet+ */}
</div>
```

### Mobile-First Best Practices

1. **Touch Targets**: Minimum 44x44px
```tsx
<button className="min-h-[44px] min-w-[44px] p-3">
  Touch-friendly
</button>
```

2. **Readable Text**: Minimum 14px (text-sm)
```tsx
<p className="text-sm sm:text-base">
  Readable on all devices
</p>
```

3. **Adequate Spacing**
```tsx
<div className="space-y-4 sm:space-y-6">
  {/* More space on larger screens */}
</div>
```

4. **Mobile Menu**
```tsx
{/* Mobile menu button */}
<button className="lg:hidden">
  <Menu />
</button>

{/* Desktop navigation */}
<nav className="hidden lg:flex">
  {/* Nav items */}
</nav>
```

## 🔒 Security Best Practices

### Rate Limiting
- Always apply rate limiting to auth endpoints
- Use stricter limits for sensitive operations
- Monitor rate limit violations

### Error Handling
```typescript
try {
  // Your logic
} catch (error) {
  await logError(error, 'ENDPOINT_NAME', { details });
  res.status(500).json({ message: 'User-friendly error' });
}
```

### Input Validation
```typescript
// Normalize and validate inputs
const email = req.body.email?.toLowerCase().trim();
if (!email || !isValidEmail(email)) {
  return res.status(400).json({ message: 'Invalid email' });
}
```

## 🧪 Testing Checklist

### Rate Limiting
- [ ] Test auth endpoints block after limit
- [ ] Test rate limit headers are returned
- [ ] Test different IPs have separate limits
- [ ] Test limits reset after time window

### Demo Routes
- [ ] All demo endpoints return data
- [ ] Demo data is realistic
- [ ] Rate limiting works on demo routes
- [ ] No database errors

### Mobile UI
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPad (768px)
- [ ] Test on desktop (1920px)
- [ ] Touch targets are adequate
- [ ] Text is readable
- [ ] Navigation works on mobile

### ID-Based Routing
- [ ] Student routes work with IDs
- [ ] Teacher routes work with IDs
- [ ] Invalid IDs show error
- [ ] Route parameters are accessible

## 📊 Monitoring

### Check Rate Limit Stats
```typescript
// Add to admin dashboard
app.get('/api/admin/rate-limits', isAuthenticated, (req, res) => {
  // Return rate limit statistics
});
```

### Log Rate Limit Violations
```typescript
// In rateLimiter.ts
if (store[key].count > max) {
  console.warn(`Rate limit exceeded for ${key}`);
  // Log to database
}
```

## 🎯 Quick Commands

```bash
# Build project
npm run build

# Start development server
npm run dev

# Test rate limiting
for i in {1..10}; do curl -X POST http://localhost:5000/api/auth/admin-login; done

# Test demo routes
curl http://localhost:5000/api/demo/health

# Check build output
ls -la dist/public/assets/
```

## 📚 Additional Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Wouter Routing](https://github.com/molefrog/wouter)
- [Express Rate Limiting](https://expressjs.com/en/advanced/best-practice-security.html)
- [Mobile-First Design](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)

---

**Last Updated**: April 17, 2026
**Version**: 3.1.2
