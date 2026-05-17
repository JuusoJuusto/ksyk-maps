'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { useProgress, useUserStats } from '@/lib/hooks/use-queries';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useState } from 'react';

const SUBJECT_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  MATHEMATICS: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
  PHYSICS: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500' },
  CHEMISTRY: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', bar: 'bg-green-500' },
  ASTRONOMY: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
};

const SUBJECT_ICONS: Record<string, string> = {
  MATHEMATICS: '📐',
  PHYSICS: '⚛️',
  CHEMISTRY: '🧪',
  ASTRONOMY: '🌌',
};

export default function ProgressPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const { data: progressData, isLoading: progressLoading } = useProgress({ timeframe: 'week' });
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const isLoading = authLoading || progressLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const progress = progressData as Record<string, unknown> | undefined;
  const subjects = (progress?.subjects as Array<Record<string, unknown>>) || [];
  const insights = (progress?.insights as string[]) || [];
  const overallMastery = (progress?.overallMastery as number) || 0;

  const statsData = stats as Record<string, unknown> | undefined;
  const xp = (statsData?.xp as number) || 0;
  const level = (statsData?.level as number) || 1;
  const streak = (statsData?.streak as number) || 0;
  const achievements = (statsData?.achievements as number) || 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20 md:pb-0">
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Your Progress
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Track your learning journey
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Overall Mastery</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">{overallMastery}%</p>
            <Progress value={overallMastery} className="h-1.5 mt-3" />
          </Card>
          <Card className="p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Total XP</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">{xp.toLocaleString()}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Level {level}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Streak</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">{streak} 🔥</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">days in a row</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Achievements</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">{achievements}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">unlocked</p>
          </Card>
        </div>

        {/* Subject Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={!selectedSubject ? 'default' : 'outline'}
            onClick={() => setSelectedSubject(null)}
            className={!selectedSubject ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : ''}
          >
            All Subjects
          </Button>
          {Object.keys(SUBJECT_COLORS).map((subject) => (
            <Button
              key={subject}
              size="sm"
              variant={selectedSubject === subject ? 'default' : 'outline'}
              onClick={() => setSelectedSubject(subject)}
              className={selectedSubject === subject ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : ''}
            >
              {SUBJECT_ICONS[subject]} {subject.charAt(0) + subject.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        {/* Subject Mastery */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Subject Mastery</h2>
          <div className="space-y-5">
            {(selectedSubject
              ? subjects.filter((s) => s.subject === selectedSubject)
              : subjects
            ).map((subject: Record<string, unknown>) => {
              const colors = SUBJECT_COLORS[subject.subject as string] || SUBJECT_COLORS.MATHEMATICS;
              const mastery = (subject.mastery as number) || 0;
              return (
                <div key={subject.subject as string}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{SUBJECT_ICONS[subject.subject as string] || '📚'}</span>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{subject.subject as string}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {(subject.weakTopics as string[])?.length > 0
                            ? `Focus: ${(subject.weakTopics as string[])[0]}`
                            : 'No data yet'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${colors.text}`}>{mastery}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {subjects.length === 0 && (
              <div className="text-center py-8">
                <p className="text-neutral-500 dark:text-neutral-400">Complete tasks to see your subject mastery</p>
                <Link href="/practice">
                  <Button className="mt-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
                    Start Practicing
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* AI Insights */}
        {insights.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Insights</h2>
            <div className="space-y-3">
              {insights.map((insight: string, i: number) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                >
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{insight}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
