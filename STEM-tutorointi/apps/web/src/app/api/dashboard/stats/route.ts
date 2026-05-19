import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/serverSession';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch user profile with gamification data
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        streak: true,
        lastActiveDate: true,
        createdAt: true,
      },
    });
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Count completed lessons
    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId: user.id,
        completed: true,
      },
    });
    
    // Count achievements
    const achievements = await prisma.achievement.count({
      where: {
        userId: user.id,
      },
    });
    
    // Get recent activity (last 10 items)
    const recentLessons = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        lessonId: true,
        completed: true,
        score: true,
        updatedAt: true,
      },
    });
    
    // Get user's learning goals
    const learningGoals = await prisma.learningGoal.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        subject: true,
        targetLevel: true,
        progress: true,
      },
    });
    
    // Calculate XP gained this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const xpThisWeek = await prisma.xPTransaction.aggregate({
      where: {
        userId: user.id,
        createdAt: {
          gte: oneWeekAgo,
        },
      },
      _sum: {
        amount: true,
      },
    });
    
    // Calculate lessons completed this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const lessonsThisMonth = await prisma.lessonProgress.count({
      where: {
        userId: user.id,
        completed: true,
        updatedAt: {
          gte: oneMonthAgo,
        },
      },
    });
    
    const previousMonthStart = new Date(oneMonthAgo);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    
    const lessonsLastMonth = await prisma.lessonProgress.count({
      where: {
        userId: user.id,
        completed: true,
        updatedAt: {
          gte: previousMonthStart,
          lt: oneMonthAgo,
        },
      },
    });
    
    return NextResponse.json({
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        xp: userProfile.xp || 0,
        level: userProfile.level || 1,
        streak: userProfile.streak || 0,
        lastActiveDate: userProfile.lastActiveDate,
      },
      stats: {
        totalXP: userProfile.xp || 0,
        xpThisWeek: xpThisWeek._sum.amount || 0,
        currentStreak: userProfile.streak || 0,
        completedLessons,
        lessonsThisMonth,
        lessonsComparedToLastMonth: lessonsThisMonth - lessonsLastMonth,
        achievements,
      },
      recentActivity: recentLessons,
      learningGoals,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
