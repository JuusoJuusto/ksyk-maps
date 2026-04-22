# EduWilma - Modern School Management Platform
## MVP Implementation Plan

### 🎯 PROJECT SCOPE
Building a comprehensive, modern school management system that goes beyond traditional Wilma, with Finnish UI and full-width responsive design.

---

## PHASE 1: FOUNDATION (Week 1-2)

### 1.1 Enhanced Identity & Roles System ✅ PRIORITY
**Database Schema:**
```typescript
// Enhanced User with fine-grained permissions
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[]; // Multiple roles support
  permissions: Permission[];
  classPermissions: ClassPermission[];
  schoolPermissions: SchoolPermission[];
  profileImage?: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface Role {
  id: string;
  name: 'student' | 'teacher' | 'guardian' | 'admin' | 'substitute' | 'counselor';
  level: number; // Hierarchy level
}

interface Permission {
  resource: string; // 'grades', 'attendance', 'messages', etc.
  actions: ('read' | 'write' | 'delete' | 'approve')[];
  scope: 'own' | 'class' | 'school' | 'all';
}
```

**Features:**
- ✅ Multi-role support (one user can be teacher + counselor)
- ✅ Fine-grained permissions (not just role-based)
- ✅ Class-level permissions
- ✅ School-wide permissions
- ✅ Permission inheritance

### 1.2 Full-Width Responsive Layout
**CSS Changes:**
```css
/* Remove max-width constraints */
.main-container {
  max-width: 100% !important; /* Full width */
  padding: 0 2rem; /* Edge padding */
}

/* Responsive breakpoints */
@media (min-width: 1920px) {
  .main-container {
    padding: 0 4rem;
  }
}

@media (min-width: 2560px) {
  .main-container {
    padding: 0 6rem;
  }
}
```

---

## PHASE 2: CORE FEATURES (Week 3-4)

### 2.1 Tuntipäiväkirja (Lesson Journal) 🆕 HIGH PRIORITY
**Database Schema:**
```typescript
interface LessonJournal {
  id: string;
  lessonId: string;
  teacherId: string;
  classId: string;
  courseId: string;
  date: Date;
  
  // Content
  topic: string;
  contentTaught: string;
  learningObjectives: string[];
  
  // Attendance
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
  };
  
  // Homework
  homeworkAssigned: {
    title: string;
    description: string;
    deadline: Date;
    attachments: File[];
  }[];
  
  // Notes
  behaviorNotes: string;
  lessonProgress: 'behind' | 'on_track' | 'ahead';
  plannedVsActual: string;
  
  // Materials
  attachments: {
    name: string;
    url: string;
    type: 'slides' | 'worksheet' | 'reading' | 'other';
  }[];
  
  // Visibility
  visibleToStudents: boolean;
  visibleToGuardians: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**UI Components:**
- Teacher view: Full journal entry form
- Student view: Simplified summary
- Guardian view: What was taught + homework

### 2.2 Advanced Homework System
**Database Schema:**
```typescript
interface Homework {
  id: string;
  courseId: string;
  teacherId: string;
  classId: string;
  
  // Basic info
  title: string;
  description: string;
  type: 'assignment' | 'project' | 'reading' | 'practice';
  
  // Timing
  assignedDate: Date;
  dueDate: Date;
  lateSubmissionAllowed: boolean;
  lateDeadline?: Date;
  
  // Content
  instructions: string;
  attachments: File[];
  estimatedTime: number; // minutes
  
  // Grading
  maxPoints: number;
  rubric?: Rubric;
  weightInCourse: number;
  
  // Advanced features
  isTemplate: boolean;
  subtasks: Subtask[];
  peerReviewEnabled: boolean;
  
  // Reminders
  reminders: {
    daysBeforeDue: number;
    sent: boolean;
  }[];
  
  status: 'draft' | 'published' | 'closed';
}

interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  
  // Content
  textContent: string;
  attachments: File[];
  
  // Timing
  submittedAt: Date;
  isLate: boolean;
  
  // Grading
  grade?: number;
  feedback?: string;
  rubricScores?: RubricScore[];
  
  // Status
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  
  // Peer review
  peerReviews?: PeerReview[];
}
```

### 2.3 Enhanced Timetable System
**Features:**
- Weekly + daily views
- Real-time updates (WebSocket)
- Room tracking
- Teacher assignments
- Substitution handling
- Lesson cancellation/relocation
- Color-coded by subject
- Conflict detection

### 2.4 Advanced Grades System
**Database Schema:**
```typescript
interface Grade {
  id: string;
  studentId: string;
  courseId: string;
  assignmentId?: string;
  
  // Grade info
  value: number;
  maxValue: number;
  percentage: number;
  letterGrade?: string;
  
  // Context
  type: 'assignment' | 'exam' | 'participation' | 'final';
  weight: number;
  
  // Metadata
  teacherId: string;
  teacherComment?: string;
  gradedAt: Date;
  
  // History
  history: GradeChange[];
  
  // Visibility
  visibleToStudent: boolean;
  visibleToGuardian: boolean;
}

interface GradeChange {
  changedBy: string;
  previousValue: number;
  newValue: number;
  reason: string;
  timestamp: Date;
}
```

### 2.5 Comprehensive Attendance System
**Database Schema:**
```typescript
interface AttendanceRecord {
  id: string;
  studentId: string;
  lessonId: string;
  date: Date;
  
  // Status
  status: 'present' | 'absent' | 'late' | 'excused';
  
  // Timing
  arrivedAt?: Date;
  minutesLate?: number;
  
  // Reason
  reason?: {
    category: 'sick' | 'approved' | 'unexcused' | 'school_event' | 'other';
    description?: string;
    documentation?: File;
  };
  
  // Approval flow
  guardianApproved: boolean;
  guardianApprovedAt?: Date;
  teacherVerified: boolean;
  teacherVerifiedAt?: Date;
  
  // Alerts
  triggeredAlert: boolean;
  alertType?: 'pattern' | 'threshold' | 'consecutive';
  
  // Metadata
  recordedBy: string;
  recordedAt: Date;
  notes?: string;
}
```

---

## PHASE 3: ADVANCED FEATURES (Week 5-6)

### 3.1 Messaging System
**Features:**
- Student ↔ Teacher
- Guardian ↔ Teacher
- Admin broadcasts
- Class group chats
- File attachments
- Read status
- Message threading
- Archive system

### 3.2 Announcements System
**Features:**
- School-wide announcements
- Class-specific announcements
- Priority levels (normal, important, urgent)
- Expiry dates
- Rich text editor
- Attachments
- Target audience selection

### 3.3 Calendar System (Unified)
**Features:**
- Combines timetable, homework, exams, events
- Multiple views (day, week, month)
- Filters (school, personal, assignments, exams)
- Color coding
- Reminders
- Export to iCal/Google Calendar

### 3.4 Exams & Tests System
**Features:**
- Exam scheduling
- Seating plans
- Score breakdown
- Review mode
- Retake tracking
- Statistics

---

## PHASE 4: ANALYTICS & AI (Week 7-8)

### 4.1 Analytics Dashboard
**Student Analytics:**
- Grade trends
- Weak subjects identification
- Attendance impact on grades
- Study time tracking

**Teacher Analytics:**
- Class performance overview
- Assignment difficulty analysis
- Attendance patterns
- Workload balance

**Admin Analytics:**
- School-wide performance
- Teacher workload
- Resource utilization
- Trend analysis

### 4.2 Smart Notifications Engine
**Features:**
- Priority-based notifications
- Smart grouping (no spam)
- Custom rules
- Digest mode
- Push notifications
- Email fallback

---

## UI/UX DESIGN PRINCIPLES

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header (Full Width)                                     │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │  Main Content (Full Width)                  │
│ (Fixed)  │  - No max-width constraints                 │
│          │  - Responsive padding                       │
│          │  - Grid/Flex layouts                        │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Design System
**Colors:**
- Primary: `#0047AB` (Blue)
- Secondary: `#10b981` (Green)
- Accent: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)
- Background: `#f9fafb` (Light gray)

**Typography:**
- Headers: Inter Bold
- Body: Inter Regular
- Monospace: JetBrains Mono

**Components:**
- Cards with subtle shadows
- Rounded corners (8px)
- Smooth transitions (200ms)
- Hover states
- Loading states

---

## TECHNICAL STACK

### Frontend
- React 18
- TypeScript
- TailwindCSS
- React Query (data fetching)
- Zustand (state management)
- React Router (navigation)
- Socket.io (real-time)

### Backend
- Node.js + Express
- PostgreSQL (main database)
- Firebase (auth + storage)
- Redis (caching)
- WebSocket (real-time)

### APIs
- RESTful API
- GraphQL (optional)
- WebSocket for real-time

---

## IMPLEMENTATION PRIORITY

### MVP (Must Have) - 4 weeks
1. ✅ Auth + Enhanced Roles
2. ✅ Full-width responsive layout
3. 🆕 Tuntipäiväkirja (Lesson Journal)
4. 🆕 Advanced Homework System
5. ✅ Timetable (enhanced)
6. ✅ Grades (enhanced)
7. ✅ Attendance (enhanced)
8. ✅ Messaging
9. ✅ Announcements

### Phase 2 (Should Have) - 2 weeks
10. Calendar (unified)
11. Exams & Tests
12. File & Materials Hub
13. Student Profiles
14. Course Management

### Phase 3 (Nice to Have) - 2 weeks
15. Analytics Dashboard
16. Smart Notifications
17. Behavior & Notes
18. Study Planner

### Phase 4 (Future) - Ongoing
19. AI Layer
20. Substitute Teacher System
21. Parent Portal Upgrade
22. Digital Classroom Mode

---

## DATABASE SCHEMA OVERVIEW

### Core Tables
- users
- roles
- permissions
- classes
- courses
- lessons
- lesson_journals (NEW)
- homework (ENHANCED)
- submissions (NEW)
- grades
- attendance_records
- messages
- announcements
- calendar_events
- files
- notifications

### Relationship Tables
- user_roles
- user_permissions
- class_students
- class_teachers
- course_enrollments
- homework_reminders

---

## API ENDPOINTS

### Lesson Journal
```
POST   /api/lesson-journals
GET    /api/lesson-journals/:id
PUT    /api/lesson-journals/:id
DELETE /api/lesson-journals/:id
GET    /api/lesson-journals/class/:classId
GET    /api/lesson-journals/teacher/:teacherId
GET    /api/lesson-journals/student/:studentId (simplified)
```

### Homework
```
POST   /api/homework
GET    /api/homework/:id
PUT    /api/homework/:id
DELETE /api/homework/:id
GET    /api/homework/class/:classId
GET    /api/homework/student/:studentId
POST   /api/homework/:id/submit
GET    /api/homework/:id/submissions
PUT    /api/homework/submission/:id/grade
```

---

## NEXT STEPS

1. **Immediate**: Fix full-width layout
2. **Day 1-2**: Build Tuntipäiväkirja component
3. **Day 3-4**: Build Advanced Homework System
4. **Day 5-7**: Enhance existing features
5. **Week 2**: Testing and refinement

---

**Status**: 📋 Planning Complete
**Start Date**: April 22, 2026
**Target MVP**: May 20, 2026 (4 weeks)
