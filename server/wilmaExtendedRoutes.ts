import type { Express } from "express";
import { storage } from "./storage";

/**
 * Wilma Extended Routes - Full Implementation
 * 
 * This file contains all API routes for the extended Wilma features:
 * - Classes Management
 * - Courses Management
 * - Lesson Journal (Tuntipäiväkirja)
 * - Advanced Homework System
 * - Homework Submissions
 * - Extended Exams
 * - Exam Results
 * - Behavior Notes
 * - Notifications
 * - Calendar Events
 * - Analytics
 * - AI Interactions
 */

export function registerWilmaExtendedRoutes(app: Express) {
  
  // ============================================
  // WILMA CLASSES ROUTES
  // ============================================
  
  // Get all classes (optionally filter by year)
  app.get('/api/wilma/classes', async (req, res) => {
    try {
      const { year } = req.query;
      const classes = await storage.getWilmaClasses(year as string);
      res.json(classes);
    } catch (error) {
      console.error('Error fetching Wilma classes:', error);
      res.status(500).json({ message: 'Failed to fetch classes' });
    }
  });
  
  // Get single class
  app.get('/api/wilma/classes/:id', async (req, res) => {
    try {
      const classData = await storage.getWilmaClass(req.params.id);
      if (!classData) {
        return res.status(404).json({ message: 'Class not found' });
      }
      res.json(classData);
    } catch (error) {
      console.error('Error fetching Wilma class:', error);
      res.status(500).json({ message: 'Failed to fetch class' });
    }
  });
  
  // Create new class
  app.post('/api/wilma/classes', async (req, res) => {
    try {
      const classData = await storage.createWilmaClass(req.body);
      res.status(201).json(classData);
    } catch (error) {
      console.error('Error creating Wilma class:', error);
      res.status(500).json({ message: 'Failed to create class' });
    }
  });
  
  // Update class
  app.put('/api/wilma/classes/:id', async (req, res) => {
    try {
      const classData = await storage.updateWilmaClass(req.params.id, req.body);
      res.json(classData);
    } catch (error) {
      console.error('Error updating Wilma class:', error);
      res.status(500).json({ message: 'Failed to update class' });
    }
  });
  
  // Delete class
  app.delete('/api/wilma/classes/:id', async (req, res) => {
    try {
      await storage.deleteWilmaClass(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting Wilma class:', error);
      res.status(500).json({ message: 'Failed to delete class' });
    }
  });
  
  // ============================================
  // WILMA COURSES ROUTES
  // ============================================
  
  // Get all courses (optionally filter by teacher or class)
  app.get('/api/wilma/courses', async (req, res) => {
    try {
      const { teacherId, classId } = req.query;
      const courses = await storage.getWilmaCourses(teacherId as string, classId as string);
      res.json(courses);
    } catch (error) {
      console.error('Error fetching Wilma courses:', error);
      res.status(500).json({ message: 'Failed to fetch courses' });
    }
  });
  
  // Get single course
  app.get('/api/wilma/courses/:id', async (req, res) => {
    try {
      const course = await storage.getWilmaCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      res.json(course);
    } catch (error) {
      console.error('Error fetching Wilma course:', error);
      res.status(500).json({ message: 'Failed to fetch course' });
    }
  });
  
  // Create new course
  app.post('/api/wilma/courses', async (req, res) => {
    try {
      const course = await storage.createWilmaCourse(req.body);
      res.status(201).json(course);
    } catch (error) {
      console.error('Error creating Wilma course:', error);
      res.status(500).json({ message: 'Failed to create course' });
    }
  });
  
  // Update course
  app.put('/api/wilma/courses/:id', async (req, res) => {
    try {
      const course = await storage.updateWilmaCourse(req.params.id, req.body);
      res.json(course);
    } catch (error) {
      console.error('Error updating Wilma course:', error);
      res.status(500).json({ message: 'Failed to update course' });
    }
  });
  
  // Delete course
  app.delete('/api/wilma/courses/:id', async (req, res) => {
    try {
      await storage.deleteWilmaCourse(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting Wilma course:', error);
      res.status(500).json({ message: 'Failed to delete course' });
    }
  });
  
  // ============================================
  // WILMA LESSON JOURNAL ROUTES (Tuntipäiväkirja)
  // ============================================
  
  // Get lesson journals (filter by course, teacher, or date)
  app.get('/api/wilma/lesson-journal', async (req, res) => {
    try {
      const { courseId, teacherId, date } = req.query;
      const journals = await storage.getWilmaLessonJournals(
        courseId as string,
        teacherId as string,
        date as string
      );
      res.json(journals);
    } catch (error) {
      console.error('Error fetching lesson journals:', error);
      res.status(500).json({ message: 'Failed to fetch lesson journals' });
    }
  });
  
  // Get single lesson journal
  app.get('/api/wilma/lesson-journal/:id', async (req, res) => {
    try {
      const journal = await storage.getWilmaLessonJournal(req.params.id);
      if (!journal) {
        return res.status(404).json({ message: 'Lesson journal not found' });
      }
      res.json(journal);
    } catch (error) {
      console.error('Error fetching lesson journal:', error);
      res.status(500).json({ message: 'Failed to fetch lesson journal' });
    }
  });
  
  // Create lesson journal entry
  app.post('/api/wilma/lesson-journal', async (req, res) => {
    try {
      const journal = await storage.createWilmaLessonJournal(req.body);
      res.status(201).json(journal);
    } catch (error) {
      console.error('Error creating lesson journal:', error);
      res.status(500).json({ message: 'Failed to create lesson journal' });
    }
  });
  
  // Update lesson journal
  app.put('/api/wilma/lesson-journal/:id', async (req, res) => {
    try {
      const journal = await storage.updateWilmaLessonJournal(req.params.id, req.body);
      res.json(journal);
    } catch (error) {
      console.error('Error updating lesson journal:', error);
      res.status(500).json({ message: 'Failed to update lesson journal' });
    }
  });
  
  // Delete lesson journal
  app.delete('/api/wilma/lesson-journal/:id', async (req, res) => {
    try {
      await storage.deleteWilmaLessonJournal(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting lesson journal:', error);
      res.status(500).json({ message: 'Failed to delete lesson journal' });
    }
  });
  
  // ============================================
  // WILMA HOMEWORK EXTENDED ROUTES
  // ============================================
  
  // Get homework assignments
  app.get('/api/wilma/homework-extended', async (req, res) => {
    try {
      const { courseId, teacherId } = req.query;
      const homework = await storage.getWilmaHomeworkExtended(
        courseId as string,
        teacherId as string
      );
      res.json(homework);
    } catch (error) {
      console.error('Error fetching homework:', error);
      res.status(500).json({ message: 'Failed to fetch homework' });
    }
  });
  
  // Get single homework
  app.get('/api/wilma/homework-extended/:id', async (req, res) => {
    try {
      const homework = await storage.getWilmaHomeworkExtendedById(req.params.id);
      if (!homework) {
        return res.status(404).json({ message: 'Homework not found' });
      }
      res.json(homework);
    } catch (error) {
      console.error('Error fetching homework:', error);
      res.status(500).json({ message: 'Failed to fetch homework' });
    }
  });
  
  // Create homework
  app.post('/api/wilma/homework-extended', async (req, res) => {
    try {
      const homework = await storage.createWilmaHomeworkExtended(req.body);
      res.status(201).json(homework);
    } catch (error) {
      console.error('Error creating homework:', error);
      res.status(500).json({ message: 'Failed to create homework' });
    }
  });
  
  // Update homework
  app.put('/api/wilma/homework-extended/:id', async (req, res) => {
    try {
      const homework = await storage.updateWilmaHomeworkExtended(req.params.id, req.body);
      res.json(homework);
    } catch (error) {
      console.error('Error updating homework:', error);
      res.status(500).json({ message: 'Failed to update homework' });
    }
  });
  
  // Delete homework
  app.delete('/api/wilma/homework-extended/:id', async (req, res) => {
    try {
      await storage.deleteWilmaHomeworkExtended(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting homework:', error);
      res.status(500).json({ message: 'Failed to delete homework' });
    }
  });
  
  // ============================================
  // WILMA HOMEWORK SUBMISSIONS ROUTES
  // ============================================
  
  // Get homework submissions
  app.get('/api/wilma/homework-submissions', async (req, res) => {
    try {
      const { homeworkId, studentId } = req.query;
      const submissions = await storage.getWilmaHomeworkSubmissions(
        homeworkId as string,
        studentId as string
      );
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ message: 'Failed to fetch submissions' });
    }
  });
  
  // Get single submission
  app.get('/api/wilma/homework-submissions/:id', async (req, res) => {
    try {
      const submission = await storage.getWilmaHomeworkSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      res.json(submission);
    } catch (error) {
      console.error('Error fetching submission:', error);
      res.status(500).json({ message: 'Failed to fetch submission' });
    }
  });
  
  // Create submission
  app.post('/api/wilma/homework-submissions', async (req, res) => {
    try {
      const submission = await storage.createWilmaHomeworkSubmission(req.body);
      res.status(201).json(submission);
    } catch (error) {
      console.error('Error creating submission:', error);
      res.status(500).json({ message: 'Failed to create submission' });
    }
  });
  
  // Update submission (for grading)
  app.put('/api/wilma/homework-submissions/:id', async (req, res) => {
    try {
      const submission = await storage.updateWilmaHomeworkSubmission(req.params.id, req.body);
      res.json(submission);
    } catch (error) {
      console.error('Error updating submission:', error);
      res.status(500).json({ message: 'Failed to update submission' });
    }
  });
  
  // Delete submission
  app.delete('/api/wilma/homework-submissions/:id', async (req, res) => {
    try {
      await storage.deleteWilmaHomeworkSubmission(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting submission:', error);
      res.status(500).json({ message: 'Failed to delete submission' });
    }
  });
  
  // ============================================
  // WILMA EXAMS EXTENDED ROUTES
  // ============================================
  
  // Get exams
  app.get('/api/wilma/exams-extended', async (req, res) => {
    try {
      const { courseId, teacherId } = req.query;
      const exams = await storage.getWilmaExamsExtended(
        courseId as string,
        teacherId as string
      );
      res.json(exams);
    } catch (error) {
      console.error('Error fetching exams:', error);
      res.status(500).json({ message: 'Failed to fetch exams' });
    }
  });
  
  // Get single exam
  app.get('/api/wilma/exams-extended/:id', async (req, res) => {
    try {
      const exam = await storage.getWilmaExamExtended(req.params.id);
      if (!exam) {
        return res.status(404).json({ message: 'Exam not found' });
      }
      res.json(exam);
    } catch (error) {
      console.error('Error fetching exam:', error);
      res.status(500).json({ message: 'Failed to fetch exam' });
    }
  });
  
  // Create exam
  app.post('/api/wilma/exams-extended', async (req, res) => {
    try {
      const exam = await storage.createWilmaExamExtended(req.body);
      res.status(201).json(exam);
    } catch (error) {
      console.error('Error creating exam:', error);
      res.status(500).json({ message: 'Failed to create exam' });
    }
  });
  
  // Update exam
  app.put('/api/wilma/exams-extended/:id', async (req, res) => {
    try {
      const exam = await storage.updateWilmaExamExtended(req.params.id, req.body);
      res.json(exam);
    } catch (error) {
      console.error('Error updating exam:', error);
      res.status(500).json({ message: 'Failed to update exam' });
    }
  });
  
  // Delete exam
  app.delete('/api/wilma/exams-extended/:id', async (req, res) => {
    try {
      await storage.deleteWilmaExamExtended(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting exam:', error);
      res.status(500).json({ message: 'Failed to delete exam' });
    }
  });
  
  // ============================================
  // WILMA EXAM RESULTS ROUTES
  // ============================================
  
  // Get exam results
  app.get('/api/wilma/exam-results', async (req, res) => {
    try {
      const { examId, studentId } = req.query;
      const results = await storage.getWilmaExamResults(
        examId as string,
        studentId as string
      );
      res.json(results);
    } catch (error) {
      console.error('Error fetching exam results:', error);
      res.status(500).json({ message: 'Failed to fetch exam results' });
    }
  });
  
  // Get single exam result
  app.get('/api/wilma/exam-results/:id', async (req, res) => {
    try {
      const result = await storage.getWilmaExamResult(req.params.id);
      if (!result) {
        return res.status(404).json({ message: 'Exam result not found' });
      }
      res.json(result);
    } catch (error) {
      console.error('Error fetching exam result:', error);
      res.status(500).json({ message: 'Failed to fetch exam result' });
    }
  });
  
  // Create exam result
  app.post('/api/wilma/exam-results', async (req, res) => {
    try {
      const result = await storage.createWilmaExamResult(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating exam result:', error);
      res.status(500).json({ message: 'Failed to create exam result' });
    }
  });
  
  // Update exam result
  app.put('/api/wilma/exam-results/:id', async (req, res) => {
    try {
      const result = await storage.updateWilmaExamResult(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error updating exam result:', error);
      res.status(500).json({ message: 'Failed to update exam result' });
    }
  });
  
  // Delete exam result
  app.delete('/api/wilma/exam-results/:id', async (req, res) => {
    try {
      await storage.deleteWilmaExamResult(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting exam result:', error);
      res.status(500).json({ message: 'Failed to delete exam result' });
    }
  });
  
  // ============================================
  // WILMA BEHAVIOR NOTES ROUTES
  // ============================================
  
  // Get behavior notes
  app.get('/api/wilma/behavior-notes', async (req, res) => {
    try {
      const { studentId, teacherId } = req.query;
      const notes = await storage.getWilmaBehaviorNotes(
        studentId as string,
        teacherId as string
      );
      res.json(notes);
    } catch (error) {
      console.error('Error fetching behavior notes:', error);
      res.status(500).json({ message: 'Failed to fetch behavior notes' });
    }
  });
  
  // Get single behavior note
  app.get('/api/wilma/behavior-notes/:id', async (req, res) => {
    try {
      const note = await storage.getWilmaBehaviorNote(req.params.id);
      if (!note) {
        return res.status(404).json({ message: 'Behavior note not found' });
      }
      res.json(note);
    } catch (error) {
      console.error('Error fetching behavior note:', error);
      res.status(500).json({ message: 'Failed to fetch behavior note' });
    }
  });
  
  // Create behavior note
  app.post('/api/wilma/behavior-notes', async (req, res) => {
    try {
      const note = await storage.createWilmaBehaviorNote(req.body);
      res.status(201).json(note);
    } catch (error) {
      console.error('Error creating behavior note:', error);
      res.status(500).json({ message: 'Failed to create behavior note' });
    }
  });
  
  // Update behavior note
  app.put('/api/wilma/behavior-notes/:id', async (req, res) => {
    try {
      const note = await storage.updateWilmaBehaviorNote(req.params.id, req.body);
      res.json(note);
    } catch (error) {
      console.error('Error updating behavior note:', error);
      res.status(500).json({ message: 'Failed to update behavior note' });
    }
  });
  
  // Delete behavior note
  app.delete('/api/wilma/behavior-notes/:id', async (req, res) => {
    try {
      await storage.deleteWilmaBehaviorNote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting behavior note:', error);
      res.status(500).json({ message: 'Failed to delete behavior note' });
    }
  });
  
  // ============================================
  // WILMA NOTIFICATIONS ROUTES
  // ============================================
  
  // Get notifications for a user
  app.get('/api/wilma/notifications', async (req, res) => {
    try {
      const { userId, unreadOnly } = req.query;
      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }
      const notifications = await storage.getWilmaNotifications(
        userId as string,
        unreadOnly === 'true'
      );
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });
  
  // Get single notification
  app.get('/api/wilma/notifications/:id', async (req, res) => {
    try {
      const notification = await storage.getWilmaNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      res.json(notification);
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ message: 'Failed to fetch notification' });
    }
  });
  
  // Create notification
  app.post('/api/wilma/notifications', async (req, res) => {
    try {
      const notification = await storage.createWilmaNotification(req.body);
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: 'Failed to create notification' });
    }
  });
  
  // Mark notification as read
  app.patch('/api/wilma/notifications/:id/read', async (req, res) => {
    try {
      await storage.markWilmaNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });
  
  // Update notification
  app.put('/api/wilma/notifications/:id', async (req, res) => {
    try {
      const notification = await storage.updateWilmaNotification(req.params.id, req.body);
      res.json(notification);
    } catch (error) {
      console.error('Error updating notification:', error);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });
  
  // Delete notification
  app.delete('/api/wilma/notifications/:id', async (req, res) => {
    try {
      await storage.deleteWilmaNotification(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });
  
  // ============================================
  // WILMA CALENDAR EVENTS ROUTES
  // ============================================
  
  // Get calendar events
  app.get('/api/wilma/calendar-events', async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      const events = await storage.getWilmaCalendarEvents(
        userId as string,
        startDate as string,
        endDate as string
      );
      res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: 'Failed to fetch calendar events' });
    }
  });
  
  // Get single calendar event
  app.get('/api/wilma/calendar-events/:id', async (req, res) => {
    try {
      const event = await storage.getWilmaCalendarEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Calendar event not found' });
      }
      res.json(event);
    } catch (error) {
      console.error('Error fetching calendar event:', error);
      res.status(500).json({ message: 'Failed to fetch calendar event' });
    }
  });
  
  // Create calendar event
  app.post('/api/wilma/calendar-events', async (req, res) => {
    try {
      const event = await storage.createWilmaCalendarEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ message: 'Failed to create calendar event' });
    }
  });
  
  // Update calendar event
  app.put('/api/wilma/calendar-events/:id', async (req, res) => {
    try {
      const event = await storage.updateWilmaCalendarEvent(req.params.id, req.body);
      res.json(event);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({ message: 'Failed to update calendar event' });
    }
  });
  
  // Delete calendar event
  app.delete('/api/wilma/calendar-events/:id', async (req, res) => {
    try {
      await storage.deleteWilmaCalendarEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({ message: 'Failed to delete calendar event' });
    }
  });
  
  // ============================================
  // WILMA ANALYTICS ROUTES
  // ============================================
  
  // Track analytics event
  app.post('/api/wilma/analytics', async (req, res) => {
    try {
      await storage.createWilmaAnalytic(req.body);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Error creating analytics event:', error);
      res.status(500).json({ message: 'Failed to create analytics event' });
    }
  });
  
  // Get analytics data
  app.get('/api/wilma/analytics', async (req, res) => {
    try {
      const { userId, eventType, days } = req.query;
      const analytics = await storage.getWilmaAnalytics(
        userId as string,
        eventType as string,
        days ? parseInt(days as string) : undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });
  
  // Get analytics summary
  app.get('/api/wilma/analytics/summary', async (req, res) => {
    try {
      const { days } = req.query;
      const summary = await storage.getWilmaAnalyticsSummary(
        days ? parseInt(days as string) : undefined
      );
      res.json(summary);
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      res.status(500).json({ message: 'Failed to fetch analytics summary' });
    }
  });
  
  // ============================================
  // WILMA AI INTERACTIONS ROUTES
  // ============================================
  
  // Create AI interaction
  app.post('/api/wilma/ai-interactions', async (req, res) => {
    try {
      const interaction = await storage.createWilmaAiInteraction(req.body);
      res.status(201).json(interaction);
    } catch (error) {
      console.error('Error creating AI interaction:', error);
      res.status(500).json({ message: 'Failed to create AI interaction' });
    }
  });
  
  // Get AI interactions
  app.get('/api/wilma/ai-interactions', async (req, res) => {
    try {
      const { userId, featureType } = req.query;
      const interactions = await storage.getWilmaAiInteractions(
        userId as string,
        featureType as string
      );
      res.json(interactions);
    } catch (error) {
      console.error('Error fetching AI interactions:', error);
      res.status(500).json({ message: 'Failed to fetch AI interactions' });
    }
  });
  
  // Update AI interaction (for rating/feedback)
  app.put('/api/wilma/ai-interactions/:id', async (req, res) => {
    try {
      const interaction = await storage.updateWilmaAiInteraction(req.params.id, req.body);
      res.json(interaction);
    } catch (error) {
      console.error('Error updating AI interaction:', error);
      res.status(500).json({ message: 'Failed to update AI interaction' });
    }
  });
  
  // Get AI usage stats
  app.get('/api/wilma/ai-interactions/stats', async (req, res) => {
    try {
      const { days } = req.query;
      const stats = await storage.getWilmaAiUsageStats(
        days ? parseInt(days as string) : undefined
      );
      res.json(stats);
    } catch (error) {
      console.error('Error fetching AI usage stats:', error);
      res.status(500).json({ message: 'Failed to fetch AI usage stats' });
    }
  });
  
  console.log('✅ Wilma Extended Routes registered successfully');
}
