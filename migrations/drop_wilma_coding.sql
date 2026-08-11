-- Drop Wilma and Coding platform tables from Supabase
-- Run this once in the Supabase SQL editor to remove unused tables.
-- Order matters: child tables (FK references) must be dropped before parents.

-- Coding platform
DROP TABLE IF EXISTS coding_leaderboard CASCADE;
DROP TABLE IF EXISTS coding_user_stats CASCADE;
DROP TABLE IF EXISTS coding_classroom_assignments CASCADE;
DROP TABLE IF EXISTS coding_classrooms CASCADE;
DROP TABLE IF EXISTS coding_submissions CASCADE;
DROP TABLE IF EXISTS coding_user_progress CASCADE;
DROP TABLE IF EXISTS coding_exercises CASCADE;
DROP TABLE IF EXISTS coding_lessons CASCADE;
DROP TABLE IF EXISTS coding_modules CASCADE;
DROP TABLE IF EXISTS coding_courses CASCADE;

-- Wilma extended (drop in dependency order)
DROP TABLE IF EXISTS wilma_ai_interactions CASCADE;
DROP TABLE IF EXISTS wilma_analytics CASCADE;
DROP TABLE IF EXISTS wilma_calendar_events CASCADE;
DROP TABLE IF EXISTS wilma_notifications CASCADE;
DROP TABLE IF EXISTS wilma_behavior_notes CASCADE;
DROP TABLE IF EXISTS wilma_exam_results CASCADE;
DROP TABLE IF EXISTS wilma_exams_extended CASCADE;
DROP TABLE IF EXISTS wilma_homework_submissions CASCADE;
DROP TABLE IF EXISTS wilma_homework_extended CASCADE;
DROP TABLE IF EXISTS wilma_detention_log CASCADE;
DROP TABLE IF EXISTS wilma_detentions CASCADE;
DROP TABLE IF EXISTS wilma_detention_settings CASCADE;
DROP TABLE IF EXISTS wilma_lesson_journal CASCADE;
DROP TABLE IF EXISTS wilma_user_desktop_config CASCADE;
DROP TABLE IF EXISTS wilma_desktop_apps CASCADE;
DROP TABLE IF EXISTS wilma_desktop_settings CASCADE;
DROP TABLE IF EXISTS wilma_course_enrollments CASCADE;
DROP TABLE IF EXISTS wilma_courses CASCADE;
DROP TABLE IF EXISTS wilma_classes CASCADE;
DROP TABLE IF EXISTS wilma_attendance_marks CASCADE;

-- Wilma core
DROP TABLE IF EXISTS wilma_exams CASCADE;
DROP TABLE IF EXISTS wilma_attendance CASCADE;
DROP TABLE IF EXISTS wilma_messages CASCADE;
DROP TABLE IF EXISTS wilma_assignments CASCADE;
DROP TABLE IF EXISTS wilma_grades CASCADE;
DROP TABLE IF EXISTS wilma_schedules CASCADE;
DROP TABLE IF EXISTS wilma_users CASCADE;
