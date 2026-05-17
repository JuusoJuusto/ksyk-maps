// ============================================
// STEM Genius - Application Constants
// ============================================

import { Subject, SubscriptionTier } from '@/lib/prisma-types';

// ============================================
// APP CONFIGURATION
// ============================================

export const APP_CONFIG = {
  name: 'STEM Genius',
  description: 'AI-Powered STEM Learning Platform',
  version: '1.0.0',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  supportEmail: 'support@stemgenius.com',
} as const;

// ============================================
// FEATURE FLAGS
// ============================================

export const FEATURES = {
  aiTutor: true,
  taskGeneration: true,
  gamification: true,
  classrooms: true,
  analytics: true,
  payments: true,
  socialFeatures: false, // Coming soon
  mobileApp: false, // Coming soon
} as const;

// ============================================
// XP & LEVELING
// ============================================

export const XP_CONFIG = {
  baseXP: 10,
  levelMultiplier: 1.5,
  maxLevel: 100,
  
  // XP rewards
  taskCompleted: 10,
  perfectScore: 20,
  firstTry: 15,
  streakBonus: 5,
  dailyGoal: 50,
  
  // XP penalties
  hintUsed: -2,
  incorrectAttempt: -5,
} as const;

export function calculateXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(XP_CONFIG.levelMultiplier, level - 1));
}

export function calculateLevelFromXP(xp: number): number {
  let level = 1;
  let requiredXP = 0;
  
  while (requiredXP <= xp && level < XP_CONFIG.maxLevel) {
    level++;
    requiredXP += calculateXPForLevel(level);
  }
  
  return level - 1;
}

// ============================================
// STREAK CONFIGURATION
// ============================================

export const STREAK_CONFIG = {
  minDailyTasks: 3,
  freezeCost: 100, // XP cost for streak freeze
  maxFreezes: 3,
  premiumFreezes: 10,
} as const;

// ============================================
// SUBSCRIPTION PLANS
// ============================================

export const SUBSCRIPTION_PLANS = {
  [SubscriptionTier.FREE]: {
    name: 'Free',
    price: 0,
    currency: 'EUR',
    interval: 'month' as const,
    features: [
      '5 AI-generated tasks per day',
      'Basic AI tutor (limited messages)',
      'Progress tracking',
      'Basic achievements',
      'Community leaderboards',
    ],
    limits: {
      dailyTasks: 5,
      tutorMessages: 10,
      streakFreezes: 0,
    },
  },
  [SubscriptionTier.PREMIUM]: {
    name: 'Premium',
    price: 9.99,
    currency: 'EUR',
    interval: 'month' as const,
    features: [
      'Unlimited AI-generated tasks',
      'Unlimited AI tutor access',
      'Advanced analytics',
      'All achievements',
      'Streak freezes',
      'Priority support',
      'Ad-free experience',
      'Custom study plans',
    ],
    limits: {
      dailyTasks: Infinity,
      tutorMessages: Infinity,
      streakFreezes: 10,
    },
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
  },
  [SubscriptionTier.SCHOOL]: {
    name: 'School',
    price: 299,
    currency: 'EUR',
    interval: 'year' as const,
    features: [
      'Everything in Premium',
      'Classroom management',
      'Student analytics',
      'Assignment creation',
      'Progress reports',
      'Teacher dashboard',
      'Bulk student accounts',
      'Dedicated support',
    ],
    limits: {
      dailyTasks: Infinity,
      tutorMessages: Infinity,
      streakFreezes: Infinity,
      students: 100,
      classrooms: 10,
    },
    stripePriceId: process.env.STRIPE_SCHOOL_PRICE_ID,
  },
} as const;

// ============================================
// SUBJECT CONFIGURATION
// ============================================

export const SUBJECT_CONFIG = {
  [Subject.MATHEMATICS]: {
    name: 'Mathematics',
    icon: '📐',
    color: '#3B82F6', // blue
    topics: [
      'Algebra',
      'Geometry',
      'Trigonometry',
      'Calculus',
      'Statistics',
      'Probability',
      'Linear Algebra',
      'Differential Equations',
    ],
  },
  [Subject.PHYSICS]: {
    name: 'Physics',
    icon: '⚛️',
    color: '#8B5CF6', // purple
    topics: [
      'Mechanics',
      'Thermodynamics',
      'Electromagnetism',
      'Optics',
      'Quantum Physics',
      'Relativity',
      'Nuclear Physics',
      'Waves',
    ],
  },
  [Subject.CHEMISTRY]: {
    name: 'Chemistry',
    icon: '🧪',
    color: '#10B981', // green
    topics: [
      'Atomic Structure',
      'Chemical Bonding',
      'Stoichiometry',
      'Thermochemistry',
      'Kinetics',
      'Equilibrium',
      'Acids and Bases',
      'Organic Chemistry',
    ],
  },
  [Subject.ASTRONOMY]: {
    name: 'Astronomy',
    icon: '🌌',
    color: '#F59E0B', // amber
    topics: [
      'Solar System',
      'Stars and Galaxies',
      'Cosmology',
      'Celestial Mechanics',
      'Astrophysics',
      'Observational Astronomy',
      'Planetary Science',
      'Space Exploration',
    ],
  },
} as const;

// ============================================
// DIFFICULTY LEVELS
// ============================================

export const DIFFICULTY_LEVELS = {
  BEGINNER: { min: 1, max: 3, label: 'Beginner', color: '#10B981' },
  INTERMEDIATE: { min: 4, max: 6, label: 'Intermediate', color: '#F59E0B' },
  ADVANCED: { min: 7, max: 8, label: 'Advanced', color: '#EF4444' },
  EXPERT: { min: 9, max: 10, label: 'Expert', color: '#8B5CF6' },
} as const;

// ============================================
// AI CONFIGURATION
// ============================================

export const AI_CONFIG = {
  model: 'gpt-4o-mini',
  maxTokens: 2000,
  temperature: 0.7,
  
  // Rate limits
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  
  // Tutor settings
  tutorSystemPrompt: `You are an expert STEM tutor for Finnish high school students (grades 7-12). 
Your goal is to help students understand concepts deeply, not just give answers.
Use the Socratic method: ask guiding questions, provide hints, and encourage critical thinking.
Be encouraging, patient, and adapt to the student's level.
Use Finnish educational standards and terminology when appropriate.`,
  
  // Task generation settings
  taskGenerationPrompt: `Generate a high-quality STEM task for a student.
The task should be educational, engaging, and appropriate for the difficulty level.
Include clear instructions, correct answers, and step-by-step solutions.
Format the output as JSON with question, answer, solution, and hints fields.`,
} as const;

// ============================================
// ANALYTICS EVENTS
// ============================================

export const ANALYTICS_EVENTS = {
  // User events
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  
  // Task events
  TASK_GENERATED: 'task_generated',
  TASK_STARTED: 'task_started',
  TASK_COMPLETED: 'task_completed',
  TASK_ABANDONED: 'task_abandoned',
  
  // Tutor events
  TUTOR_MESSAGE_SENT: 'tutor_message_sent',
  TUTOR_CONVERSATION_STARTED: 'tutor_conversation_started',
  
  // Gamification events
  XP_EARNED: 'xp_earned',
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  STREAK_MAINTAINED: 'streak_maintained',
  STREAK_BROKEN: 'streak_broken',
  
  // Subscription events
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Feature usage
  FEATURE_USED: 'feature_used',
  ERROR_OCCURRED: 'error_occurred',
} as const;

// ============================================
// ERROR CODES
// ============================================

export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_EMAIL_IN_USE: 'auth/email-in-use',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_UNAUTHORIZED: 'auth/unauthorized',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate-limit/exceeded',
  DAILY_LIMIT_REACHED: 'limit/daily-reached',
  
  // Subscription
  SUBSCRIPTION_REQUIRED: 'subscription/required',
  SUBSCRIPTION_EXPIRED: 'subscription/expired',
  
  // AI
  AI_GENERATION_FAILED: 'ai/generation-failed',
  AI_RATE_LIMIT: 'ai/rate-limit',
  
  // General
  INTERNAL_ERROR: 'internal/error',
  VALIDATION_ERROR: 'validation/error',
  NOT_FOUND: 'not-found',
} as const;

// ============================================
// UI CONSTANTS
// ============================================

export const UI_CONFIG = {
  // Pagination
  defaultPageSize: 20,
  maxPageSize: 100,
  
  // Animations
  transitionDuration: 200,
  
  // Toasts
  toastDuration: 5000,
  
  // Modals
  modalAnimationDuration: 300,
  
  // Debounce
  searchDebounce: 300,
  autoSaveDebounce: 1000,
} as const;

// ============================================
// DATE FORMATS
// ============================================

export const DATE_FORMATS = {
  display: 'DD/MM/YYYY',
  displayWithTime: 'DD/MM/YYYY HH:mm',
  iso: 'YYYY-MM-DD',
  time: 'HH:mm',
} as const;

// ============================================
// VALIDATION RULES
// ============================================

export const VALIDATION = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email address',
  },
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  },
  name: {
    minLength: 2,
    maxLength: 100,
    message: 'Name must be between 2 and 100 characters',
  },
} as const;
