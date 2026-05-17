'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useLeaderboard } from '@/lib/hooks/use-queries';
import { Subject } from '@/lib/prisma-types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type LeaderboardScope = 'global' | 'friends' | 'school' | 'class';
type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [scope, setScope] = useState<LeaderboardScope>('global');
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [subject, setSubject] = useState<Subject | undefined>(undefined);

  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard({
    scope,
    period,
    subject,
  });

  const isLoading = authLoading || leaderboardLoading;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const entries = leaderboardData?.entries || [];
  const userRank = leaderboardData?.userRank;

  const subjects: (Subject | undefined)[] = [undefined, 'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY'];
  const scopes: LeaderboardScope[] = ['global', 'friends', 'school', 'class'];
  const periods: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly', 'all-time'];

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600 dark:text-yellow-400';
    if (rank === 2) return 'text-neutral-400';
    if (rank === 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-neutral-600 dark:text-neutral-400';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Leaderboard 🏆
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Compete with learners worldwide
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            {/* Period */}
            <div>
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Time Period
              </div>
              <div className="flex gap-2 flex-wrap">
                {periods.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={period === p ? 'default' : 'outline'}
                    onClick={() => setPeriod(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div>
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Scope
              </div>
              <div className="flex gap-2 flex-wrap">
                {scopes.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={scope === s ? 'default' : 'outline'}
                    onClick={() => setScope(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Subject
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={subject === undefined ? 'default' : 'outline'}
                  onClick={() => setSubject(undefined)}
                >
                  All Subjects
                </Button>
                {subjects.slice(1).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={subject === s ? 'default' : 'outline'}
                    onClick={() => setSubject(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Your Rank */}
        {userRank && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Your Rank
                  </div>
                  <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                    {getRankIcon(userRank as number)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  XP
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  #{userRank as number}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="overflow-hidden">
          {leaderboardLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                No rankings yet
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Be the first to earn XP and climb the leaderboard!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {entries.map((entry: any, index: number) => (
                <div
                  key={entry.userId}
                  className={`p-6 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors ${
                    entry.userId === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-12 text-center text-2xl font-bold ${getRankColor(entry.rank)}`}>
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {entry.name?.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                          {entry.name}
                        </h3>
                        {entry.userId === user.id && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      {entry.gradeLevel && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Grade {entry.gradeLevel}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                        {entry.xp?.toLocaleString()}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Level {entry.level}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-6 mt-6 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                How Rankings Work
              </h3>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>• Complete tasks and earn XP to climb the leaderboard</li>
                <li>• Rankings update in real-time as you learn</li>
                <li>• Compete globally or with friends and classmates</li>
                <li>• Top performers earn special badges and rewards</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
