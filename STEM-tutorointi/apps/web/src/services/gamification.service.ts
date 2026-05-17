// ============================================
// STEM Genius - Gamification Service
// ============================================

import { prisma } from '@/lib/prisma';
import { Subject } from '@/lib/prisma-types';
import { XP_CONFIG, STREAK_CONFIG, calculateLevelFromXP } from '@/config/constants';
import { AnalyticsService } from './analytics.service';

// ============================================
// GAMIFICATION SERVICE
// ============================================

export class GamificationService {
  /**
   * Award XP to user
   */
  static async awardXP(
    userId: string,
    amount: number,
    source: string,
    subject?: Subject
  ): Promise<{
    newXP: number;
    newLevel: number;
    leveledUp: boolean;
  }> {
    const userXP = await prisma.userXP.findUnique({
      where: { userId },
    });

    if (!userXP) {
      throw new Error('User XP record not found');
    }

    // Apply multiplier
    const actualXP = Math.floor(amount * userXP.xpMultiplier);

    // Calculate new totals
    const newTotalXP = userXP.totalXP + actualXP;
    const oldLevel = userXP.level;
    const newLevel = calculateLevelFromXP(newTotalXP);
    const leveledUp = newLevel > oldLevel;

    // Update subject-specific XP
    const subjectXPUpdate: any = {};
    if (subject) {
      const subjectKey = `${subject.toLowerCase()}XP` as keyof typeof userXP;
      if (subjectKey in userXP) {
        subjectXPUpdate[subjectKey] = (userXP[subjectKey] as number) + actualXP;
      }
    }

    // Update XP
    await prisma.userXP.update({
      where: { userId },
      data: {
        totalXP: newTotalXP,
        level: newLevel,
        ...subjectXPUpdate,
      },
    });

    // Track analytics
    await AnalyticsService.trackXPEarned(userId, actualXP, source);

    if (leveledUp) {
      await AnalyticsService.trackLevelUp(userId, newLevel);
      
      // Check for level-based achievements
      await this.checkLevelAchievements(userId, newLevel);
    }

    return {
      newXP: newTotalXP,
      newLevel,
      leveledUp,
    };
  }

  /**
   * Update user streak
   */
  static async updateStreak(userId: string): Promise<{
    currentStreak: number;
    streakMaintained: boolean;
    streakBroken: boolean;
  }> {
    const userStreak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!userStreak) {
      throw new Error('User streak record not found');
    }

    const now = new Date();
    const lastActivity = new Date(userStreak.lastActivityDate);
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    let currentStreak = userStreak.currentStreak;
    let streakMaintained = false;
    let streakBroken = false;

    if (daysSinceLastActivity === 0) {
      // Same day - no change
      return { currentStreak, streakMaintained: false, streakBroken: false };
    } else if (daysSinceLastActivity === 1) {
      // Next day - maintain streak
      currentStreak++;
      streakMaintained = true;
      
      await AnalyticsService.trackStreakMaintained(userId, currentStreak);
    } else {
      // Streak broken
      if (currentStreak > 0) {
        streakBroken = true;
        await AnalyticsService.trackStreakBroken(userId, currentStreak);
      }
      currentStreak = 1; // Start new streak
    }

    // Update longest streak
    const longestStreak = Math.max(userStreak.longestStreak, currentStreak);

    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak,
        longestStreak,
        lastActivityDate: now,
      },
    });

    // Check for streak achievements
    if (streakMaintained) {
      await this.checkStreakAchievements(userId, currentStreak);
    }

    return { currentStreak, streakMaintained, streakBroken };
  }

  /**
   * Use streak freeze
   */
  static async useStreakFreeze(userId: string): Promise<boolean> {
    const userStreak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!userStreak) {
      throw new Error('User streak record not found');
    }

    if (userStreak.freezesAvailable <= 0) {
      return false;
    }

    await prisma.userStreak.update({
      where: { userId },
      data: {
        freezesAvailable: userStreak.freezesAvailable - 1,
        freezesUsed: userStreak.freezesUsed + 1,
        lastActivityDate: new Date(), // Extend streak
      },
    });

    return true;
  }

  /**
   * Check and unlock achievements
   */
  static async checkAchievements(userId: string): Promise<string[]> {
    const unlockedAchievements: string[] = [];

    // Get user data
    const [user, userXP, userStreak, userTasks] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.userXP.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userTask.findMany({ where: { userId } }),
    ]);

    if (!user || !userXP || !userStreak) {
      return [];
    }

    // Get all achievements
    const achievements = await prisma.achievement.findMany();

    // Get already unlocked achievements
    const unlockedIds = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const unlockedSet = new Set(unlockedIds.map((a) => a.achievementId));

    // Check each achievement
    for (const achievement of achievements) {
      if (unlockedSet.has(achievement.id)) {
        continue; // Already unlocked
      }

      const criteria = achievement.criteria as any;
      let shouldUnlock = false;

      // Check criteria based on category
      switch (achievement.category) {
        case 'TASKS_COMPLETED':
          shouldUnlock = userTasks.length >= (criteria.count || 0);
          break;

        case 'STREAK':
          shouldUnlock = userStreak.currentStreak >= (criteria.days || 0);
          break;

        case 'MASTERY':
          const subjectXP = userXP[`${criteria.subject?.toLowerCase()}XP` as keyof typeof userXP];
          shouldUnlock = (subjectXP as number) >= (criteria.xp || 0);
          break;

        case 'SPEED':
          const fastTasks = userTasks.filter(
            (t) => t.timeSpent <= (criteria.maxTime || 0)
          );
          shouldUnlock = fastTasks.length >= (criteria.count || 0);
          break;

        case 'ACCURACY':
          const correctTasks = userTasks.filter((t) => t.isCorrect);
          const accuracy = userTasks.length > 0 ? correctTasks.length / userTasks.length : 0;
          shouldUnlock = accuracy >= (criteria.accuracy || 0);
          break;
      }

      if (shouldUnlock) {
        // Unlock achievement
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
          },
        });

        // Award XP
        if (achievement.xpReward > 0) {
          await this.awardXP(userId, achievement.xpReward, 'achievement');
        }

        // Track analytics
        await AnalyticsService.trackAchievementUnlock(
          userId,
          achievement.id,
          achievement.name
        );

        unlockedAchievements.push(achievement.id);
      }
    }

    return unlockedAchievements;
  }

  /**
   * Check level-based achievements
   */
  private static async checkLevelAchievements(userId: string, level: number): Promise<void> {
    const levelMilestones = [5, 10, 25, 50, 100];

    if (levelMilestones.includes(level)) {
      await this.checkAchievements(userId);
    }
  }

  /**
   * Check streak-based achievements
   */
  private static async checkStreakAchievements(
    userId: string,
    streak: number
  ): Promise<void> {
    const streakMilestones = [7, 30, 100, 365];

    if (streakMilestones.includes(streak)) {
      await this.checkAchievements(userId);
    }
  }

  /**
   * Calculate XP for task completion
   */
  static calculateTaskXP(params: {
    baseXP: number;
    difficulty: number;
    isCorrect: boolean;
    timeSpent: number;
    estimatedTime: number;
    hintsUsed: number;
    attempts: number;
  }): number {
    let xp = params.baseXP;

    // Difficulty multiplier
    xp *= 1 + (params.difficulty - 5) * 0.1;

    // Correctness
    if (!params.isCorrect) {
      xp *= 0.5; // Half XP for incorrect answers
    }

    // Speed bonus
    if (params.timeSpent < params.estimatedTime * 0.5) {
      xp *= 1.5; // 50% bonus for fast completion
    }

    // Hint penalty
    xp -= params.hintsUsed * XP_CONFIG.hintUsed;

    // Attempt penalty
    if (params.attempts > 1) {
      xp -= (params.attempts - 1) * XP_CONFIG.incorrectAttempt;
    }

    // First try bonus
    if (params.attempts === 1 && params.isCorrect) {
      xp += XP_CONFIG.firstTry;
    }

    // Ensure minimum XP
    return Math.max(Math.floor(xp), 1);
  }

  /**
   * Get user gamification stats
   */
  static async getUserStats(userId: string): Promise<{
    xp: number;
    level: number;
    xpToNextLevel: number;
    streak: number;
    longestStreak: number;
    achievements: number;
    totalAchievements: number;
    rank?: number;
  }> {
    const [userXP, userStreak, userAchievements, totalAchievements] = await Promise.all([
      prisma.userXP.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.achievement.count(),
    ]);

    if (!userXP || !userStreak) {
      throw new Error('User gamification data not found');
    }

    // Calculate XP to next level
    const currentLevelXP = calculateLevelFromXP(userXP.totalXP);
    const nextLevelXP = calculateLevelFromXP(userXP.totalXP + 1);
    const xpToNextLevel = nextLevelXP - userXP.totalXP;

    // Get user rank
    const higherRankedUsers = await prisma.userXP.count({
      where: { totalXP: { gt: userXP.totalXP } },
    });
    const rank = higherRankedUsers + 1;

    return {
      xp: userXP.totalXP,
      level: userXP.level,
      xpToNextLevel,
      streak: userStreak.currentStreak,
      longestStreak: userStreak.longestStreak,
      achievements: userAchievements,
      totalAchievements,
      rank,
    };
  }

  /**
   * Get daily progress
   */
  static async getDailyProgress(userId: string): Promise<{
    tasksCompleted: number;
    tasksGoal: number;
    xpEarned: number;
    xpGoal: number;
    goalMet: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysTasks = await prisma.userTask.findMany({
      where: {
        userId,
        completedAt: { gte: today },
      },
    });

    const tasksCompleted = todaysTasks.length;
    const xpEarned = todaysTasks.reduce((sum, task) => sum + task.xpEarned, 0);

    const tasksGoal = STREAK_CONFIG.minDailyTasks;
    const xpGoal = XP_CONFIG.dailyGoal;
    const goalMet = tasksCompleted >= tasksGoal && xpEarned >= xpGoal;

    return {
      tasksCompleted,
      tasksGoal,
      xpEarned,
      xpGoal,
      goalMet,
    };
  }
}
