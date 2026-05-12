# 🚀 Coding Platform - Quick Start Guide

## ✅ Status: FULLY FUNCTIONAL & READY TO USE!

Everything is implemented and working. Follow this guide to start using the platform.

---

## 📋 Prerequisites

✅ **Backend**: Fully implemented with 15+ API endpoints
✅ **Frontend**: Connected to API with real data
✅ **Python Execution**: Pyodide integrated
✅ **AI Assistant**: Gemini API ready
✅ **Certificates**: jsPDF installed
✅ **Build**: Successful (no errors)

---

## 🎯 How to Access

### For Students
1. Go to Wilma: `/wilma/:userId`
2. Click on "Koodausplatformi" or navigate to `/wilma/:userId/learn-coding`
3. Browse courses, start learning!

### For Teachers/Admins
1. Go to Wilma Admin: `/wilma-admin/:adminId`
2. Navigate to `/wilma-admin/:adminId/learn-coding`
3. Create classrooms, manage students

---

## 🎓 Student Features

### 1. Browse Courses
- View all available courses (Python, JavaScript, HTML/CSS, C#)
- See difficulty level, estimated hours, and modules
- Track your progress on each course

### 2. Learn & Practice
- Complete lessons with tutorials and exercises
- Write Python code in the browser
- Run code with automatic test validation
- Earn XP for completing exercises

### 3. Get AI Help
```typescript
// Students can ask for help anytime
- "How do I use loops in Python?"
- "Explain this code to me"
- "I'm getting an error, can you help?"
- "Give me a hint for this exercise"
```

### 4. Track Progress
- View your XP and level
- See your streak (days in a row)
- Check your global rank
- View completed courses and lessons

### 5. Download Certificates
- Complete a course 100%
- Download professional PDF certificate
- Share your achievement!

---

## 👨‍🏫 Teacher Features

### 1. Create Classroom
```typescript
POST /api/coding/classroom/create
{
  "name": "9A Programming",
  "description": "Python basics for 9th grade",
  "teacherId": "teacher123",
  "teacherName": "Matti Meikäläinen"
}
// Returns: { id, name, joinCode: "ABC123", ... }
```

### 2. Share Join Code
- Give students the 6-character code (e.g., "ABC123")
- Students enter code to join classroom
- Track all students in one place

### 3. Assign Courses
- Assign specific courses to your classroom
- Set deadlines for assignments
- Track student progress

### 4. Monitor Progress
- View which students completed which lessons
- See XP earned by each student
- Identify students who need help

---

## 💻 Code Execution Examples

### Example 1: Hello World
```python
print("Hello, World!")
```
**Output**: `Hello, World!`

### Example 2: User Input
```python
name = input("What's your name? ")
print(f"Hello, {name}!")
```
**Input**: `Matti`
**Output**: `Hello, Matti!`

### Example 3: Loops
```python
for i in range(5):
    print(f"Number: {i}")
```
**Output**:
```
Number: 0
Number: 1
Number: 2
Number: 3
Number: 4
```

---

## 🤖 AI Assistant Examples

### Get Help
**Student**: "How do I reverse a string in Python?"

**AI**: "To reverse a string in Python, you can use slicing with `[::-1]`. For example:
```python
text = "hello"
reversed_text = text[::-1]
print(reversed_text)  # Output: olleh
```
The `[::-1]` means start at the end and go backwards with step -1."

### Debug Code
**Student**: "I'm getting 'SyntaxError: invalid syntax' on this code:
```python
if x = 5:
    print("Five")
```"

**AI**: "The error is because you're using `=` (assignment) instead of `==` (comparison) in your if statement. Change it to:
```python
if x == 5:
    print("Five")
```
Remember: `=` assigns a value, `==` compares values."

### Get Hint
**Student**: "I'm stuck on the exercise 'Write a function that finds the largest number in a list'. Can you give me a hint?"

**AI**: "Here's a hint without giving away the solution:
1. Think about how you would compare numbers one by one
2. You'll need a variable to keep track of the largest number so far
3. Loop through the list and update your 'largest' variable when you find a bigger number
4. Don't forget to handle the case of an empty list!

Try implementing this step by step. You can do it!"

---

## 📊 API Endpoints Reference

### Courses
- `GET /api/coding/courses` - List all courses
- `GET /api/coding/courses/:id` - Get course details
- `GET /api/coding/courses/:courseId/modules` - Get modules
- `GET /api/coding/modules/:moduleId/lessons` - Get lessons
- `GET /api/coding/lessons/:lessonId/exercises` - Get exercises

### Progress & Submissions
- `GET /api/coding/progress/:userId` - Get user progress
- `POST /api/coding/progress` - Update progress
- `POST /api/coding/submit` - Submit code
- `GET /api/coding/submissions/:userId` - Get submissions

### Classrooms
- `POST /api/coding/classroom/create` - Create classroom
- `POST /api/coding/classroom/join` - Join with code
- `GET /api/coding/classrooms` - List classrooms
- `GET /api/coding/classroom/:id/assignments` - Get assignments

### Stats & Leaderboard
- `GET /api/coding/stats/:userId` - Get user stats
- `GET /api/coding/leaderboard?type=alltime&limit=10` - Get leaderboard

### AI Assistant
- `POST /api/ai/coding-help` - Get AI coding help

---

## 🎮 Gamification System

### XP & Levels
- **Lesson completion**: 10-15 XP
- **Exercise completion**: 20-30 XP
- **Quiz completion**: 15-25 XP
- **Project completion**: 50-100 XP
- **Level up**: Every 500 XP

### Streaks
- **Daily login**: Maintain your streak
- **Streak rewards**: Bonus XP for long streaks
- **Streak recovery**: 1-day grace period

### Badges (Coming Soon)
- 🏆 First Exercise
- 🔥 7-Day Streak
- 🎓 Course Completed
- 💯 Perfect Score
- 🚀 100 Exercises

---

## 📱 Mobile Support

The platform is fully responsive and works on:
- 📱 **Mobile phones** (iOS, Android)
- 📱 **Tablets** (iPad, Android tablets)
- 💻 **Laptops** (Windows, Mac, Linux)
- 🖥️ **Desktops** (all browsers)

---

## 🌍 Language Support

The platform supports:
- 🇫🇮 **Finnish** (Suomi) - Primary language
- 🇬🇧 **English** - Full translation

Switch language anytime with the globe icon in the header.

---

## 🔧 Troubleshooting

### Python Code Not Running
**Problem**: Code doesn't execute
**Solution**: Wait for Pyodide to load (first time takes ~10 seconds)

### AI Assistant Not Responding
**Problem**: No response from AI
**Solution**: Check internet connection, Gemini API key must be set

### Certificate Not Downloading
**Problem**: Certificate button doesn't work
**Solution**: Ensure course is 100% complete, check browser pop-up blocker

### Progress Not Saving
**Problem**: Progress resets after refresh
**Solution**: Check if logged in to Wilma, verify user ID is correct

---

## 📈 Success Metrics

### For Students
- ✅ Complete at least 1 lesson per day
- ✅ Maintain a 7-day streak
- ✅ Earn 500 XP (reach level 2)
- ✅ Complete 1 full course
- ✅ Download your first certificate

### For Teachers
- ✅ Create your first classroom
- ✅ Get 10+ students to join
- ✅ Assign 1 course
- ✅ Track student progress weekly
- ✅ Help struggling students with AI insights

---

## 🎊 Next Steps

### Week 1: Get Started
1. ✅ Access the platform
2. ✅ Browse available courses
3. ✅ Start Python Basics course
4. ✅ Complete first lesson
5. ✅ Earn your first XP

### Week 2: Build Momentum
1. ✅ Complete 5 lessons
2. ✅ Try the AI assistant
3. ✅ Join a classroom (if student)
4. ✅ Reach level 2
5. ✅ Start a 7-day streak

### Week 3: Master Skills
1. ✅ Complete 50% of a course
2. ✅ Submit 20 exercises
3. ✅ Use AI for debugging
4. ✅ Help other students
5. ✅ Reach level 3

### Week 4: Achieve Goals
1. ✅ Complete your first course
2. ✅ Download certificate
3. ✅ Start second course
4. ✅ Reach top 50 on leaderboard
5. ✅ Share your success!

---

## 🎉 You're Ready!

The coding platform is **fully functional** and ready to use. Start learning, earn XP, and become a coding master!

### Quick Links
- 📚 **Courses**: `/wilma/:userId/learn-coding/courses`
- 💻 **Practice**: `/wilma/:userId/learn-coding/practice`
- 🏆 **Leaderboard**: `/wilma/:userId/learn-coding/compete`
- 👥 **Classroom**: `/wilma/:userId/learn-coding/classroom`
- 📊 **Profile**: `/wilma/:userId/learn-coding/profile`

### Support
- 🤖 **AI Assistant**: Built-in help anytime
- 👨‍🏫 **Teachers**: Ask your teacher
- 📖 **Documentation**: Check lesson content
- 💬 **Community**: Coming soon!

---

**Happy Coding! 🚀**

*Remember: Every expert was once a beginner. Keep practicing, stay curious, and never stop learning!*
