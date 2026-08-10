import type { Express } from "express";
import { storage } from "./storage";
import { insertWilmaUserSchema } from "../shared/schema.js";
import { sendPasswordSetupEmail, generateTempPassword } from "./emailService";

export function registerWilmaRoutes(app: Express) {
  // ==================== AUTHENTICATION ====================
  
  app.post('/api/wilma/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }
      const user = await storage.getWilmaUserByUsername(username.trim());
      if (!user || !user.isActive || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      res.json(user);
    } catch (error) {
      console.error('Wilma login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // ==================== USERS ====================
  
  app.get('/api/wilma/users', async (req, res) => {
    try {
      const users = await storage.getWilmaUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/wilma/users/:id', async (req, res) => {
    try {
      const user = await storage.getWilmaUser(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.post('/api/wilma/users', async (req, res) => {
    try {
      const userData = insertWilmaUserSchema.parse(req.body);
      const existingUser = await storage.getWilmaUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      let password = userData.password;
      if (req.body.sendEmailInvitation && userData.email) {
        password = generateTempPassword();
        userData.password = password;
      }
      const user = await storage.createWilmaUser(userData);
      if (req.body.sendEmailInvitation && userData.email && password) {
        await sendPasswordSetupEmail(userData.email, `${userData.firstName} ${userData.lastName}`, password);
      }
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to create user' });
    }
  });

  app.put('/api/wilma/users/:id', async (req, res) => {
    try {
      const userData = insertWilmaUserSchema.partial().parse(req.body);
      const user = await storage.updateWilmaUser(req.params.id, userData);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update user' });
    }
  });

  app.delete('/api/wilma/users/:id', async (req, res) => {
    try {
      await storage.deleteWilmaUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // ==================== SCHEDULE ====================
  
  app.get('/api/wilma/schedule/:studentId', async (req, res) => {
    try {
      const schedule = await storage.getWilmaSchedule(req.params.studentId);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch schedule' });
    }
  });

  app.post('/api/wilma/schedule', async (req, res) => {
    try {
      const schedule = await storage.createWilmaSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create schedule' });
    }
  });

  app.put('/api/wilma/schedule/:id', async (req, res) => {
    try {
      const schedule = await storage.updateWilmaSchedule(req.params.id, req.body);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update schedule' });
    }
  });

  app.delete('/api/wilma/schedule/:id', async (req, res) => {
    try {
      await storage.deleteWilmaSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete schedule' });
    }
  });

  // ==================== GRADES ====================
  
  app.get('/api/wilma/grades/:studentId', async (req, res) => {
    try {
      const grades = await storage.getWilmaGrades(req.params.studentId);
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch grades' });
    }
  });

  app.get('/api/wilma/grades/:studentId/summary', async (req, res) => {
    try {
      const summary = await storage.getWilmaGradesSummary(req.params.studentId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch grade summary' });
    }
  });

  app.post('/api/wilma/grades', async (req, res) => {
    try {
      const grade = await storage.createWilmaGrade(req.body);
      res.status(201).json(grade);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create grade' });
    }
  });

  app.put('/api/wilma/grades/:id', async (req, res) => {
    try {
      const grade = await storage.updateWilmaGrade(req.params.id, req.body);
      res.json(grade);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update grade' });
    }
  });

  app.delete('/api/wilma/grades/:id', async (req, res) => {
    try {
      await storage.deleteWilmaGrade(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete grade' });
    }
  });

  // ==================== ASSIGNMENTS ====================
  
  app.get('/api/wilma/assignments/:studentId', async (req, res) => {
    try {
      const assignments = await storage.getWilmaAssignments(req.params.studentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch assignments' });
    }
  });

  app.get('/api/wilma/assignments/class/:classId', async (req, res) => {
    try {
      const assignments = await storage.getWilmaAssignmentsByClass(req.params.classId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch class assignments' });
    }
  });

  app.post('/api/wilma/assignments', async (req, res) => {
    try {
      const assignment = await storage.createWilmaAssignment(req.body);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create assignment' });
    }
  });

  app.put('/api/wilma/assignments/:id', async (req, res) => {
    try {
      const assignment = await storage.updateWilmaAssignment(req.params.id, req.body);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update assignment' });
    }
  });

  app.post('/api/wilma/assignments/:id/submit', async (req, res) => {
    try {
      const submission = await storage.submitWilmaAssignment(req.params.id, req.body);
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: 'Failed to submit assignment' });
    }
  });

  app.delete('/api/wilma/assignments/:id', async (req, res) => {
    try {
      await storage.deleteWilmaAssignment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete assignment' });
    }
  });

  // ==================== MESSAGES ====================
  
  app.get('/api/wilma/messages/:userId', async (req, res) => {
    try {
      const messages = await storage.getWilmaMessages(req.params.userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.get('/api/wilma/messages/thread/:threadId', async (req, res) => {
    try {
      const messages = await storage.getWilmaMessageThread(req.params.threadId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch message thread' });
    }
  });

  app.post('/api/wilma/messages', async (req, res) => {
    try {
      const message = await storage.createWilmaMessage(req.body);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create message' });
    }
  });

  app.put('/api/wilma/messages/:id/read', async (req, res) => {
    try {
      const message = await storage.markWilmaMessageAsRead(req.params.id);
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: 'Failed to mark message as read' });
    }
  });

  app.delete('/api/wilma/messages/:id', async (req, res) => {
    try {
      await storage.deleteWilmaMessage(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete message' });
    }
  });

  // ==================== ATTENDANCE ====================
  
  app.get('/api/wilma/attendance/:studentId', async (req, res) => {
    try {
      const attendance = await storage.getWilmaAttendance(req.params.studentId);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch attendance' });
    }
  });

  app.get('/api/wilma/attendance/:studentId/summary', async (req, res) => {
    try {
      const summary = await storage.getWilmaAttendanceSummary(req.params.studentId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch attendance summary' });
    }
  });

  app.post('/api/wilma/attendance', async (req, res) => {
    try {
      const attendance = await storage.createWilmaAttendance(req.body);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create attendance' });
    }
  });

  app.put('/api/wilma/attendance/:id', async (req, res) => {
    try {
      const attendance = await storage.updateWilmaAttendance(req.params.id, req.body);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update attendance' });
    }
  });

  app.delete('/api/wilma/attendance/:id', async (req, res) => {
    try {
      await storage.deleteWilmaAttendance(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete attendance' });
    }
  });

  // ==================== EXAMS ====================
  
  app.get('/api/wilma/exams/:studentId', async (req, res) => {
    try {
      const exams = await storage.getWilmaExams(req.params.studentId);
      res.json(exams);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch exams' });
    }
  });

  app.get('/api/wilma/exams/class/:classId', async (req, res) => {
    try {
      const exams = await storage.getWilmaExamsByClass(req.params.classId);
      res.json(exams);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch class exams' });
    }
  });

  app.post('/api/wilma/exams', async (req, res) => {
    try {
      const exam = await storage.createWilmaExam(req.body);
      res.status(201).json(exam);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create exam' });
    }
  });

  app.put('/api/wilma/exams/:id', async (req, res) => {
    try {
      const exam = await storage.updateWilmaExam(req.params.id, req.body);
      res.json(exam);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update exam' });
    }
  });

  app.delete('/api/wilma/exams/:id', async (req, res) => {
    try {
      await storage.deleteWilmaExam(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete exam' });
    }
  });

  // ==================== COURSES ====================
  
  app.get('/api/wilma/courses', async (req, res) => {
    try {
      const courses = await storage.getWilmaCourses();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch courses' });
    }
  });

  app.get('/api/wilma/courses/:id', async (req, res) => {
    try {
      const course = await storage.getWilmaCourse(req.params.id);
      if (!course) return res.status(404).json({ message: 'Course not found' });
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch course' });
    }
  });

  app.get('/api/wilma/courses/:id/students', async (req, res) => {
    try {
      const students = await storage.getWilmaCourseStudents(req.params.id);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch course students' });
    }
  });

  app.post('/api/wilma/courses', async (req, res) => {
    try {
      const course = await storage.createWilmaCourse(req.body);
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create course' });
    }
  });

  app.post('/api/wilma/courses/:id/enroll', async (req, res) => {
    try {
      const enrollment = await storage.enrollWilmaCourse(req.params.id, req.body.studentId);
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(500).json({ message: 'Failed to enroll student' });
    }
  });

  app.put('/api/wilma/courses/:id', async (req, res) => {
    try {
      const course = await storage.updateWilmaCourse(req.params.id, req.body);
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update course' });
    }
  });

  app.delete('/api/wilma/courses/:id', async (req, res) => {
    try {
      await storage.deleteWilmaCourse(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete course' });
    }
  });

  // ==================== TEACHERS ====================
  
  app.get('/api/wilma/teachers', async (req, res) => {
    try {
      const teachers = await storage.getWilmaTeachers();
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch teachers' });
    }
  });

  app.get('/api/wilma/teachers/:id', async (req, res) => {
    try {
      const teacher = await storage.getWilmaTeacher(req.params.id);
      if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch teacher' });
    }
  });

  app.post('/api/wilma/teachers', async (req, res) => {
    try {
      const teacher = await storage.createWilmaTeacher(req.body);
      res.status(201).json(teacher);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create teacher' });
    }
  });

  app.put('/api/wilma/teachers/:id', async (req, res) => {
    try {
      const teacher = await storage.updateWilmaTeacher(req.params.id, req.body);
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update teacher' });
    }
  });

  app.delete('/api/wilma/teachers/:id', async (req, res) => {
    try {
      await storage.deleteWilmaTeacher(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete teacher' });
    }
  });

  // ==================== ROOMS ====================
  
  app.get('/api/wilma/rooms', async (req, res) => {
    try {
      const rooms = await storage.getWilmaRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch rooms' });
    }
  });

  app.get('/api/wilma/rooms/:id', async (req, res) => {
    try {
      const room = await storage.getWilmaRoom(req.params.id);
      if (!room) return res.status(404).json({ message: 'Room not found' });
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch room' });
    }
  });

  app.post('/api/wilma/rooms', async (req, res) => {
    try {
      const room = await storage.createWilmaRoom(req.body);
      res.status(201).json(room);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create room' });
    }
  });

  app.put('/api/wilma/rooms/:id', async (req, res) => {
    try {
      const room = await storage.updateWilmaRoom(req.params.id, req.body);
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update room' });
    }
  });

  app.delete('/api/wilma/rooms/:id', async (req, res) => {
    try {
      await storage.deleteWilmaRoom(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete room' });
    }
  });

  // ==================== ANNOUNCEMENTS ====================
  
  app.get('/api/wilma/announcements', async (req, res) => {
    try {
      const announcements = await storage.getWilmaAnnouncements();
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });

  app.post('/api/wilma/announcements', async (req, res) => {
    try {
      const announcement = await storage.createWilmaAnnouncement(req.body);
      res.status(201).json(announcement);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create announcement' });
    }
  });

  app.put('/api/wilma/announcements/:id', async (req, res) => {
    try {
      const announcement = await storage.updateWilmaAnnouncement(req.params.id, req.body);
      res.json(announcement);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update announcement' });
    }
  });

  app.delete('/api/wilma/announcements/:id', async (req, res) => {
    try {
      await storage.deleteWilmaAnnouncement(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete announcement' });
    }
  });

  // ==================== CLASSES ====================
  
  app.get('/api/wilma/classes', async (req, res) => {
    try {
      const classes = await storage.getWilmaClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch classes' });
    }
  });

  app.get('/api/wilma/classes/:id', async (req, res) => {
    try {
      const classData = await storage.getWilmaClass(req.params.id);
      if (!classData) return res.status(404).json({ message: 'Class not found' });
      res.json(classData);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch class' });
    }
  });

  app.post('/api/wilma/classes', async (req, res) => {
    try {
      const classData = await storage.createWilmaClass(req.body);
      res.status(201).json(classData);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create class' });
    }
  });

  app.put('/api/wilma/classes/:id', async (req, res) => {
    try {
      const classData = await storage.updateWilmaClass(req.params.id, req.body);
      res.json(classData);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update class' });
    }
  });

  app.delete('/api/wilma/classes/:id', async (req, res) => {
    try {
      await storage.deleteWilmaClass(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete class' });
    }
  });

  // ==================== STUDY MATERIALS ====================
  
  app.get('/api/wilma/materials', async (req, res) => {
    try {
      const materials = await storage.getWilmaStudyMaterials();
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch study materials' });
    }
  });

  app.get('/api/wilma/materials/:id', async (req, res) => {
    try {
      const material = await storage.getWilmaStudyMaterial(req.params.id);
      if (!material) return res.status(404).json({ message: 'Material not found' });
      res.json(material);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch material' });
    }
  });

  app.post('/api/wilma/materials', async (req, res) => {
    try {
      const material = await storage.createWilmaStudyMaterial(req.body);
      res.status(201).json(material);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create material' });
    }
  });

  app.put('/api/wilma/materials/:id', async (req, res) => {
    try {
      const material = await storage.updateWilmaStudyMaterial(req.params.id, req.body);
      res.json(material);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update material' });
    }
  });

  app.delete('/api/wilma/materials/:id', async (req, res) => {
    try {
      await storage.deleteWilmaStudyMaterial(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete material' });
    }
  });

  // ==================== NOTIFICATIONS ====================
  
  app.get('/api/wilma/notifications/:userId', async (req, res) => {
    try {
      const notifications = await storage.getWilmaNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/wilma/notifications', async (req, res) => {
    try {
      const notification = await storage.createWilmaNotification(req.body);
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create notification' });
    }
  });

  app.put('/api/wilma/notifications/:id/read', async (req, res) => {
    try {
      const notification = await storage.markWilmaNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.delete('/api/wilma/notifications/:id', async (req, res) => {
    try {
      await storage.deleteWilmaNotification(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });

  // ==================== PARENT-STUDENT LINKS ====================
  
  app.get('/api/wilma/parent-students/:parentId', async (req, res) => {
    try {
      const links = await storage.getWilmaParentStudents(req.params.parentId);
      res.json(links);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch parent-student links' });
    }
  });

  app.post('/api/wilma/parent-students', async (req, res) => {
    try {
      const link = await storage.createWilmaParentStudent(req.body);
      res.status(201).json(link);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create parent-student link' });
    }
  });

  app.delete('/api/wilma/parent-students/:id', async (req, res) => {
    try {
      await storage.deleteWilmaParentStudent(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete parent-student link' });
    }
  });
}
