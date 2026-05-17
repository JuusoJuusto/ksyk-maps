// ============================================
// STEM Genius - Award XP API
// Award XP and handle level ups
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const awardXPSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().min(0).max(1000),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']).optional(),
  reason: z.string(),
  metadata: z.any().optional(),
});

// XP required for each level (exponential growth)
function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, subject, reason, metadata } = awardXPSchema.parse(body);

    // Get current XP
    const userXP = await prisma.userXP.findUnique({
      where: { userId },
    });

    if (!userXP) {
      return NextResponse.json(
        { error: 'User XP record not found' },
        { status: 404 }
      );
    }

    // Calculate new XP
    const oldTotalXP = userXP.totalXP;
    const newTotalXP = oldTotalXP + amount;
    const oldLevel = userXP.level;

    // Calculate new level
    let newLevel = oldLevel;
    let xpForNextLevel = getXPForLevel(newLevel + 1);
    
    while (newTotalXP >= xpForNextLevel) {
      newLevel++;
      xpForNextLevel = getXPForLevel(newLevel + 1);
    }

    const leveledUp = newLevel > oldLevel;

    // Update XP
    const updateData: any = {
      totalXP: newTotalXP,
      level: newLevel,
    };

    // Update subject-specific XP
    if (subject) {
      const subjectXPField = `${subject.toLowerCase()}XP` as 'mathXP' | 'physicsXP' | 'chemistryXP' | 'astronomyXP';
      updateData[subjectXPField] = {
        increment: amount,
      };
    }

    const updated = await prisma.userXP.update({
      where: { userId },
      data: updateData,
    });

    // Create XP event
    await prisma.event.create({
      data: {
        userId,
        eventType: 'XP_EARNED',
        eventData: {
          amount,
          subject,
          reason,
          oldXP: oldTotalXP,
          newXP: newTotalXP,
          metadata,
        },
      },
    });

    // If leveled up, create level up event and check for achievements
    if (leveledUp) {
      await prisma.event.create({
        data: {
          userId,
          eventType: 'LEVEL_UP',
          eventData: {
            oldLevel,
            newLevel,
            totalXP: newTotalXP,
          },
        },
      });

      // Check for level-based achievements
      const levelAchievements = await prisma.achievement.findMany({
        where: {
          category: 'MASTERY',
          criteria: {
            path: ['level'],
            lte: newLevel,
          },
        },
      });

      // Award achievements
      for (const achievement of levelAchievements) {
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

    return NextResponse.json({
      success: true,
      data: {
        xp: {
          total: updated.totalXP,
          gained: amount,
          level: updated.level,
          leveledUp,
          levelsGained: newLevel - oldLevel,
          xpForNextLevel: getXPForLevel(newLevel + 1),
          progress: (newTotalXP - getXPForLevel(newLevel)) / (getXPForLevel(newLevel + 1) - getXPForLevel(newLevel)),
        },
        subject: subject ? {
          name: subject,
          xp: updated[`${subject.toLowerCase()}XP` as keyof typeof updated],
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Award XP error:', error);

    return NextResponse.json(
      { error: 'Failed to award XP', details: error.message },
      { status: 500 }
    );
  }
}
