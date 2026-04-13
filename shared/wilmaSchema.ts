import { sql } from 'drizzle-orm';
import { pgTable, timestamp, varchar, text, integer, boolean, jsonb, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Wilma Schedule Entries
export const wilmaSchedule = pgTable("wilma_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id"),
  classId: varchar("class_id"),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Monday, 5=Friday
  timeSlot: varchar("time_slot").notNull(),
  startTime: varchar("start_time").notNull(),
  endTime: varchar("end_time").notNull(),
  subject: varchar("subject").notNull(),
  subjectCode: varchar("subject_code"),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name"),
  room: varchar("room"),
  roomId: varchar("room_id"),
  buildingId: varchar("building_id"),
  description: text("description"),
  courseId: varchar("course_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Grades
export const wilmaGrades = pgTable("wilma_grades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  courseId: varchar("course_id"),
  subject: varchar("subject").notNull(),
  grade: varchar("grade").notNull(),
  gradeNumeric: numeric("grade_numeric"),
  gradeScale: varchar("grade_scale").default("4-10"),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name"),
  term: varchar("term"),
  academicYear: varchar("academic_year"),
  gradeType: varchar("grade_type").default("final"),
  weight: numeric("weight").default("1.0"),
  feedback: text("feedback"),
  strengths: text("strengths"),
  improvements: text("improvements"),
  gradedAt: timestamp("graded_at"),
  publishedAt: timestamp("published_at"),
  isPublished: boolean("is_published").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Assignments
export const wilmaAssignments = pgTable("wilma_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentNumber: varchar("assignment_number").unique(),
  studentId: varchar("student_id"),
  classId: varchar("class_id"),
  courseId: varchar("course_id"),
  title: varchar("title").notNull(),
  description: text("description"),
  subject: varchar("subject").notNull(),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name"),
  assignmentType: varchar("assignment_type").default("homework"),
  dueDate: timestamp("due_date").notNull(),
  assignedDate: timestamp("assigned_date").defaultNow(),
  status: varchar("status").default("pending"),
  submittedAt: timestamp("submitted_at"),
  submissionText: text("submission_text"),
  submissionFiles: jsonb("submission_files"),
  grade: varchar("grade"),
  gradeNumeric: numeric("grade_numeric"),
  feedback: text("feedback"),
  maxPoints: integer("max_points"),
  earnedPoints: integer("earned_points"),
  lateSubmission: boolean("late_submission").default(false),
  allowLateSubmission: boolean("allow_late_submission").default(true),
  requiresFile: boolean("requires_file").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Messages
export const wilmaMessages = pgTable("wilma_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  senderName: varchar("sender_name").notNull(),
  senderRole: varchar("sender_role"),
  recipientId: varchar("recipient_id").notNull(),
  recipientName: varchar("recipient_name").notNull(),
  recipientRole: varchar("recipient_role"),
  subject: varchar("subject").notNull(),
  body: text("body").notNull(),
  messageType: varchar("message_type").default("personal"),
  priority: varchar("priority").default("normal"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  parentMessageId: varchar("parent_message_id"),
  threadId: varchar("thread_id"),
  attachments: jsonb("attachments"),
  isArchived: boolean("is_archived").default(false),
  isStarred: boolean("is_starred").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Attendance
export const wilmaAttendance = pgTable("wilma_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  date: timestamp("date").notNull(),
  status: varchar("status").notNull(),
  hours: numeric("hours").default("0"),
  lessonNumber: integer("lesson_number"),
  subject: varchar("subject"),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name"),
  reason: text("reason"),
  notes: text("notes"),
  markedBy: varchar("marked_by"),
  markedAt: timestamp("marked_at").defaultNow(),
  isExcused: boolean("is_excused").default(false),
  parentNotified: boolean("parent_notified").default(false),
  parentNotifiedAt: timestamp("parent_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Exams
export const wilmaExams = pgTable("wilma_exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examCode: varchar("exam_code").unique(),
  studentId: varchar("student_id"),
  classId: varchar("class_id"),
  courseId: varchar("course_id"),
  subject: varchar("subject").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  examDate: timestamp("exam_date").notNull(),
  startTime: varchar("start_time").notNull(),
  endTime: varchar("end_time").notNull(),
  duration: integer("duration"),
  room: varchar("room"),
  roomId: varchar("room_id"),
  buildingId: varchar("building_id"),
  topics: text("topics").array(),
  instructions: text("instructions"),
  materials: text("materials"),
  allowedMaterials: text("allowed_materials").array(),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name"),
  examType: varchar("exam_type").default("written"),
  maxPoints: integer("max_points"),
  passingGrade: numeric("passing_grade"),
  status: varchar("status").default("scheduled"),
  result: varchar("result"),
  score: numeric("score"),
  feedback: text("feedback"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Courses
export const wilmaCourses = pgTable("wilma_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseCode: varchar("course_code").notNull().unique(),
  courseName: varchar("course_name").notNull(),
  courseNameEn: varchar("course_name_en"),
  courseNameFi: varchar("course_name_fi"),
  subject: varchar("subject").notNull(),
  description: text("description"),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name"),
  assistantTeachers: jsonb("assistant_teachers"),
  term: varchar("term"),
  academicYear: varchar("academic_year"),
  credits: numeric("credits"),
  level: varchar("level"),
  prerequisites: text("prerequisites").array(),
  schedule: jsonb("schedule"),
  room: varchar("room"),
  roomId: varchar("room_id"),
  maxStudents: integer("max_students"),
  enrolledStudents: integer("enrolled_students").default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  syllabus: text("syllabus"),
  learningObjectives: text("learning_objectives").array(),
  assessmentMethods: text("assessment_methods").array(),
  materials: jsonb("materials"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Course Enrollments
export const wilmaCourseEnrollments = pgTable("wilma_course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  courseId: varchar("course_id").notNull(),
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  status: varchar("status").default("active"),
  finalGrade: varchar("final_grade"),
  completionDate: timestamp("completion_date"),
  credits: numeric("credits"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Teachers
export const wilmaTeachers = pgTable("wilma_teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique(),
  teacherCode: varchar("teacher_code").unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  subjects: text("subjects").array(),
  specializations: text("specializations").array(),
  officeRoom: varchar("office_room"),
  officeRoomId: varchar("office_room_id"),
  buildingId: varchar("building_id"),
  officeHours: jsonb("office_hours"),
  bio: text("bio"),
  qualifications: text("qualifications").array(),
  yearsOfExperience: integer("years_of_experience"),
  profileImageUrl: varchar("profile_image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Rooms (School Rooms)
export const wilmaRooms = pgTable("wilma_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomNumber: varchar("room_number").notNull().unique(),
  roomName: varchar("room_name"),
  buildingId: varchar("building_id"),
  buildingName: varchar("building_name"),
  floor: integer("floor"),
  roomType: varchar("room_type"),
  capacity: integer("capacity"),
  equipment: text("equipment").array(),
  features: text("features").array(),
  isAccessible: boolean("is_accessible").default(true),
  isBookable: boolean("is_bookable").default(true),
  description: text("description"),
  mapPositionX: integer("map_position_x"),
  mapPositionY: integer("map_position_y"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Announcements
export const wilmaAnnouncements = pgTable("wilma_announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id"),
  authorName: varchar("author_name"),
  targetAudience: varchar("target_audience").default("all"),
  targetClasses: text("target_classes").array(),
  targetStudents: text("target_students").array(),
  priority: varchar("priority").default("normal"),
  category: varchar("category"),
  expiresAt: timestamp("expires_at"),
  publishedAt: timestamp("published_at").defaultNow(),
  isPublished: boolean("is_published").default(true),
  isPinned: boolean("is_pinned").default(false),
  attachments: jsonb("attachments"),
  viewCount: integer("view_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Classes
export const wilmaClasses = pgTable("wilma_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  className: varchar("class_name").notNull().unique(),
  classCode: varchar("class_code").unique(),
  grade: integer("grade"),
  section: varchar("section"),
  academicYear: varchar("academic_year"),
  homeRoomTeacherId: varchar("home_room_teacher_id"),
  homeRoomTeacherName: varchar("home_room_teacher_name"),
  homeRoom: varchar("home_room"),
  homeRoomId: varchar("home_room_id"),
  studentCount: integer("student_count").default(0),
  schedule: jsonb("schedule"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Study Materials
export const wilmaStudyMaterials = pgTable("wilma_study_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  subject: varchar("subject").notNull(),
  courseId: varchar("course_id"),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name"),
  fileType: varchar("file_type"),
  fileSize: varchar("file_size"),
  fileUrl: varchar("file_url"),
  thumbnailUrl: varchar("thumbnail_url"),
  category: varchar("category"),
  tags: text("tags").array(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  downloadCount: integer("download_count").default(0),
  isPublic: boolean("is_public").default(true),
  targetClasses: text("target_classes").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Parent-Student Links
export const wilmaParentStudents = pgTable("wilma_parent_students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").notNull(),
  studentId: varchar("student_id").notNull(),
  relationship: varchar("relationship"),
  isPrimary: boolean("is_primary").default(false),
  canViewGrades: boolean("can_view_grades").default(true),
  canViewAttendance: boolean("can_view_attendance").default(true),
  canViewMessages: boolean("can_view_messages").default(true),
  canSendMessages: boolean("can_send_messages").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Notifications
export const wilmaNotifications = pgTable("wilma_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(),
  category: varchar("category"),
  relatedId: varchar("related_id"),
  relatedType: varchar("related_type"),
  priority: varchar("priority").default("normal"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  actionUrl: varchar("action_url"),
  actionLabel: varchar("action_label"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertWilmaScheduleSchema = createInsertSchema(wilmaSchedule).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaGradeSchema = createInsertSchema(wilmaGrades).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaAssignmentSchema = createInsertSchema(wilmaAssignments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaMessageSchema = createInsertSchema(wilmaMessages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaAttendanceSchema = createInsertSchema(wilmaAttendance).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaExamSchema = createInsertSchema(wilmaExams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaCourseSchema = createInsertSchema(wilmaCourses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaCourseEnrollmentSchema = createInsertSchema(wilmaCourseEnrollments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaTeacherSchema = createInsertSchema(wilmaTeachers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaRoomSchema = createInsertSchema(wilmaRooms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaAnnouncementSchema = createInsertSchema(wilmaAnnouncements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaClassSchema = createInsertSchema(wilmaClasses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaStudyMaterialSchema = createInsertSchema(wilmaStudyMaterials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaParentStudentSchema = createInsertSchema(wilmaParentStudents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWilmaNotificationSchema = createInsertSchema(wilmaNotifications).omit({ id: true, createdAt: true });

// Types
export type WilmaSchedule = typeof wilmaSchedule.$inferSelect;
export type WilmaGrade = typeof wilmaGrades.$inferSelect;
export type WilmaAssignment = typeof wilmaAssignments.$inferSelect;
export type WilmaMessage = typeof wilmaMessages.$inferSelect;
export type WilmaAttendance = typeof wilmaAttendance.$inferSelect;
export type WilmaExam = typeof wilmaExams.$inferSelect;
export type WilmaCourse = typeof wilmaCourses.$inferSelect;
export type WilmaCourseEnrollment = typeof wilmaCourseEnrollments.$inferSelect;
export type WilmaTeacher = typeof wilmaTeachers.$inferSelect;
export type WilmaRoom = typeof wilmaRooms.$inferSelect;
export type WilmaAnnouncement = typeof wilmaAnnouncements.$inferSelect;
export type WilmaClass = typeof wilmaClasses.$inferSelect;
export type WilmaStudyMaterial = typeof wilmaStudyMaterials.$inferSelect;
export type WilmaParentStudent = typeof wilmaParentStudents.$inferSelect;
export type WilmaNotification = typeof wilmaNotifications.$inferSelect;
