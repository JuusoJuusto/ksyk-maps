# Integration Guide - New Features

## 🚀 Quick Start Integration

### Step 1: Database Setup

1. **Add new schema to main schema file:**

```typescript
// In shared/schema.ts, add at the end:
export * from './schema-additions';
```

2. **Generate and run migration:**

```bash
npm run db:generate
npm run db:push
```

### Step 2: API Routes Integration

1. **Copy routes from template:**
   - Open `server/routes-additions-template.ts`
   - Copy the routes you need
   - Add them to `server/routes.ts`

2. **Import new schema tables:**

```typescript
// At top of server/routes.ts
import { 
  schoolScheduleConfig, 
  wilmaAttendanceMarks, 
  wilmaCourses, 
  wilmaCourseEnrollments,
  wilmaClasses 
} from '../shared/schema-additions';
```

### Step 3: Component Integration

#### A. Schedule Configuration in Wilma Admin

```typescript
// In client/src/pages/wilma-admin.tsx or admin dashboard

import ScheduleConfigManager from '@/components/ScheduleConfigManager';

// Add new tab or section:
<TabsContent value="schedule-config">
  <ScheduleConfigManager />
</TabsContent>
```

#### B. Attendance Tracker for Teachers

```typescript
// In teacher dashboard or class management page

import AttendanceTracker from '@/components/AttendanceTracker';

// Add with teacher mode enabled:
<AttendanceTracker teacherMode={true} />
```

#### C. Attendance View for Students

```typescript
// In student dashboard

import AttendanceTracker from '@/components/AttendanceTracker';

// Add with student ID:
<AttendanceTracker studentId={currentUser.studentId} teacherMode={false} />
```

#### D. Enhanced Student Dashboard

```typescript
// Replace existing student dashboard in wilma.tsx

import EnhancedStudentDashboard from '@/components/EnhancedStudentDashboard';

// Use instead of current dashboard:
{isLoggedIn && currentUser.role === 'student' && (
  <EnhancedStudentDashboard 
    student={currentUser} 
    language={language} 
  />
)}
```

---

## 📋 Detailed Integration Steps

### 1. Wilma Admin Dashboard Integration

**File:** `client/src/pages/wilma-admin.tsx` or `client/src/pages/admin.tsx`

Add these new sections to the admin navigation:

```typescript
const adminSections = [
  // ... existing sections
  { id: 'schedule-config', icon: Calendar, label: 'Schedule Configuration' },
  { id: 'attendance', icon: UserCheck, label: 'Attendance Tracking' },
  { id: 'courses', icon: BookOpen, label: 'Course Management' },
  { id: 'classes', icon: Users, label: 'Class Management' },
];
```

Add the corresponding content sections:

```typescript
{activeSection === 'schedule-config' && (
  <ScheduleConfigManager />
)}

{activeSection === 'attendance' && (
  <AttendanceTracker teacherMode={true} />
)}

{activeSection === 'courses' && (
  <CourseManager /> // Create this component
)}

{activeSection === 'classes' && (
  <ClassManager /> // Create this component
)}
```

### 2. Teacher Dashboard Integration

**File:** `client/src/pages/wilma-teacher.tsx`

Add quick access to attendance tracking:

```typescript
import AttendanceTracker from '@/components/AttendanceTracker';

// In the dashboard section:
<Card>
  <CardHeader>
    <CardTitle>Quick Attendance</CardTitle>
  </CardHeader>
  <CardContent>
    <AttendanceTracker teacherMode={true} />
  </CardContent>
</Card>
```

### 3. Student View Integration

**File:** `client/src/pages/wilma.tsx`

Replace the current student dashboard:

```typescript
// Import the new component
import EnhancedStudentDashboard from '@/components/EnhancedStudentDashboard';

// Replace the existing dashboard rendering with:
{isLoggedIn && currentUser.role === 'student' && (
  <EnhancedStudentDashboard 
    student={currentUser} 
    language={language} 
  />
)}
```

Or add as a new tab:

```typescript
{activeSection === 'dashboard' && (
  <EnhancedStudentDashboard 
    student={currentUser} 
    language={language} 
  />
)}
```

### 4. Settings Integration

**Already Complete!** The Schedule tab has been added to `AppSettingsManager.tsx`

---

## 🔧 Creating Additional Components

### Course Manager Component

Create `client/src/components/CourseManager.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  
  useEffect(() => {
    fetchCourses();
  }, []);
  
  const fetchCourses = async () => {
    const response = await fetch('/api/wilma/courses');
    if (response.ok) {
      const data = await response.json();
      setCourses(data);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Course Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add course management UI here */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Class Manager Component

Create `client/src/components/ClassManager.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ClassManager() {
  const [classes, setClasses] = useState([]);
  
  useEffect(() => {
    fetchClasses();
  }, []);
  
  const fetchClasses = async () => {
    const response = await fetch('/api/wilma/classes');
    if (response.ok) {
      const data = await response.json();
      setClasses(data);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Class Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add class management UI here */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🎨 Styling Notes

All components use:
- Tailwind CSS for styling
- shadcn/ui components
- Gradient backgrounds for visual appeal
- Responsive design (mobile-first)
- Color-coded elements for better UX

### Color Scheme:
- **Green:** Success, present, positive
- **Red:** Error, absent, negative
- **Yellow:** Warning, late
- **Blue:** Information, neutral
- **Purple:** Special, behavioral
- **Orange:** Attention, forgot items
- **Pink:** Phone use

---

## 🔐 Permission Checks

Add these permission checks in your routes:

```typescript
// Check if user is admin
const isAdmin = (user: any) => {
  return user.role === 'admin' || user.roles?.includes('admin');
};

// Check if user is teacher
const isTeacher = (user: any) => {
  return user.role === 'teacher' || user.roles?.includes('teacher');
};

// Check if user can manage schedules
const canManageSchedules = (user: any) => {
  return isAdmin(user) || user.roles?.includes('schedule_admin');
};

// Use in routes:
app.post('/api/schedule-config', async (req, res) => {
  const user = req.user; // Get from session
  
  if (!canManageSchedules(user)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // ... rest of route
});
```

---

## 📱 Mobile Optimization

All components are mobile-optimized with:
- Responsive grid layouts
- Touch-friendly buttons (min 44x44px)
- Collapsible sections on mobile
- Horizontal scrolling for tables
- Bottom navigation for mobile

Test on these breakpoints:
- Mobile: 320px - 640px
- Tablet: 641px - 1024px
- Desktop: 1025px+

---

## 🧪 Testing Checklist

### Schedule Configuration:
- [ ] Create new schedule
- [ ] Edit existing schedule
- [ ] Delete schedule
- [ ] Set as default
- [ ] Set as active
- [ ] Add/remove periods
- [ ] Change period times
- [ ] Set effective dates

### Attendance Tracking:
- [ ] Add present mark
- [ ] Add absent mark
- [ ] Add late mark
- [ ] Add behavioral marks
- [ ] Set severity levels
- [ ] Add notes
- [ ] Filter by date
- [ ] Filter by mark type
- [ ] View statistics
- [ ] Delete marks

### Student Dashboard:
- [ ] View on mobile
- [ ] View on desktop
- [ ] Switch tabs
- [ ] View schedule
- [ ] View grades
- [ ] View assignments
- [ ] View profile
- [ ] Switch language

### Multiple Roles:
- [ ] Assign multiple roles to user
- [ ] Test admin access
- [ ] Test teacher access
- [ ] Test student access
- [ ] Test custom roles

---

## 🐛 Troubleshooting

### Issue: Components not showing
**Solution:** Check imports and make sure all dependencies are installed:
```bash
npm install
```

### Issue: Database errors
**Solution:** Run migrations:
```bash
npm run db:push
```

### Issue: API routes not working
**Solution:** Check that routes are properly imported in `server/routes.ts`

### Issue: Styling looks broken
**Solution:** Make sure Tailwind CSS is configured and running:
```bash
npm run dev
```

### Issue: TypeScript errors
**Solution:** Regenerate types:
```bash
npm run db:generate
```

---

## 📚 Additional Resources

### Documentation:
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/
- Drizzle ORM: https://orm.drizzle.team/

### Component Libraries Used:
- `@/components/ui/card`
- `@/components/ui/button`
- `@/components/ui/input`
- `@/components/ui/label`
- `@/components/ui/switch`
- `@/components/ui/tabs`
- `@/components/ui/badge`
- `@/components/ui/slider`

### Icons:
- lucide-react: https://lucide.dev/

---

## 🎯 Next Steps

1. **Immediate:**
   - Run database migrations
   - Add API routes
   - Integrate components into admin dashboard

2. **Short-term:**
   - Create CourseManager component
   - Create ClassManager component
   - Add permission checks
   - Test on mobile devices

3. **Long-term:**
   - Add parent notification system
   - Add email notifications for attendance
   - Add attendance reports
   - Add schedule conflict detection
   - Add course enrollment management

---

## 💡 Tips for Success

1. **Start Small:** Integrate one feature at a time
2. **Test Often:** Test after each integration step
3. **Use TypeScript:** Let TypeScript catch errors early
4. **Follow Patterns:** Use existing code patterns in the project
5. **Mobile First:** Always test on mobile devices
6. **User Feedback:** Get feedback from actual users
7. **Document Changes:** Keep documentation up to date

---

## 🤝 Support

If you encounter issues:
1. Check the console for errors
2. Verify database migrations ran successfully
3. Check API routes are properly configured
4. Ensure all imports are correct
5. Test with different user roles

---

**Last Updated:** April 21, 2026  
**Version:** 1.0.0  
**Status:** Ready for Integration
