# 🚀 Wilma System - Quick Start Guide

## 📋 What's Been Created

### ✅ Files Created:
1. `shared/wilmaSchema.ts` - Complete database schema (15 tables)
2. `server/wilmaRoutes.ts` - Full REST API (50+ endpoints)
3. `WILMA-ENHANCEMENT-PLAN.md` - Detailed implementation plan
4. `WILMA-FEATURES.md` - Complete feature documentation

### 📊 Database Tables:
- `wilma_users` (already exists)
- `wilma_schedule` - Weekly class schedules
- `wilma_grades` - Student grades with feedback
- `wilma_assignments` - Homework and projects
- `wilma_messages` - Internal messaging
- `wilma_attendance` - Daily attendance tracking
- `wilma_exams` - Exam scheduling
- `wilma_courses` - Course catalog
- `wilma_course_enrollments` - Student enrollments
- `wilma_teachers` - Teacher directory
- `wilma_rooms` - Room directory
- `wilma_announcements` - School announcements
- `wilma_classes` - Class management
- `wilma_study_materials` - Learning resources
- `wilma_parent_students` - Parent-child links
- `wilma_notifications` - Notification system

---

## 🔧 Implementation Steps

### Step 1: Database Setup

Add the Wilma schema to your database:

```typescript
// In shared/schema.ts, add this import at the top:
export * from './wilmaSchema';
```

Then run database migration:
```bash
npm run db:push
# or
npx drizzle-kit push:pg
```

### Step 2: Register Wilma Routes

In `server/routes.ts`, add:

```typescript
import { registerWilmaRoutes } from './wilmaRoutes';

// After other route registrations:
registerWilmaRoutes(app);
```

### Step 3: Add Storage Methods

You need to implement these methods in `server/storage.ts` or `server/postgresStorage.ts`:

```typescript
// Wilma Users
getWilmaUsers()
getWilmaUser(id)
getWilmaUserByUsername(username)
createWilmaUser(data)
updateWilmaUser(id, data)
deleteWilmaUser(id)

// Schedule
getWilmaSchedule(studentId)
createWilmaSchedule(data)
updateWilmaSchedule(id, data)
deleteWilmaSchedule(id)

// Grades
getWilmaGrades(studentId)
getWilmaGradesSummary(studentId)
createWilmaGrade(data)
updateWilmaGrade(id, data)
deleteWilmaGrade(id)

// Assignments
getWilmaAssignments(studentId)
getWilmaAssignmentsByClass(classId)
createWilmaAssignment(data)
updateWilmaAssignment(id, data)
submitWilmaAssignment(id, data)
deleteWilmaAssignment(id)

// Messages
getWilmaMessages(userId)
getWilmaMessageThread(threadId)
createWilmaMessage(data)
markWilmaMessageAsRead(id)
deleteWilmaMessage(id)

// Attendance
getWilmaAttendance(studentId)
getWilmaAttendanceSummary(studentId)
createWilmaAttendance(data)
updateWilmaAttendance(id, data)
deleteWilmaAttendance(id)

// Exams
getWilmaExams(studentId)
getWilmaExamsByClass(classId)
createWilmaExam(data)
updateWilmaExam(id, data)
deleteWilmaExam(id)

// Courses
getWilmaCourses()
getWilmaCourse(id)
getWilmaCourseStudents(id)
createWilmaCourse(data)
enrollWilmaCourse(courseId, studentId)
updateWilmaCourse(id, data)
deleteWilmaCourse(id)

// Teachers
getWilmaTeachers()
getWilmaTeacher(id)
createWilmaTeacher(data)
updateWilmaTeacher(id, data)
deleteWilmaTeacher(id)

// Rooms
getWilmaRooms()
getWilmaRoom(id)
createWilmaRoom(data)
updateWilmaRoom(id, data)
deleteWilmaRoom(id)

// Announcements
getWilmaAnnouncements()
createWilmaAnnouncement(data)
updateWilmaAnnouncement(id, data)
deleteWilmaAnnouncement(id)

// Classes
getWilmaClasses()
getWilmaClass(id)
createWilmaClass(data)
updateWilmaClass(id, data)
deleteWilmaClass(id)

// Study Materials
getWilmaStudyMaterials()
getWilmaStudyMaterial(id)
createWilmaStudyMaterial(data)
updateWilmaStudyMaterial(id, data)
deleteWilmaStudyMaterial(id)

// Notifications
getWilmaNotifications(userId)
createWilmaNotification(data)
markWilmaNotificationAsRead(id)
deleteWilmaNotification(id)

// Parent-Student Links
getWilmaParentStudents(parentId)
createWilmaParentStudent(data)
deleteWilmaParentStudent(id)
```

### Step 4: Update Frontend

Update `client/src/pages/wilma.tsx` to use real API calls instead of mock data:

```typescript
// Replace mock data with API calls
const { data: schedule } = useQuery({
  queryKey: ['wilma-schedule', currentUser.studentId],
  queryFn: async () => {
    const res = await fetch(`/api/wilma/schedule/${currentUser.studentId}`);
    return res.json();
  }
});

const { data: grades } = useQuery({
  queryKey: ['wilma-grades', currentUser.studentId],
  queryFn: async () => {
    const res = await fetch(`/api/wilma/grades/${currentUser.studentId}`);
    return res.json();
  }
});

// ... and so on for all features
```

### Step 5: Fix Admin Logout

In `client/src/pages/admin.tsx`, update the logout handler:

```typescript
const handleLogout = () => {
  localStorage.removeItem('ksyk_admin_logged_in');
  localStorage.removeItem('ksyk_admin_user');
  setLocation('/'); // Changed from '/admin-login' to '/'
};
```

### Step 6: Implement Role-Based Routing

In `client/src/pages/wilma.tsx`, the login handler already has role-based routing:

```typescript
// Role-based routing after login
if (data.role === 'admin') {
  setLocation('/wilma-admin');
} else if (data.role === 'teacher') {
  setLocation(`/wilma/teacher/${data.id}`);
} else if (data.role === 'parent') {
  setLocation(`/wilma/parent/${data.id}`);
} else if (data.studentId) {
  setLocation(`/wilma/${data.studentId}`);
}
```

---

## 🎨 Frontend Components to Create

### Priority 1 (Core Features):
1. `WilmaScheduleView.tsx` - Weekly schedule calendar
2. `WilmaGradesView.tsx` - Grades with charts
3. `WilmaAssignmentsView.tsx` - Kanban board
4. `WilmaMessagesView.tsx` - Messaging interface
5. `WilmaAttendanceView.tsx` - Attendance calendar

### Priority 2 (Extended Features):
6. `WilmaExamsView.tsx` - Exam schedule
7. `WilmaCoursesView.tsx` - Course catalog
8. `WilmaTeachersView.tsx` - Teacher directory
9. `WilmaRoomsView.tsx` - Room directory
10. `WilmaAnnouncementsView.tsx` - Announcements feed

### Priority 3 (Admin Features):
11. `WilmaAdminDashboard.tsx` - Admin overview
12. `WilmaTeacherDashboard.tsx` - Teacher tools
13. `WilmaParentDashboard.tsx` - Parent view
14. `WilmaClassManagement.tsx` - Class admin
15. `WilmaMaterialsManager.tsx` - Materials upload

---

## 📝 Sample Storage Implementation

Here's an example for grades:

```typescript
// In server/postgresStorage.ts or server/storage.ts

async getWilmaGrades(studentId: string) {
  return await db
    .select()
    .from(wilmaGrades)
    .where(eq(wilmaGrades.studentId, studentId))
    .orderBy(desc(wilmaGrades.gradedAt));
}

async getWilmaGradesSummary(studentId: string) {
  const grades = await this.getWilmaGrades(studentId);
  
  const numericGrades = grades
    .filter(g => g.gradeNumeric)
    .map(g => parseFloat(g.gradeNumeric));
  
  const average = numericGrades.length > 0
    ? numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length
    : 0;
  
  return {
    grades,
    average: average.toFixed(2),
    total: grades.length,
    bySubject: grades.reduce((acc, grade) => {
      if (!acc[grade.subject]) {
        acc[grade.subject] = [];
      }
      acc[grade.subject].push(grade);
      return acc;
    }, {} as Record<string, typeof grades>)
  };
}

async createWilmaGrade(data: any) {
  const [grade] = await db
    .insert(wilmaGrades)
    .values(data)
    .returning();
  
  // Send notification
  await this.createWilmaNotification({
    userId: data.studentId,
    title: 'New Grade',
    message: `You received a grade of ${data.grade} in ${data.subject}`,
    type: 'grade',
    category: 'academic',
    relatedId: grade.id,
    relatedType: 'grade'
  });
  
  return grade;
}
```

---

## 🧪 Testing

### Test User Creation:
```bash
# Create test users via admin panel or API
POST /api/wilma/users
{
  "username": "test.student",
  "password": "password123",
  "firstName": "Test",
  "lastName": "Student",
  "role": "student",
  "studentClass": "9A",
  "studentId": "123456"
}
```

### Test Login:
```bash
POST /api/wilma/login
{
  "username": "test.student",
  "password": "password123"
}
```

### Test Schedule Creation:
```bash
POST /api/wilma/schedule
{
  "studentId": "123456",
  "dayOfWeek": 1,
  "timeSlot": "08:00-09:30",
  "startTime": "08:00",
  "endTime": "09:30",
  "subject": "Mathematics",
  "teacherName": "Mr. Smith",
  "room": "Room 301"
}
```

---

## 🎯 Quick Wins

### 1. Enable Wilma Routes (5 minutes)
- Import and register `registerWilmaRoutes(app)` in `server/routes.ts`
- Test with: `GET /api/wilma/users`

### 2. Create Test Data (10 minutes)
- Use admin panel to create Wilma users
- Create a few test students, teachers, and parents

### 3. Test Login Flow (5 minutes)
- Try logging in with different roles
- Verify role-based routing works

### 4. Add Real API Calls (30 minutes)
- Replace mock data in `wilma.tsx` with real API calls
- Test each section (schedule, grades, etc.)

### 5. Fix Admin Logout (2 minutes)
- Update logout handler to redirect to `/`
- Test logout flow

---

## 📚 Resources

- **API Documentation:** See `server/wilmaRoutes.ts` for all endpoints
- **Database Schema:** See `shared/wilmaSchema.ts` for table structures
- **Feature List:** See `WILMA-FEATURES.md` for complete feature documentation
- **Implementation Plan:** See `WILMA-ENHANCEMENT-PLAN.md` for detailed roadmap

---

## 🐛 Troubleshooting

### Database errors?
- Run `npm run db:push` to sync schema
- Check PostgreSQL connection

### API not working?
- Verify routes are registered
- Check storage methods are implemented
- Look at server console for errors

### Frontend not updating?
- Clear browser cache
- Check API responses in Network tab
- Verify query keys are correct

### Login issues?
- Check user exists in database
- Verify password is correct
- Check role is set properly

---

## 🚀 Next Steps

1. ✅ Database schema created
2. ✅ API routes created
3. ✅ Documentation complete
4. ⏳ Implement storage methods
5. ⏳ Update frontend components
6. ⏳ Test all features
7. ⏳ Deploy to production

---

## 💡 Tips

- Start with core features (schedule, grades, assignments)
- Test each feature as you implement it
- Use the existing `WilmaUserManager` as a reference
- Leverage TanStack Query for data fetching
- Add loading states and error handling
- Make it mobile-responsive from the start

---

**Ready to build the best student management system ever! 🎓**
