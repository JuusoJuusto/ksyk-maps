// Additional schema tables for enhanced features
import { pgTable, varchar, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";

// Enhanced Attendance Tracking with detailed marks
export const wilmaAttendanceMarks = pgTable("wilma_attendance_marks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  classId: varchar("class_id"), // Reference to class/course
  date: varchar("date").notNull(),
  timeSlot: varchar("time_slot").notNull(), // e.g., "08:00-09:30"
  subject: varchar("subject").notNull(),
  markType: varchar("mark_type").notNull(), // present, absent, late, forgot_books, forgot_homework, sleeping, phone_use, talking, bad_behavior
  severity: varchar("severity").default("normal"), // normal, warning, serious
  notes: text("notes"),
  teacherId: varchar("teacher_id").notNull(),
  teacherName: varchar("teacher_name").notNull(),
  notifiedParent: boolean("notified_parent").default(false),
  parentNotifiedAt: timestamp("parent_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// School Schedule Configuration (class times, breaks)
export const schoolScheduleConfig = pgTable("school_schedule_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., "Default Schedule", "Early Release Schedule"
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  periods: jsonb("periods").notNull(), // Array of {name, startTime, endTime, type: 'class'|'break'|'lunch'}
  // Example: [{name: "Period 1", startTime: "08:00", endTime: "09:30", type: "class"}, {name: "Break", startTime: "09:30", endTime: "09:45", type: "break"}]
  schoolYear: varchar("school_year"), // e.g., "2025-2026"
  effectiveFrom: varchar("effective_from"), // Date when this schedule starts
  effectiveTo: varchar("effective_to"), // Date when this schedule ends
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Courses/Classes Management
export const wilmaCourses = pgTable("wilma_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseCode: varchar("course_code").notNull().unique(), // e.g., "MATH101"
  courseName: varchar("course_name").notNull(),
  courseNameFi: varchar("course_name_fi"),
  courseNameEn: varchar("course_name_en"),
  description: text("description"),
  subject: varchar("subject").notNull(), // Mathematics, English, etc.
  level: varchar("level"), // Beginner, Intermediate, Advanced
  credits: integer("credits").default(1),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name"),
  room: varchar("room"),
  capacity: integer("capacity"),
  enrolledCount: integer("enrolled_count").default(0),
  schedule: jsonb("schedule"), // Array of {day, timeSlot, room}
  term: varchar("term"), // Fall 2026, Spring 2026
  schoolYear: varchar("school_year"), // 2025-2026
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course Enrollments
export const wilmaCourseEnrollments = pgTable("wilma_course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull(),
  studentId: varchar("student_id").notNull(),
  enrollmentDate: varchar("enrollment_date").notNull(),
  status: varchar("status").default("active"), // active, completed, dropped, withdrawn
  finalGrade: varchar("final_grade"),
  attendance: integer("attendance").default(100), // percentage
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Classes (like 9A, 8B) - different from courses
export const wilmaClasses = pgTable("wilma_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(), // 9A, 8B, etc.
  grade: integer("grade").notNull(), // 7, 8, 9
  section: varchar("section"), // A, B, C
  homeroomTeacher: varchar("homeroom_teacher"),
  homeroomTeacherId: varchar("homeroom_teacher_id"),
  homeroom: varchar("homeroom"), // Classroom number
  studentCount: integer("student_count").default(0),
  schoolYear: varchar("school_year"), // 2025-2026
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertWilmaAttendanceMarkSchema = createInsertSchema(wilmaAttendanceMarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchoolScheduleConfigSchema = createInsertSchema(schoolScheduleConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaCourseSchema = createInsertSchema(wilmaCourses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaCourseEnrollmentSchema = createInsertSchema(wilmaCourseEnrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaClassSchema = createInsertSchema(wilmaClasses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
