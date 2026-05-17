// ============================================
// STEM Genius - Validation Schemas
// Zod schemas for type-safe validation
// ============================================

import { z } from 'zod';

// ============================================
// AUTH VALIDATORS
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================
// ONBOARDING VALIDATORS
// ============================================

export const onboardingGoalsSchema = z.object({
  subjects: z.array(z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY'])).min(1, 'Select at least one subject'),
  gradeLevel: z.number().min(7).max(12),
  targetGrade: z.number().min(4).max(10),
  studyGoals: z.array(z.string()).min(1, 'Select at least one goal'),
  motivation: z.string().min(10, 'Please tell us more about your motivation'),
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']),
});

export const onboardingAssessmentSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.any(),
    timeSpent: z.number(),
    confidence: z.number().min(0).max(1),
  })),
});

export const onboardingPersonalizationSchema = z.object({
  studyTimePreference: z.enum(['morning', 'afternoon', 'evening', 'night']),
  dailyGoalMinutes: z.number().min(10).max(240),
  notificationsEnabled: z.boolean(),
  soundEffectsEnabled: z.boolean(),
  darkMode: z.boolean(),
});

// ============================================
// TASK VALIDATORS
// ============================================

export const taskSubmissionSchema = z.object({
  taskId: z.string().uuid(),
  answer: z.any(),
  timeSpent: z.number().min(0),
  hintsUsed: z.number().min(0),
  confidence: z.number().min(0).max(1).optional(),
});

export const taskGenerationSchema = z.object({
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']),
  topic: z.string().min(1),
  difficulty: z.number().min(1).max(10),
  type: z.enum(['MULTIPLE_CHOICE', 'OPEN_ENDED', 'GRAPHING', 'DERIVATION', 'CALCULATION']),
  count: z.number().min(1).max(20).default(1),
});

// ============================================
// AI TUTOR VALIDATORS
// ============================================

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(5000),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']).optional(),
  topic: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const conversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']).optional(),
  topic: z.string().optional(),
});

// ============================================
// PROFILE VALIDATORS
// ============================================

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional(),
  gradeLevel: z.number().min(7).max(12).optional(),
  school: z.string().max(200).optional(),
  language: z.enum(['fi', 'en', 'sv']).optional(),
  timezone: z.string().optional(),
  darkMode: z.boolean().optional(),
  notifications: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
});

// ============================================
// GAMIFICATION VALIDATORS
// ============================================

export const xpEventSchema = z.object({
  amount: z.number().min(0),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']).optional(),
  reason: z.string(),
});

export const achievementUnlockSchema = z.object({
  achievementId: z.string().uuid(),
});

// ============================================
// STUDY PLAN VALIDATORS
// ============================================

export const studyPlanSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']),
  topics: z.array(z.string()).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// ============================================
// CLASSROOM VALIDATORS (B2B)
// ============================================

export const classroomSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  schoolName: z.string().min(1).max(200),
  gradeLevel: z.number().min(7).max(12).optional(),
});

export const assignmentSchema = z.object({
  classroomId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']),
  topics: z.array(z.string()).min(1),
  difficulty: z.number().min(1).max(10),
  taskIds: z.array(z.string().uuid()),
  dueDate: z.string().datetime(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export type OnboardingGoalsInput = z.infer<typeof onboardingGoalsSchema>;
export type OnboardingAssessmentInput = z.infer<typeof onboardingAssessmentSchema>;
export type OnboardingPersonalizationInput = z.infer<typeof onboardingPersonalizationSchema>;

export type TaskSubmissionInput = z.infer<typeof taskSubmissionSchema>;
export type TaskGenerationInput = z.infer<typeof taskGenerationSchema>;

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ConversationInput = z.infer<typeof conversationSchema>;

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export type XPEventInput = z.infer<typeof xpEventSchema>;
export type AchievementUnlockInput = z.infer<typeof achievementUnlockSchema>;

export type StudyPlanInput = z.infer<typeof studyPlanSchema>;

export type ClassroomInput = z.infer<typeof classroomSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
