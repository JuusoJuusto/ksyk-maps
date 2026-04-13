# Wilma Backend Enhancement Plan

## Overview
This document outlines the comprehensive enhancements to the Wilma student management system, including improved backend, better authentication flow, and enhanced features.

## 1. Enhanced Database Schema

### New Tables to Add:

#### wilma_schedule
- id, studentId, dayOfWeek, timeSlot, subject, teacherId, teacherName, room, roomId
- Stores weekly schedule for each student
- Supports multiple time slots per day

#### wilma_grades  
- id, studentId, subject, grade, gradeNumeric, teacherId, term, gradeType, feedback, gradedAt
- Tracks all grades (midterm, final, assignments)
- Includes teacher feedback and grade trends

#### wilma_assignments
- id, studentId, classId, title, description, subject, teacherId, dueDate, status
- submittedAt, submissionText, submissionFiles, grade, feedback, maxPoints, earnedPoints
- Full assignment lifecycle management

#### wilma_messages
- id, senderId, recipientId, subject, body, isRead, readAt, parentMessageId
- Internal messaging system between students, teachers, parents

#### wilma_attendance
- id, studentId, date, status (present/absent/late), hours, reason, notes, markedBy
- Daily attendance tracking with reasons

#### wilma_exams
- id, studentId, classId, subject, examDate, examTime, room, topics, duration
- instructions, materials, teacherId, status
- Upcoming exam schedule and details

#### wilma_courses
- id, courseCode, courseName, teacherId, term, credits, description, schedule
- Course catalog and enrollment

#### wilma_announcements
- id, title, content, authorId, targetAudience, priority, expiresAt
- School-wide or class-specific announcements

## 2. Backend API Endpoints

### Authentication
- POST /api/wilma/login - Login with username/password
- POST /api/wilma/logout - Logout and clear session
- POST /api/wilma/forgot-password - Password reset request
- POST /api/wilma/reset-password - Reset password with token

### User Management
- GET /api/wilma/users - List all users (admin)
- GET /api/wilma/users/:id - Get user details
- POST /api/wilma/users - Create new user
- PUT /api/wilma/users/:id - Update user
- DELETE /api/wilma/users/:id - Delete user

### Schedule
- GET /api/wilma/schedule/:studentId - Get student schedule
- POST /api/wilma/schedule - Create schedule entry
- PUT /api/wilma/schedule/:id - Update schedule
- DELETE /api/wilma/schedule/:id - Delete schedule entry

### Grades
- GET /api/wilma/grades/:studentId - Get all grades
- GET /api/wilma/grades/:studentId/summary - Grade summary with average
- POST /api/wilma/grades - Add new grade
- PUT /api/wilma/grades/:id - Update grade
- DELETE /api/wilma/grades/:id - Delete grade

### Assignments
- GET /api/wilma/assignments/:studentId - Get student assignments
- GET /api/wilma/assignments/class/:classId - Get class assignments
- POST /api/wilma/assignments - Create assignment
- PUT /api/wilma/assignments/:id - Update assignment
- POST /api/wilma/assignments/:id/submit - Submit assignment
- DELETE /api/wilma/assignments/:id - Delete assignment

### Messages
- GET /api/wilma/messages/:userId - Get user messages
- GET /api/wilma/messages/:id - Get single message
- POST /api/wilma/messages - Send message
- PUT /api/wilma/messages/:id/read - Mark as read
- DELETE /api/wilma/messages/:id - Delete message

### Attendance
- GET /api/wilma/attendance/:studentId - Get attendance records
- GET /api/wilma/attendance/:studentId/summary - Attendance summary
- POST /api/wilma/attendance - Mark attendance
- PUT /api/wilma/attendance/:id - Update attendance
- DELETE /api/wilma/attendance/:id - Delete attendance record

### Exams
- GET /api/wilma/exams/:studentId - Get upcoming exams
- GET /api/wilma/exams/class/:classId - Get class exams
- POST /api/wilma/exams - Create exam
- PUT /api/wilma/exams/:id - Update exam
- DELETE /api/wilma/exams/:id - Delete exam

### Courses
- GET /api/wilma/courses - List all courses
- GET /api/wilma/courses/:id - Get course details
- GET /api/wilma/courses/:id/students - Get enrolled students
- POST /api/wilma/courses - Create course
- POST /api/wilma/courses/:id/enroll - Enroll student
- PUT /api/wilma/courses/:id - Update course
- DELETE /api/wilma/courses/:id - Delete course

### Announcements
- GET /api/wilma/announcements - Get active announcements
- GET /api/wilma/announcements/:id - Get announcement details
- POST /api/wilma/announcements - Create announcement
- PUT /api/wilma/announcements/:id - Update announcement
- DELETE /api/wilma/announcements/:id - Delete announcement

## 3. Frontend Enhancements

### Improved Login Flow
- Direct role-based routing after login (no separate admin login page)
- Admin → /wilma-admin
- Teacher → /wilma/teacher/:id
- Student → /wilma/:studentId
- Parent → /wilma/parent/:id

### Enhanced Features

#### Schedule View
- Interactive weekly calendar
- Color-coded subjects
- Click to see room location on map
- Teacher contact info
- Export to calendar (iCal)

#### Grades Section
- Visual grade trends (charts)
- Subject-wise breakdown
- GPA calculator
- Grade history timeline
- Comparison with class average

#### Assignments
- Kanban board view (To Do, In Progress, Submitted, Graded)
- File upload for submissions
- Due date reminders
- Assignment calendar view
- Filter by subject/status

#### Messages
- Threaded conversations
- Rich text editor
- File attachments
- Read receipts
- Search and filter
- Compose to multiple recipients

#### Attendance
- Monthly calendar view
- Attendance percentage
- Absence reasons
- Parent notifications
- Export attendance report

#### Exams
- Countdown timers
- Study materials links
- Exam preparation checklist
- Past exam results
- Room finder integration

#### Dashboard Widgets
- Today's schedule
- Upcoming assignments (next 7 days)
- Recent grades
- Unread messages count
- Attendance summary
- Next exam countdown

## 4. Admin Panel Improvements

### Unified Admin Portal
- Single login for all admin functions
- Logout redirects to home page (not Wilma login)
- Integrated with KSYK Maps admin

### Admin Features
- Bulk user import (CSV)
- Bulk schedule creation
- Grade entry interface
- Assignment templates
- Message broadcast
- Attendance reports
- Analytics dashboard

## 5. Teacher Features

### Teacher Dashboard
- My classes overview
- Today's schedule
- Pending assignments to grade
- Student attendance summary
- Quick message students

### Teacher Tools
- Grade book
- Assignment creator
- Attendance marker
- Message center
- Class roster
- Performance analytics

## 6. Parent Features

### Parent Dashboard
- Multiple children support
- Combined view of all children
- Attendance alerts
- Grade notifications
- Message teachers
- Calendar sync

## 7. Security Enhancements

- Password strength requirements
- Session timeout
- Failed login attempt tracking
- Two-factor authentication (optional)
- Role-based access control
- Audit logging

## 8. Performance Optimizations

- Database indexing on frequently queried fields
- Caching for static data (schedules, courses)
- Lazy loading for large lists
- Pagination for all list views
- Optimistic UI updates

## 9. Mobile Responsiveness

- Mobile-first design
- Touch-friendly interface
- Offline mode support
- Push notifications
- Progressive Web App (PWA)

## 10. Integration with KSYK Maps

- Room finder from schedule
- Teacher office locations
- Exam room navigation
- Campus map integration
- Building/room search

## Implementation Priority

### Phase 1 (High Priority)
1. Enhanced database schema
2. Core API endpoints (auth, users, schedule, grades)
3. Improved login flow
4. Basic dashboard

### Phase 2 (Medium Priority)
1. Assignments system
2. Messages system
3. Attendance tracking
4. Teacher features

### Phase 3 (Low Priority)
1. Exams system
2. Courses management
3. Announcements
4. Parent features
5. Advanced analytics

## Next Steps

1. Create database migration for new tables
2. Implement storage methods in server/storage.ts
3. Create API routes in server/wilmaRoutes.ts
4. Update frontend components
5. Add role-based routing
6. Test all features
7. Deploy and monitor

