import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/server';
import { AnalyticsService } from '@/services/analytics.service';
import { Subject } from '@/lib/prisma-types';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject') as Subject | null;
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'year' || 'week';
    const userId = auth.user!.id;

    const analytics = await AnalyticsService.getUserAnalytics(userId);

    const overallMastery = Math.round(analytics.averageAccuracy);

    const subjects = await Promise.all(
      Object.keys(analytics.subjectBreakdown).map(async (subjectName) => {
        const subjectTasks = await prisma.userTask.findMany({
          where: {
            userId,
            task: { subject: subjectName as Subject },
          },
          include: { task: true },
        });

        const correctTasks = subjectTasks.filter((t) => t.isCorrect).length;
        const mastery = subjectTasks.length > 0
          ? Math.round((correctTasks / subjectTasks.length) * 100)
          : 0;

        const topicPerformance: Record<string, { correct: number; total: number }> = {};
        subjectTasks.forEach((t) => {
          const topic = t.task.topic;
          if (!topicPerformance[topic]) {
            topicPerformance[topic] = { correct: 0, total: 0 };
          }
          topicPerformance[topic].total++;
          if (t.isCorrect) topicPerformance[topic].correct++;
        });

        const topics = Object.entries(topicPerformance).map(([topic, data]) => ({
          topic,
          accuracy: (data.correct / data.total) * 100,
        }));

        topics.sort((a, b) => a.accuracy - b.accuracy);

        return {
          subject: subjectName,
          mastery,
          weakTopics: topics.slice(0, 3).map((t) => t.topic),
          strongTopics: topics.slice(-3).reverse().map((t) => t.topic),
        };
      })
    );

    const insights: string[] = [];

    if (analytics.currentStreak >= 7) {
      insights.push(`Amazing! You've maintained a ${analytics.currentStreak}-day streak!`);
    }

    if (analytics.averageAccuracy >= 80) {
      insights.push('Your accuracy is excellent! Keep up the great work!');
    } else if (analytics.averageAccuracy < 50) {
      insights.push('Focus on understanding concepts before moving to harder problems');
    }

    if (analytics.totalTasks >= 50) {
      insights.push("You've completed over 50 tasks! You're making great progress!");
    }

    const studyTime = Math.round(analytics.averageTimePerTask * analytics.totalTasks / 60);
    insights.push(`You've spent ${studyTime} minutes learning this ${timeframe}`);

    return NextResponse.json({
      success: true,
      data: {
        overallMastery,
        studyTime,
        subjects: subject
          ? subjects.filter((s) => s.subject === subject)
          : subjects,
        weeklyActivity: analytics.weeklyActivity,
        insights,
        timeframe,
      },
    });
  } catch (error) {
    console.error('Progress analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
