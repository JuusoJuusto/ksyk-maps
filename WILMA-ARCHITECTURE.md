# Wilma System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         WILMA SYSTEM                             │
│                  School Management Platform                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Student    │  │   Teacher    │  │   Parent     │         │
│  │   Dashboard  │  │   Dashboard  │  │   Dashboard  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  Components:                                                     │
│  • Login Page (/wilma)                                          │
│  • WilmaUserManager                                             │
│  • Schedule View                                                │
│  • Grades View                                                  │
│  • Assignments View                                             │
│  • Messages View                                                │
│  • Attendance View                                              │
│  • Exams View                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    React Query (TanStack)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Authentication:                                                 │
│  POST /api/wilma/login                                          │
│                                                                  │
│  Users:                                                          │
│  GET    /api/wilma/users                                        │
│  GET    /api/wilma/users?role=student                           │
│  POST   /api/wilma/users                                        │
│  PUT    /api/wilma/users/:id                                    │
│  DELETE /api/wilma/users/:id                                    │
│                                                                  │
│  Schedules:                                                      │
│  GET  /api/wilma/schedules/:studentId                           │
│  POST /api/wilma/schedules                                      │
│                                                                  │
│  Grades:                                                         │
│  GET  /api/wilma/grades/:studentId                              │
│  POST /api/wilma/grades                                         │
│                                                                  │
│  Assignments:                                                    │
│  GET  /api/wilma/assignments/:studentId                         │
│  POST /api/wilma/assignments                                    │
│                                                                  │
│  Messages:                                                       │
│  GET  /api/wilma/messages/:userId                               │
│  POST /api/wilma/messages                                       │
│                                                                  │
│  Attendance:                                                     │
│  GET  /api/wilma/attendance/:studentId                          │
│  POST /api/wilma/attendance                                     │
│                                                                  │
│  Exams:                                                          │
│  GET  /api/wilma/exams/:studentId                               │
│  POST /api/wilma/exams                                          │
│                                                                  │
│  Stats:                                                          │
│  GET  /api/wilma/stats                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Express.js Middleware
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FirebaseStorage Methods:                                       │
│                                                                  │
│  Users:                                                          │
│  • getWilmaUsers(role?)                                         │
│  • getWilmaUser(id)                                             │
│  • getWilmaUserByUsername(username)                             │
│  • createWilmaUser(data)                                        │
│  • updateWilmaUser(id, data)                                    │
│  • deleteWilmaUser(id)                                          │
│                                                                  │
│  Schedules:                                                      │
│  • getWilmaSchedules(studentId)                                 │
│  • createWilmaSchedule(data)                                    │
│                                                                  │
│  Grades:                                                         │
│  • getWilmaGrades(studentId)                                    │
│  • createWilmaGrade(data)                                       │
│                                                                  │
│  Assignments:                                                    │
│  • getWilmaAssignments(studentId)                               │
│  • createWilmaAssignment(data)                                  │
│                                                                  │
│  Messages:                                                       │
│  • getWilmaMessages(userId)                                     │
│  • createWilmaMessage(data)                                     │
│                                                                  │
│  Attendance:                                                     │
│  • getWilmaAttendance(studentId)                                │
│  • createWilmaAttendance(data)                                  │
│                                                                  │
│  Exams:                                                          │
│  • getWilmaExams(studentId)                                     │
│  • createWilmaExam(data)                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Firebase Admin SDK
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Firebase Firestore Collections:                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wilmaUsers/                                              │  │
│  │   ├── students/list/{studentId}                         │  │
│  │   ├── parents/list/{parentId}                           │  │
│  │   └── {teacherId}                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wilmaSchedules/{scheduleId}                             │  │
│  │   • studentId, dayOfWeek, timeSlot                      │  │
│  │   • subject, room, teacherId, teacherName               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wilmaGrades/{gradeId}                                   │  │
│  │   • studentId, subject, grade                           │  │
│  │   • teacherId, teacherName, term, trend                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wilmaAssignments/{assignmentId}                         │  │
│  │   • studentId, title, subject, dueDate                  │  │
│  │   • status, grade, teacherId, teacherName               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wilmaMessages/{messageId}                               │  │
│  │   • fromUserId, fromUserName                            │  │
│  │   • toUserId, toUserName                                │  │
│  │   • subject, content, isRead                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wilmaAttendance/{attendanceId}                          │  │
│  │   • studentId, date, status                             │  │
│  │   • hours, reason                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wilmaExams/{examId}                                     │  │
│  │   • studentId, subject, date, time                      │  │
│  │   • room, topics, teacherId, teacherName                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow

### 1. User Login Flow
```
User enters credentials
        ↓
POST /api/wilma/login
        ↓
Validate username/password
        ↓
Check user role
        ↓
Create session
        ↓
Return user data + token
        ↓
Redirect to role-based dashboard
```

### 2. Student Views Schedule
```
Student logs in
        ↓
GET /api/wilma/schedules/:studentId
        ↓
firebaseStorage.getWilmaSchedules(studentId)
        ↓
Query Firestore: wilmaSchedules collection
        ↓
Filter by studentId and isActive
        ↓
Return schedule array
        ↓
Display weekly timetable
```

### 3. Teacher Adds Grade
```
Teacher enters grade
        ↓
POST /api/wilma/grades
        ↓
Validate teacher authentication
        ↓
firebaseStorage.createWilmaGrade(data)
        ↓
Generate unique gradeId
        ↓
Save to Firestore: wilmaGrades collection
        ↓
Return created grade
        ↓
Update UI
```

### 4. Parent Views Child's Data
```
Parent logs in
        ↓
Get parent's children (via parent1Id/parent2Id)
        ↓
GET /api/wilma/grades/:studentId
GET /api/wilma/attendance/:studentId
GET /api/wilma/assignments/:studentId
        ↓
Fetch all child's data
        ↓
Display in parent dashboard
```

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Authentication Layer                                         │
│     • Session-based authentication                              │
│     • Secure password hashing                                   │
│     • Login rate limiting                                       │
│                                                                  │
│  2. Authorization Layer                                          │
│     • Role-based access control (RBAC)                          │
│     • Student: Own data only                                    │
│     • Teacher: All students                                     │
│     • Parent: Own children only                                 │
│     • Admin: Everything                                         │
│                                                                  │
│  3. Data Protection                                              │
│     • Password encryption (bcrypt)                              │
│     • Secure session storage                                    │
│     • HTTPS enforcement                                         │
│     • Input validation                                          │
│                                                                  │
│  4. API Security                                                 │
│     • isAuthenticated middleware                                │
│     • Request validation                                        │
│     • Error handling                                            │
│     • Rate limiting                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 User Roles & Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROLE HIERARCHY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Admin                                                           │
│  ├── Full system access                                         │
│  ├── User management                                            │
│  ├── System settings                                            │
│  └── All data access                                            │
│                                                                  │
│  Teacher                                                         │
│  ├── View all students                                          │
│  ├── Add/edit grades                                            │
│  ├── Create assignments                                         │
│  ├── Send messages                                              │
│  └── View attendance                                            │
│                                                                  │
│  Parent                                                          │
│  ├── View own children                                          │
│  ├── View grades                                                │
│  ├── View attendance                                            │
│  ├── View assignments                                           │
│  └── Send messages to teachers                                  │
│                                                                  │
│  Student                                                         │
│  ├── View own data                                              │
│  ├── View schedule                                              │
│  ├── View grades                                                │
│  ├── View assignments                                           │
│  ├── View messages                                              │
│  └── View attendance                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    TECHNOLOGY STACK                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend:                                                       │
│  • React 18.3.1                                                 │
│  • TypeScript 5.6.3                                             │
│  • TanStack Query (React Query)                                 │
│  • Wouter (Routing)                                             │
│  • Tailwind CSS                                                 │
│  • Shadcn/ui Components                                         │
│  • Lucide Icons                                                 │
│                                                                  │
│  Backend:                                                        │
│  • Node.js                                                      │
│  • Express.js 4.21.2                                            │
│  • TypeScript                                                   │
│  • Express Session                                              │
│  • Passport.js                                                  │
│                                                                  │
│  Database:                                                       │
│  • Firebase Firestore                                           │
│  • Firebase Admin SDK                                           │
│                                                                  │
│  Security:                                                       │
│  • bcrypt (Password hashing)                                    │
│  • express-rate-limit                                           │
│  • helmet (Security headers)                                    │
│                                                                  │
│  Development:                                                    │
│  • Vite 5.4.19                                                  │
│  • tsx (TypeScript execution)                                   │
│  • ESBuild                                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA RELATIONSHIPS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Parent ──┬── parent1Id ──→ Student                            │
│           └── parent2Id ──→ Student                            │
│                                                                  │
│  Student ──┬── studentId ──→ Schedule                          │
│            ├── studentId ──→ Grades                            │
│            ├── studentId ──→ Assignments                       │
│            ├── studentId ──→ Attendance                        │
│            └── studentId ──→ Exams                             │
│                                                                  │
│  Teacher ──┬── teacherId ──→ Schedule                          │
│            ├── teacherId ──→ Grades                            │
│            ├── teacherId ──→ Assignments                       │
│            └── teacherId ──→ Exams                             │
│                                                                  │
│  User ─────┬── userId ──→ Messages (from)                      │
│            └── userId ──→ Messages (to)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Development:                                                    │
│  npm run dev → tsx server/index.ts                             │
│                                                                  │
│  Build:                                                          │
│  npm run build → vite build → dist/                            │
│                                                                  │
│  Production:                                                     │
│  npm start → node dist/index.js                                │
│                                                                  │
│  Seeding:                                                        │
│  npm run seed:wilma-data → tsx server/seedWilmaData.ts         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📈 Scalability Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCALABILITY                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current Capacity:                                               │
│  • 17 users (6 parents, 6 teachers, 5 students)                │
│  • 200+ data records                                            │
│                                                                  │
│  Designed to Scale:                                              │
│  • Firebase Firestore (auto-scaling)                           │
│  • Indexed queries for performance                              │
│  • Pagination support ready                                     │
│  • Caching layer possible                                       │
│                                                                  │
│  Future Enhancements:                                            │
│  • Redis caching                                                │
│  • CDN for static assets                                        │
│  • Load balancing                                               │
│  • Database sharding                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*This architecture supports a fully functional school management system with real-time data, secure authentication, and role-based access control.*
