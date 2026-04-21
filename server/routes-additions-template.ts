// API Routes Template for New Features
// Add these routes to server/routes.ts

import { db } from './db';
import { 
  schoolScheduleConfig, 
  wilmaAttendanceMarks, 
  wilmaCourses, 
  wilmaCourseEnrollments,
  wilmaClasses 
} from '../shared/schema-additions';
import { eq, and, desc } from 'drizzle-orm';

// ============================================
// SCHEDULE CONFIGURATION ROUTES
// ============================================

// GET /api/schedule-config - List all schedule configurations
app.get('/api/schedule-config', async (req, res) => {
  try {
    const configs = await db.select().from(schoolScheduleConfig).orderBy(desc(schoolScheduleConfig.createdAt));
    res.json(configs);
  } catch (error) {
    console.error('Error fetching schedule configs:', error);
    res.status(500).json({ error: 'Failed to fetch schedule configurations' });
  }
});

// POST /api/schedule-config - Create new schedule configuration
app.post('/api/schedule-config', async (req, res) => {
  try {
    const { name, isActive, isDefault, periods, schoolYear, effectiveFrom, effectiveTo, notes } = req.body;
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await db.update(schoolScheduleConfig)
        .set({ isDefault: false })
        .where(eq(schoolScheduleConfig.isDefault, true));
    }
    
    const [newConfig] = await db.insert(schoolScheduleConfig).values({
      name,
      isActive,
      isDefault,
      periods,
      schoolYear,
      effectiveFrom,
      effectiveTo,
      notes,
    }).returning();
    
    res.json(newConfig);
  } catch (error) {
    console.error('Error creating schedule config:', error);
    res.status(500).json({ error: 'Failed to create schedule configuration' });
  }
});

// PUT /api/schedule-config/:id - Update schedule configuration
app.put('/api/schedule-config/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, isDefault, periods, schoolYear, effectiveFrom, effectiveTo, notes } = req.body;
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await db.update(schoolScheduleConfig)
        .set({ isDefault: false })
        .where(eq(schoolScheduleConfig.isDefault, true));
    }
    
    const [updated] = await db.update(schoolScheduleConfig)
      .set({
        name,
        isActive,
        isDefault,
        periods,
        schoolYear,
        effectiveFrom,
        effectiveTo,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(schoolScheduleConfig.id, id))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating schedule config:', error);
    res.status(500).json({ error: 'Failed to update schedule configuration' });
  }
});

// DELETE /api/schedule-config/:id - Delete schedule configuration
app.delete('/api/schedule-config/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(schoolScheduleConfig).where(eq(schoolScheduleConfig.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule config:', error);
    res.status(500).json({ error: 'Failed to delete schedule configuration' });
  }
});

// ============================================
// ATTENDANCE MARKS ROUTES
// ============================================

// GET /api/attendance-marks - List attendance marks with filters
app.get('/api/attendance-marks', async (req, res) => {
  try {
    const { studentId, date, markType } = req.query;
    
    let query = db.select().from(wilmaAttendanceMarks);
    
    const conditions = [];
    if (studentId) conditions.push(eq(wilmaAttendanceMarks.studentId, studentId as string));
    if (date) conditions.push(eq(wilmaAttendanceMarks.date, date as string));
    if (markType) conditions.push(eq(wilmaAttendanceMarks.markType, markType as string));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const marks = await query.orderBy(desc(wilmaAttendanceMarks.createdAt));
    res.json(marks);
  } catch (error) {
    console.error('Error fetching attendance marks:', error);
    res.status(500).json({ error: 'Failed to fetch attendance marks' });
  }
});

// POST /api/attendance-marks - Create new attendance mark
app.post('/api/attendance-marks', async (req, res) => {
  try {
    const { 
      studentId, 
      classId, 
      date, 
      timeSlot, 
      subject, 
      markType, 
      severity, 
      notes, 
      teacherId, 
      teacherName 
    } = req.body;
    
    const [newMark] = await db.insert(wilmaAttendanceMarks).values({
      studentId,
      classId,
      date,
      timeSlot,
      subject,
      markType,
      severity: severity || 'normal',
      notes,
      teacherId,
      teacherName,
      notifiedParent: false,
    }).returning();
    
    // TODO: Send notification to parent if severity is 'warning' or 'serious'
    
    res.json(newMark);
  } catch (error) {
    console.error('Error creating attendance mark:', error);
    res.status(500).json({ error: 'Failed to create attendance mark' });
  }
});

// DELETE /api/attendance-marks/:id - Delete attendance mark
app.delete('/api/attendance-marks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(wilmaAttendanceMarks).where(eq(wilmaAttendanceMarks.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendance mark:', error);
    res.status(500).json({ error: 'Failed to delete attendance mark' });
  }
});

// ============================================
// COURSES ROUTES
// ============================================

// GET /api/wilma/courses - List all courses
app.get('/api/wilma/courses', async (req, res) => {
  try {
    const { term, schoolYear, subject } = req.query;
    
    let query = db.select().from(wilmaCourses).where(eq(wilmaCourses.isActive, true));
    
    const conditions = [eq(wilmaCourses.isActive, true)];
    if (term) conditions.push(eq(wilmaCourses.term, term as string));
    if (schoolYear) conditions.push(eq(wilmaCourses.schoolYear, schoolYear as string));
    if (subject) conditions.push(eq(wilmaCourses.subject, subject as string));
    
    const courses = await db.select().from(wilmaCourses)
      .where(and(...conditions))
      .orderBy(wilmaCourses.courseName);
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /api/wilma/courses - Create new course
app.post('/api/wilma/courses', async (req, res) => {
  try {
    const courseData = req.body;
    const [newCourse] = await db.insert(wilmaCourses).values(courseData).returning();
    res.json(newCourse);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /api/wilma/courses/:id - Update course
app.put('/api/wilma/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const courseData = req.body;
    const [updated] = await db.update(wilmaCourses)
      .set({ ...courseData, updatedAt: new Date() })
      .where(eq(wilmaCourses.id, id))
      .returning();
    res.json(updated);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /api/wilma/courses/:id - Delete course
app.delete('/api/wilma/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(wilmaCourses)
      .set({ isActive: false })
      .where(eq(wilmaCourses.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// ============================================
// CLASSES ROUTES
// ============================================

// GET /api/wilma/classes - List all classes
app.get('/api/wilma/classes', async (req, res) => {
  try {
    const { schoolYear, grade } = req.query;
    
    const conditions = [eq(wilmaClasses.isActive, true)];
    if (schoolYear) conditions.push(eq(wilmaClasses.schoolYear, schoolYear as string));
    if (grade) conditions.push(eq(wilmaClasses.grade, parseInt(grade as string)));
    
    const classes = await db.select().from(wilmaClasses)
      .where(and(...conditions))
      .orderBy(wilmaClasses.grade, wilmaClasses.section);
    
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// POST /api/wilma/classes - Create new class
app.post('/api/wilma/classes', async (req, res) => {
  try {
    const classData = req.body;
    const [newClass] = await db.insert(wilmaClasses).values(classData).returning();
    res.json(newClass);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// PUT /api/wilma/classes/:id - Update class
app.put('/api/wilma/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const classData = req.body;
    const [updated] = await db.update(wilmaClasses)
      .set({ ...classData, updatedAt: new Date() })
      .where(eq(wilmaClasses.id, id))
      .returning();
    res.json(updated);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// DELETE /api/wilma/classes/:id - Delete class
app.delete('/api/wilma/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(wilmaClasses)
      .set({ isActive: false })
      .where(eq(wilmaClasses.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// ============================================
// COURSE ENROLLMENTS ROUTES
// ============================================

// GET /api/wilma/enrollments - List enrollments
app.get('/api/wilma/enrollments', async (req, res) => {
  try {
    const { studentId, courseId } = req.query;
    
    const conditions = [];
    if (studentId) conditions.push(eq(wilmaCourseEnrollments.studentId, studentId as string));
    if (courseId) conditions.push(eq(wilmaCourseEnrollments.courseId, courseId as string));
    
    let query = db.select().from(wilmaCourseEnrollments);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const enrollments = await query.orderBy(desc(wilmaCourseEnrollments.createdAt));
    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// POST /api/wilma/enrollments - Create enrollment
app.post('/api/wilma/enrollments', async (req, res) => {
  try {
    const enrollmentData = req.body;
    const [newEnrollment] = await db.insert(wilmaCourseEnrollments).values(enrollmentData).returning();
    
    // Update course enrolled count
    await db.execute(sql`
      UPDATE wilma_courses 
      SET enrolled_count = enrolled_count + 1 
      WHERE id = ${enrollmentData.courseId}
    `);
    
    res.json(newEnrollment);
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get active schedule configuration
async function getActiveSchedule() {
  const [activeSchedule] = await db.select()
    .from(schoolScheduleConfig)
    .where(and(
      eq(schoolScheduleConfig.isActive, true),
      eq(schoolScheduleConfig.isDefault, true)
    ))
    .limit(1);
  
  return activeSchedule;
}

// Get student attendance statistics
async function getStudentAttendanceStats(studentId: string, startDate: string, endDate: string) {
  const marks = await db.select()
    .from(wilmaAttendanceMarks)
    .where(and(
      eq(wilmaAttendanceMarks.studentId, studentId),
      // Add date range filter here
    ));
  
  const total = marks.length;
  const present = marks.filter(m => m.markType === 'present').length;
  const absent = marks.filter(m => m.markType === 'absent').length;
  const late = marks.filter(m => m.markType === 'late').length;
  const behavioral = marks.filter(m => 
    ['sleeping', 'phone_use', 'talking', 'bad_behavior'].includes(m.markType)
  ).length;
  
  return {
    total,
    present,
    absent,
    late,
    behavioral,
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
  };
}

export { getActiveSchedule, getStudentAttendanceStats };
