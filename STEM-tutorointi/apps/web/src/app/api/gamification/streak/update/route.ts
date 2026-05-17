// ============================================
// STEM Genius - Update Streak API
// Update daily streak and handle streak maintenance
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfDay, differenceInDays } from 'date-fns';

const updateStreakSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['check', 'freeze', 'restore']).optional().default('check'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = updateStreakSchema.parse(body);

    // Get current streak
    const streak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      return NextResponse.json(
        { error: 'User streak record not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const today = startOfDay(now);
    const lastActivity = startOfDay(streak.lastActivityDate);
    const daysSinceLastActivity = differenceInDays(today, lastActivity);

    let currentStreak = streak.currentStreak;
    let longestStreak = streak.longestStreak;
    let streakBroken = false;
    let streakExtended = false;

    if (action === 'check') {
      if (daysSinceLastActivity === 0) {
        // Already logged activity today
        return NextResponse.json({
          success: true,
          data: {
            streak: {
              current: currentStreak,
              longest: longestStreak,
              lastActivity: streak.lastActivityDate,
              alreadyLoggedToday: true,
            },
          },
        });
      } else if (daysSinceLastActivity === 1) {
        // Extend streak
        currentStreak++;
        streakExtended = true;
        
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else if (daysSinceLastActivity > 1) {
        // Streak broken
        streakBroken = true;
        currentStreak = 1; // Start new streak
      }

      // Update streak
      const updated = await prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak,
          longestStreak,
          lastActivityDate: now,
        },
      });

      // Create events
      if (streakExtended) {
        await prisma.event.create({
          data: {
            userId,
            eventType: 'STREAK_MAINTAINED',
            eventData: {
              streak: currentStreak,
              isNewRecord: currentStreak === longestStreak && currentStreak > 1,
            },
          },
        });

        // Check for streak achievements
        const streakAchievements = await prisma.achievement.findMany({
          where: {
            category: 'STREAK',
            criteria: {
              path: ['streak'],
              lte: currentStreak,
            },
          },
        });

        for (const achievement of streakAchievements) {
          const existing = await prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: achievement.id,
              },
            },
          });

          if (!existing) {
            await prisma.userAchievement.create({
              data: {
                userId,
                achievementId: achievement.id,
              },
            });
          }
        }
      }

      if (streakBroken) {
        await prisma.event.create({
          data: {
            userId,
            eventType: 'STREAK_BROKEN',
            eventData: {
              oldStreak: streak.currentStreak,
              daysMissed: daysSinceLastActivity,
            },
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          streak: {
            current: updated.currentStreak,
            longest: updated.longestStreak,
            lastActivity: updated.lastActivityDate,
            streakExtended,
            streakBroken,
            freezesAvailable: updated.freezesAvailable,
          },
        },
      });
    } else if (action === 'freeze') {
      // Use streak freeze (premium feature)
      if (streak.freezesAvailable <= 0) {
        return NextResponse.json(
          { error: 'No streak freezes available' },
          { status: 400 }
        );
      }

      const updated = await prisma.userStreak.update({
        where: { userId },
        data: {
          freezesAvailable: { decrement: 1 },
          freezesUsed: { increment: 1 },
          lastActivityDate: now,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          streak: {
            current: updated.currentStreak,
            longest: updated.longestStreak,
            freezesAvailable: updated.freezesAvailable,
            freezeUsed: true,
          },
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Update streak error:', error);

    return NextResponse.json(
      { error: 'Failed to update streak', details: error.message },
      { status: 500 }
    );
  }
}
