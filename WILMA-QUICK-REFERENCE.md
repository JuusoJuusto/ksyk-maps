# Wilma System - Quick Reference Guide

## 🚀 Quick Start

### 1. Seed the Database
```bash
npm run seed:wilma-data
```

This creates:
- **6 Parents** (Matti & Liisa Virtanen, Pekka & Anna Korhonen, Juha & Sari Mäkinen)
- **6 Teachers** (Math, Finnish, English, History, Physics, Chemistry)
- **5 Students** (Mikko Virtanen 9A, Emma Korhonen 9A, Ville Mäkinen 9B, Sofia Virtanen 8A, Oskari Korhonen 8B)
- **Complete data**: Schedules, Grades, Assignments, Messages, Attendance, Exams

### 2. Start the Server
```bash
npm run dev
```

### 3. Access Wilma
Navigate to: `http://localhost:5000/wilma`

## 🔑 Test Login Credentials

### Students
```
Username: mikko.virtanen
Password: [Generated - check console output]
Class: 9A

Username: emma.korhonen  
Password: [Generated - check console output]
Class: 9A

Username: ville.makinen
Password: [Generated - check console output]
Class: 9B
```

### Teachers
```
Username: matti.virtanen
Password: [Generated - check console output]
Subject: Matematiikka

Username: anna.korhonen
Password: [Generated - check console output]
Subject: Äidinkieli
```

### Parents
```
Username: matti.virtanen
Password: [Generated - check console output]
Children: Mikko & Sofia Virtanen

Username: pekka.korhonen
Password: [Generated - check console output]
Children: Emma & Oskari Korhonen
```

## 📊 What You'll See After Login

### Student View
- **Dashboard**: Personal stats, today's schedule, recent grades
- **Schedule**: Full weekly timetable (Mon-Fri, 5 time slots)
- **Grades**: All subjects with grades 6-10 and trends
- **Assignments**: Homework with due dates and status
- **Messages**: Messages from teachers
- **Attendance**: Daily attendance records
- **Exams**: Upcoming tests and exams

### Teacher View
- **Dashboard**: Class overview, student stats
- **Students**: List of all students
- **Grades**: Grade entry and management
- **Assignments**: Create and manage assignments
- **Messages**: Communicate with students/parents
- **Schedule**: Class schedules

### Parent View
- **Dashboard**: Children's overview
- **Children**: View each child's data
- **Grades**: Monitor academic progress
- **Messages**: Communicate with teachers
- **Attendance**: Track attendance

## 🎯 Key Features

### Real Data
- ✅ Actual Finnish school subjects
- ✅ Realistic schedules (08:00-16:30)
- ✅ Proper grade ranges (6-10)
- ✅ Real room numbers (100-400)
- ✅ Finnish names and addresses

### Functional Systems
- ✅ Login authentication
- ✅ Role-based access control
- ✅ Parent-student relationships
- ✅ Teacher-subject assignments
- ✅ Message system
- ✅ Attendance tracking
- ✅ Grade management

### Live Statistics
- ✅ Total users count
- ✅ Active users (last 24h)
- ✅ Students/Teachers/Parents breakdown
- ✅ Real-time updates

## 📱 API Endpoints

### Quick Test
```bash
# Get all students
curl http://localhost:5000/api/wilma/users?role=student

# Get student schedule
curl http://localhost:5000/api/wilma/schedules/123456

# Get student grades
curl http://localhost:5000/api/wilma/grades/123456

# Get dashboard stats
curl http://localhost:5000/api/wilma/stats
```

## 🔧 Troubleshooting

### No Data Showing?
1. Check if seed script ran successfully
2. Verify Firebase connection
3. Check browser console for errors
4. Ensure server is running

### Login Not Working?
1. Use exact credentials from seed output
2. Check username (lowercase, no spaces)
3. Verify user is active in database
4. Check server logs for errors

### API Errors?
1. Verify endpoint URLs
2. Check authentication token
3. Ensure user has proper role
4. Check server logs

## 📝 Common Tasks

### Add New Student
```typescript
POST /api/wilma/users
{
  "username": "new.student",
  "password": "SecurePass123",
  "firstName": "New",
  "lastName": "Student",
  "role": "student",
  "studentClass": "9A",
  "dateOfBirth": "2010-01-01",
  "parent1Id": "parent-id-here",
  "parent2Id": "parent-id-here"
}
```

### Add Grade
```typescript
POST /api/wilma/grades
{
  "studentId": "123456",
  "subject": "Matematiikka",
  "grade": "9",
  "teacherId": "teacher-id",
  "teacherName": "Matti Virtanen",
  "term": "Spring 2026",
  "trend": "up"
}
```

### Send Message
```typescript
POST /api/wilma/messages
{
  "fromUserId": "teacher-id",
  "fromUserName": "Matti Virtanen",
  "toUserId": "student-id",
  "toUserName": "Mikko Virtanen",
  "subject": "Great work!",
  "content": "Keep up the excellent progress in math."
}
```

## 🎨 Customization

### Change School Name
Edit `client/src/pages/wilma.tsx`:
```typescript
const t = {
  fi: {
    school: 'Your School Name',
    // ...
  }
}
```

### Add More Subjects
Edit `server/seedWilmaData.ts`:
```typescript
const subjects = [
  'Matematiikka', 
  'Äidinkieli', 
  'Englanti',
  'Your New Subject'
];
```

### Modify Time Slots
Edit `server/seedWilmaData.ts`:
```typescript
const timeSlots = [
  '08:00-09:30',
  '09:45-11:15',
  'Your New Time'
];
```

## 🎉 Success Checklist

- [ ] Seed script ran successfully
- [ ] Server is running
- [ ] Can access /wilma page
- [ ] Can login with test credentials
- [ ] Dashboard shows real stats
- [ ] Schedule displays weekly classes
- [ ] Grades show with trends
- [ ] Assignments are visible
- [ ] Messages are working
- [ ] Attendance records display
- [ ] Exams calendar shows

## 📞 Support

If you encounter issues:
1. Check server logs
2. Verify Firebase configuration
3. Ensure all dependencies are installed
4. Check browser console for errors
5. Review API endpoint responses

## 🚀 Next Steps

1. **Customize the UI** - Update colors, logos, branding
2. **Add More Features** - Homework submission, file uploads
3. **Enhance Security** - Add 2FA, password policies
4. **Mobile App** - Create React Native version
5. **Notifications** - Email/SMS alerts for grades, messages
6. **Analytics** - Track usage, performance metrics
7. **Integrations** - Connect to other school systems

---

**Everything is now functional and ready to use!** 🎉

Run `npm run seed:wilma-data` and start exploring your fully functional Wilma system!
