// ============================================
// STEM Genius - Task Service
// ============================================

import { prisma } from '@/lib/prisma';
import { Subject, TaskType, DifficultyLevel } from '@/lib/prisma-types';
import { AIService, TaskGenerationParams } from './ai.service';
import { GamificationService } from './gamification.service';
import { AnalyticsService } from './analytics.service';

// ============================================
// TASK SERVICE
// ============================================

export class TaskService {
  /**
   * Generate a new task using AI
   */
  static async generateTask(params: TaskGenerationParams): Promise<any> {
    // Generate task using AI
    const generatedTask = AIService.isAvailable()
      ? await AIService.generateTask(params)
      : AIService.getMockTask(params);

    // Determine difficulty level
    const level = this.getDifficultyLevel(params.difficulty);

    // Create task in database
    const task = await prisma.task.create({
      data: {
        subject: params.subject,
        topic: params.topic,
        subtopic: generatedTask.tags[0] || null,
        difficulty: params.difficulty,
        type: params.type,
        level,
        question: generatedTask.question,
        answer: generatedTask.answer,
        solution: generatedTask.solution,
        hints: generatedTask.hints,
        estimatedTime: generatedTask.estimatedTime,
        xpReward: this.calculateBaseXP(params.difficulty),
        tags: generatedTask.tags,
        generatedBy: AIService.isAvailable() ? 'gpt-4o-mini' : 'mock',
        prompt: `${params.subject} - ${params.topic}`,
      },
    });

    return task;
  }

  /**
   * Get task by ID
   */
  static async getTask(taskId: string): Promise<any> {
    return await prisma.task.findUnique({
      where: { id: taskId },
    });
  }

  /**
   * Get tasks for user (personalized)
   */
  static async getTasksForUser(
    userId: string,
    options: {
      subject?: Subject;
      limit?: number;
      difficulty?: number;
    } = {}
  ): Promise<any[]> {
    const { subject, limit = 10, difficulty } = options;

    // Get user profile for personalization
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const where: any = {};

    if (subject) {
      where.subject = subject;
    }

    if (difficulty) {
      where.difficulty = {
        gte: difficulty - 1,
        lte: difficulty + 1,
      };
    } else if (profile) {
      // Use user's difficulty level
      where.difficulty = {
        gte: profile.difficultyLevel - 1,
        lte: profile.difficultyLevel + 1,
      };
    }

    // Get tasks user hasn't completed
    const completedTaskIds = await prisma.userTask.findMany({
      where: { userId },
      select: { taskId: true },
    });

    where.id = {
      notIn: completedTaskIds.map((t) => t.taskId),
    };

    return await prisma.task.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Submit task answer
   */
  static async submitAnswer(
    userId: string,
    taskId: string,
    answer: any,
    metadata: {
      timeSpent: number;
      hintsUsed: number;
      attempts: number;
      confidence?: number;
    }
  ): Promise<{
    isCorrect: boolean;
    feedback: string;
    xpEarned: number;
    leveledUp: boolean;
    newLevel: number;
  }> {
    const task = await this.getTask(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if answer is correct
    const isCorrect = this.checkAnswer(answer, task.answer);

    // Calculate XP
    const xpEarned = GamificationService.calculateTaskXP({
      baseXP: task.xpReward,
      difficulty: task.difficulty,
      isCorrect,
      timeSpent: metadata.timeSpent,
      estimatedTime: task.estimatedTime,
      hintsUsed: metadata.hintsUsed,
      attempts: metadata.attempts,
    });

    // Save user task
    await prisma.userTask.create({
      data: {
        userId,
        taskId,
        answerSubmitted: answer,
        isCorrect,
        timeSpent: metadata.timeSpent,
        hintsUsed: metadata.hintsUsed,
        attempts: metadata.attempts,
        confidence: metadata.confidence,
        xpEarned,
      },
    });

    // Award XP
    const { newLevel, leveledUp } = await GamificationService.awardXP(
      userId,
      xpEarned,
      'task_completion',
      task.subject
    );

    // Update streak
    await GamificationService.updateStreak(userId);

    // Check achievements
    await GamificationService.checkAchievements(userId);

    // Track analytics
    await AnalyticsService.trackTaskCompletion(userId, taskId, {
      subject: task.subject,
      topic: task.topic,
      difficulty: task.difficulty,
      isCorrect,
      timeSpent: metadata.timeSpent,
      xpEarned,
    });

    // Update user profile difficulty if needed
    await this.updateUserDifficulty(userId, isCorrect, task.difficulty);

    return {
      isCorrect,
      feedback: isCorrect
        ? 'Correct! Well done! 🎉'
        : 'Not quite right. Review the solution and try again.',
      xpEarned,
      leveledUp,
      newLevel,
    };
  }

  /**
   * Get task hints progressively
   */
  static async getHint(taskId: string, hintLevel: number): Promise<string> {
    const task = await this.getTask(taskId);

    if (!task || !task.hints) {
      return 'No hints available for this task.';
    }

    const hints = task.hints as any[];
    const hint = hints.find((h: any) => h.level === hintLevel);

    return hint?.text || 'No more hints available.';
  }

  /**
   * Get task solution
   */
  static async getSolution(taskId: string): Promise<any> {
    const task = await this.getTask(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    return task.solution;
  }

  /**
   * Rate task
   */
  static async rateTask(taskId: string, rating: number): Promise<void> {
    const task = await this.getTask(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    // Calculate new average rating
    const currentRating = task.rating || 0;
    const newRating = currentRating === 0 ? rating : (currentRating + rating) / 2;

    await prisma.task.update({
      where: { id: taskId },
      data: { rating: newRating },
    });
  }

  /**
   * Report task issue
   */
  static async reportTask(taskId: string, reason: string): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        reportCount: { increment: 1 },
      },
    });

    // In production, notify admins
    console.log(`Task ${taskId} reported: ${reason}`);
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private static checkAnswer(userAnswer: any, correctAnswer: any): boolean {
    // Normalize answers for comparison
    const normalize = (val: any): string => {
      if (typeof val === 'string') {
        return val.toLowerCase().trim().replace(/\s+/g, '');
      }
      return String(val);
    };

    const userNormalized = normalize(userAnswer);
    const correctNormalized = normalize(correctAnswer.correct || correctAnswer);

    return userNormalized === correctNormalized;
  }

  private static getDifficultyLevel(difficulty: number): DifficultyLevel {
    if (difficulty <= 3) return DifficultyLevel.BEGINNER;
    if (difficulty <= 6) return DifficultyLevel.INTERMEDIATE;
    if (difficulty <= 8) return DifficultyLevel.ADVANCED;
    return DifficultyLevel.EXPERT;
  }

  private static calculateBaseXP(difficulty: number): number {
    return Math.floor(10 + difficulty * 5);
  }

  private static async updateUserDifficulty(
    userId: string,
    isCorrect: boolean,
    taskDifficulty: number
  ): Promise<void> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) return;

    // Adjust difficulty based on performance
    let newDifficulty = profile.difficultyLevel;

    if (isCorrect && taskDifficulty >= profile.difficultyLevel) {
      // Increase difficulty slightly
      newDifficulty = Math.min(10, profile.difficultyLevel + 0.1);
    } else if (!isCorrect && taskDifficulty <= profile.difficultyLevel) {
      // Decrease difficulty slightly
      newDifficulty = Math.max(1, profile.difficultyLevel - 0.1);
    }

    if (newDifficulty !== profile.difficultyLevel) {
      await prisma.userProfile.update({
        where: { userId },
        data: { difficultyLevel: newDifficulty },
      });
    }
  }

  /**
   * Get user's task history
   */
  static async getUserTaskHistory(
    userId: string,
    options: {
      subject?: Subject;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    const { subject, limit = 20, offset = 0 } = options;

    const where: any = { userId };

    if (subject) {
      where.task = { subject };
    }

    return await prisma.userTask.findMany({
      where,
      include: {
        task: true,
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(userId: string): Promise<{
    total: number;
    correct: number;
    accuracy: number;
    averageTime: number;
    bySubject: Record<string, { total: number; correct: number }>;
  }> {
    const tasks = await prisma.userTask.findMany({
      where: { userId },
      include: { task: true },
    });

    const total = tasks.length;
    const correct = tasks.filter((t) => t.isCorrect).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    const averageTime =
      total > 0 ? tasks.reduce((sum, t) => sum + t.timeSpent, 0) / total : 0;

    const bySubject: Record<string, { total: number; correct: number }> = {};

    tasks.forEach((t) => {
      const subject = t.task.subject;
      if (!bySubject[subject]) {
        bySubject[subject] = { total: 0, correct: 0 };
      }
      bySubject[subject].total++;
      if (t.isCorrect) {
        bySubject[subject].correct++;
      }
    });

    return {
      total,
      correct,
      accuracy,
      averageTime,
      bySubject,
    };
  }
}
