// ============================================
// STEM Genius - Type Definitions
// ============================================

import { UserRole, SubscriptionTier, Subject, TaskType, DifficultyLevel } from '@/lib/prisma-types';

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  subscriptionEndsAt?: Date;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  gradeLevel?: number;
  school?: string;
  country: string;
  language: string;
  timezone: string;
  learningStyle?: string;
  studyGoals?: string[];
  weakTopics?: string[];
  strongTopics?: string[];
  difficultyLevel: number;
  learningSpeed: number;
  confidenceLevel: number;
  predictedGrade?: number;
  burnoutRisk: number;
  darkMode: boolean;
  notifications: boolean;
  soundEffects: boolean;
}

export interface UserXP {
  id: string;
  userId: string;
  totalXP: number;
  level: number;
  mathXP: number;
  physicsXP: number;
  chemistryXP: number;
  astronomyXP: number;
  xpMultiplier: number;
}

export interface UserStreak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  freezesAvailable: number;
  freezesUsed: number;
}

// ============================================
// TASK TYPES
// ============================================

export interface Task {
  id: string;
  subject: Subject;
  topic: string;
  subtopic?: string;
  difficulty: number;
  type: TaskType;
  level: DifficultyLevel;
  question: any;
  answer: any;
  solution: any;
  hints?: any;
  estimatedTime: number;
  xpReward: number;
  tags: string[];
  generatedBy?: string;
  prompt?: string;
  rating?: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTask {
  id: string;
  userId: string;
  taskId: string;
  answerSubmitted: any;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  attempts: number;
  confidence?: number;
  difficulty?: number;
  xpEarned: number;
  completedAt: Date;
  createdAt: Date;
  task?: Task;
}

// ============================================
// AI TUTOR TYPES
// ============================================

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  subject?: Subject;
  topic?: string;
  messageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  images?: string[];
  equations?: any;
  model?: string;
  tokens?: number;
  createdAt: Date;
}

// ============================================
// GAMIFICATION TYPES
// ============================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  criteria: any;
  xpReward: number;
  createdAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  achievement?: Achievement;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface AnalyticsEvent {
  eventType: string;
  eventData?: Record<string, any>;
  userId?: string;
  timestamp: Date;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  tasksCompleted: number;
  xpEarned: number;
  subject?: Subject;
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

// ============================================
// CLASSROOM TYPES
// ============================================

export interface Classroom {
  id: string;
  name: string;
  description?: string;
  code: string;
  schoolName: string;
  gradeLevel?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassroomMember {
  id: string;
  classroomId: string;
  userId: string;
  role: 'TEACHER' | 'STUDENT';
  joinedAt: Date;
}

export interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  description?: string;
  subject: Subject;
  topics: string[];
  difficulty: number;
  taskIds: string[];
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// FORM TYPES
// ============================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  gradeLevel?: number;
}

export interface OnboardingData {
  gradeLevel: number;
  school?: string;
  subjects: Subject[];
  learningStyle?: string;
  studyGoals: string[];
}

// ============================================
// UI STATE TYPES
// ============================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
