// ============================================
// STEM Genius - Prisma Type Re-exports
// ============================================

// Re-export all Prisma types for easier imports
export type {
  User,
  UserProfile,
  Session,
  Task,
  UserTask,
  Conversation,
  Message,
  UserXP,
  UserStreak,
  Achievement,
  UserAchievement,
  StudyPlan,
  Event,
  Classroom,
  ClassroomMember,
  Assignment,
  LeaderboardEntry,
} from '../../../../generated/prisma';

export {
  UserRole,
  SubscriptionTier,
  Subject,
  TaskType,
  DifficultyLevel,
  MessageRole,
  AchievementCategory,
  AchievementRarity,
  EventType,
  ClassroomRole,
} from '../../../../generated/prisma';
