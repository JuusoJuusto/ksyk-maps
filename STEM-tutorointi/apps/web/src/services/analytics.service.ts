// ============================================
// STEM Genius - Analytics Service
// ============================================

import { prisma } from '@/lib/prisma';
import { EventType } from '@/lib/prisma-types';
import { ANALYTICS_EVENTS } from '@/config/constants';

// ============================================
// TYPES
// ============================================

export interface AnalyticsEvent {
  eventType: EventType;
  userId?: string;
  eventData?: Record<string, any>;
  device?: string;
  browser?: string;
  location?: string;
}

export interface UserAnalytics {
  totalTasks: number;
  completedTasks: number;
  averageAccuracy: number;
  averageTimePerTask: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  subjectBreakdown: Record<string, number>;
  weeklyActivity: Array<{ date: string; tasks: number; xp: number }>;
  strongTopics: string[];
  weakTopics: string[];
}

// ============================================
// ANALYTICS SERVICE
// ============================================

export class AnalyticsService {
  /**
   * Track an event
   */
  static async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await prisma.event.create({
        data: {
          eventType: event.eventType,
          userId: event.userId,
          eventData: event.eventData || {},
          device: event.device,
          browser: event.browser,
          location: event.location,
        },
      });

      // Also send to external analytics if configured
      if (this.isPostHogConfigured()) {
        await this.sendToPostHog(event);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Track user registration
   */
  static async trackRegistration(userId: string, method: string = 'email'): Promise<void> {
    await this.trackEvent({
      eventType: EventType.USER_REGISTERED,
      userId,
      eventData: { method },
    });
  }

  /**
   * Track user login
   */
  static async trackLogin(userId: string, method: string = 'email'): Promise<void> {
    await this.trackEvent({
      eventType: EventType.USER_LOGIN,
      userId,
      eventData: { method },
    });
  }

  /**
   * Track task completion
   */
  static async trackTaskCompletion(
    userId: string,
    taskId: string,
    data: {
      subject: string;
      topic: string;
      difficulty: number;
      isCorrect: boolean;
      timeSpent: number;
      xpEarned: number;
    }
  ): Promise<void> {
    await this.trackEvent({
      eventType: EventType.TASK_COMPLETED,
      userId,
      eventData: {
        taskId,
        ...data,
      },
    });
  }

  /**
   * Track XP earned
   */
  static async trackXPEarned(
    userId: string,
    amount: number,
    source: string
  ): Promise<void> {
    await this.trackEvent({
      eventType: EventType.XP_EARNED,
      userId,
      eventData: { amount, source },
    });
  }

  /**
   * Track level up
   */
  static async trackLevelUp(userId: string, newLevel: number): Promise<void> {
    await this.trackEvent({
      eventType: EventType.LEVEL_UP,
      userId,
      eventData: { level: newLevel },
    });
  }

  /**
   * Track achievement unlock
   */
  static async trackAchievementUnlock(
    userId: string,
    achievementId: string,
    achievementName: string
  ): Promise<void> {
    await this.trackEvent({
      eventType: EventType.ACHIEVEMENT_UNLOCKED,
      userId,
      eventData: { achievementId, achievementName },
    });
  }

  /**
   * Track streak maintenance
   */
  static async trackStreakMaintained(userId: string, streakDays: number): Promise<void> {
    await this.trackEvent({
      eventType: EventType.STREAK_MAINTAINED,
      userId,
      eventData: { streakDays },
    });
  }

  /**
   * Track streak broken
   */
  static async trackStreakBroken(userId: string, previousStreak: number): Promise<void> {
    await this.trackEvent({
      eventType: EventType.STREAK_BROKEN,
      userId,
      eventData: { previousStreak },
    });
  }

  /**
   * Get user analytics
   */
  static async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    // Get user tasks
    const userTasks = await prisma.userTask.findMany({
      where: { userId },
      include: { task: true },
    });

    // Get user XP
    const userXP = await prisma.userXP.findUnique({
      where: { userId },
    });

    // Get user streak
    const userStreak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    // Calculate metrics
    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter((t) => t.isCorrect).length;
    const averageAccuracy = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const averageTimePerTask =
      totalTasks > 0
        ? userTasks.reduce((sum, t) => sum + t.timeSpent, 0) / totalTasks
        : 0;

    // Subject breakdown
    const subjectBreakdown: Record<string, number> = {};
    userTasks.forEach((t) => {
      const subject = t.task.subject;
      subjectBreakdown[subject] = (subjectBreakdown[subject] || 0) + 1;
    });

    // Weekly activity (last 7 days)
    const weeklyActivity = await this.getWeeklyActivity(userId);

    // Strong and weak topics
    const { strongTopics, weakTopics } = await this.analyzeTopicPerformance(userId);

    return {
      totalTasks,
      completedTasks,
      averageAccuracy,
      averageTimePerTask,
      totalXP: userXP?.totalXP || 0,
      currentStreak: userStreak?.currentStreak || 0,
      longestStreak: userStreak?.longestStreak || 0,
      subjectBreakdown,
      weeklyActivity,
      strongTopics,
      weakTopics,
    };
  }

  /**
   * Get weekly activity
   */
  private static async getWeeklyActivity(
    userId: string
  ): Promise<Array<{ date: string; tasks: number; xp: number }>> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const tasks = await prisma.userTask.findMany({
      where: {
        userId,
        completedAt: { gte: sevenDaysAgo },
      },
      orderBy: { completedAt: 'asc' },
    });

    // Group by date
    const activityByDate: Record<string, { tasks: number; xp: number }> = {};

    tasks.forEach((task) => {
      const date = task.completedAt.toISOString().split('T')[0];
      if (!activityByDate[date]) {
        activityByDate[date] = { tasks: 0, xp: 0 };
      }
      activityByDate[date].tasks++;
      activityByDate[date].xp += task.xpEarned;
    });

    // Convert to array
    return Object.entries(activityByDate).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  /**
   * Analyze topic performance
   */
  private static async analyzeTopicPerformance(
    userId: string
  ): Promise<{ strongTopics: string[]; weakTopics: string[] }> {
    const tasks = await prisma.userTask.findMany({
      where: { userId },
      include: { task: true },
    });

    // Group by topic
    const topicPerformance: Record<string, { correct: number; total: number }> = {};

    tasks.forEach((userTask) => {
      const topic = userTask.task.topic;
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0 };
      }
      topicPerformance[topic].total++;
      if (userTask.isCorrect) {
        topicPerformance[topic].correct++;
      }
    });

    // Calculate accuracy for each topic
    const topicAccuracy = Object.entries(topicPerformance).map(([topic, data]) => ({
      topic,
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      total: data.total,
    }));

    // Filter topics with at least 3 attempts
    const significantTopics = topicAccuracy.filter((t) => t.total >= 3);

    // Sort by accuracy
    significantTopics.sort((a, b) => b.accuracy - a.accuracy);

    // Get top 5 strong and weak topics
    const strongTopics = significantTopics.slice(0, 5).map((t) => t.topic);
    const weakTopics = significantTopics.slice(-5).reverse().map((t) => t.topic);

    return { strongTopics, weakTopics };
  }

  /**
   * Get platform-wide statistics
   */
  static async getPlatformStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalTasks: number;
    totalXP: number;
    averageLevel: number;
  }> {
    const [totalUsers, activeUsers, totalTasks, xpStats] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.userTask.count(),
      prisma.userXP.aggregate({
        _sum: { totalXP: true },
        _avg: { level: true },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalTasks,
      totalXP: xpStats._sum.totalXP || 0,
      averageLevel: xpStats._avg.level || 1,
    };
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(
    type: 'global' | 'weekly' | 'monthly' = 'global',
    limit: number = 10
  ): Promise<
    Array<{
      userId: string;
      userName: string;
      avatar?: string;
      score: number;
      rank: number;
    }>
  > {
    let whereClause = {};

    if (type === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      whereClause = { updatedAt: { gte: weekAgo } };
    } else if (type === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      whereClause = { updatedAt: { gte: monthAgo } };
    }

    const topUsers = await prisma.userXP.findMany({
      where: whereClause,
      orderBy: { totalXP: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return topUsers.map((entry, index) => ({
      userId: entry.user.id,
      userName: entry.user.name,
      avatar: entry.user.avatar || undefined,
      score: entry.totalXP,
      rank: index + 1,
    }));
  }

  // ============================================
  // EXTERNAL ANALYTICS INTEGRATION
  // ============================================

  /**
   * Check if PostHog is configured
   */
  private static isPostHogConfigured(): boolean {
    return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
  }

  /**
   * Send event to PostHog
   */
  private static async sendToPostHog(event: AnalyticsEvent): Promise<void> {
    // In production, integrate with PostHog SDK
    // For now, just log
    if (process.env.NODE_ENV === 'development') {
      console.log('[PostHog]', event.eventType, event.eventData);
    }
  }

  /**
   * Identify user in PostHog
   */
  static async identifyUser(userId: string, properties: Record<string, any>): Promise<void> {
    if (this.isPostHogConfigured()) {
      // In production, call PostHog identify
      console.log('[PostHog] Identify:', userId, properties);
    }
  }
}
