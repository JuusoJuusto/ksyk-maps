'use client';

import { useUserStats, useDailyProgress, usePersonalizedFeed, useTasks } from '@/lib/hooks/use-queries';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { calculateLevelFromXP } from '@/config/constants';

interface DashboardContentProps {
  user: any;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: dailyProgress, isLoading: progressLoading } = useDailyProgress();
  const { data: feed, isLoading: feedLoading } = usePersonalizedFeed();
  const { data: tasks, isLoading: tasksLoading } = useTasks({ limit: 5 });

  const isLoading = statsLoading || progressLoading || feedLoading || tasksLoading;

  // Calculate level from XP
  const totalXP = (stats as Record<string, unknown>)?.xp as number || 0;
  const level = calculateLevelFromXP(totalXP);
  const nextLevelXP = Math.pow(level + 1, 2) * 100;
  const currentLevelXP = Math.pow(level, 2) * 100;
  const progressToNextLevel = ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Ready to continue your learning journey?
              </p>
            </div>
            <Link href="/tutor">
              <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Ask AI Tutor
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Level Card */}
          <Card className="p-6 bg-blue-600 text-white border-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium opacity-90">Level</div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-12 w-20 bg-white/20" />
            ) : (
              <>
                <div className="text-4xl font-bold mb-2">{level}</div>
                <Progress value={progressToNextLevel} className="h-2 bg-white/20" />
                <div className="text-xs mt-2 opacity-90">
                  {Math.round(progressToNextLevel)}% to Level {level + 1}
                </div>
              </>
            )}
          </Card>

          {/* XP Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total XP</div>
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-12 w-32" />
            ) : (
              <div className="text-4xl font-bold text-neutral-900 dark:text-white">
                {totalXP.toLocaleString()}
              </div>
            )}
          </Card>

          {/* Streak Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Day Streak</div>
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-12 w-20" />
            ) : (
              <>
                <div className="text-4xl font-bold text-neutral-900 dark:text-white">
                  {((stats as Record<string, unknown>)?.streak as number) || 0}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Best: {stats?.longestStreak || 0} days
                </div>
              </>
            )}
          </Card>

          {/* Tasks Completed Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Tasks Done</div>
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-12 w-20" />
            ) : (
              <div className="text-4xl font-bold text-neutral-900 dark:text-white">
                {((stats as Record<string, unknown>)?.achievements as number) || 0}
              </div>
            )}
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Continue Learning */}
          <div className="lg:col-span-2 space-y-6">
            {/* Continue Learning */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Continue Learning
                </h2>
                <Link href="/practice">
                  <Button variant="ghost" size="sm">
                    View all
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </Link>
              </div>

              {tasksLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              )               : (tasks as Record<string, unknown>)?.tasks && ((tasks as Record<string, unknown>)?.tasks as any[]).length > 0 ? (
                <div className="space-y-4">
                  {((tasks as Record<string, unknown>)?.tasks as any[]).map((task: any) => (
                    <Link key={task.id} href={`/practice/${task.id}`}>
                      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{task.subject}</Badge>
                              <Badge variant="outline">{task.type}</Badge>
                            </div>
                            <h3 className="font-medium text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {task.title}
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                              {task.topic}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              +{task.xpReward} XP
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              {task.difficulty}/10
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    No tasks available yet
                  </p>
                  <Link href="/onboarding">
                    <Button>Complete Onboarding</Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* Daily Progress */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                Today's Progress
              </h2>
              {progressLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        Daily Goal
                      </span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {dailyProgress?.xpEarned || 0} / {dailyProgress?.xpGoal || 100} XP
                      </span>
                    </div>
                    <Progress 
                      value={((dailyProgress?.xpEarned || 0) / (dailyProgress?.xpGoal || 100)) * 100} 
                      className="h-3"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {dailyProgress?.tasksCompleted || 0}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Tasks
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {(dailyProgress as Record<string, unknown>)?.xpEarned as number || 0}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Minutes
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {((dailyProgress as Record<string, unknown>)?.goalMet as boolean) ? 100 : Math.round(((dailyProgress as Record<string, unknown>)?.xpEarned as number || 0) / ((dailyProgress as Record<string, unknown>)?.xpGoal as number || 1) * 100)}%
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Accuracy
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Quick Actions & Recommendations */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link href="/tutor">
                  <Button className="w-full justify-start" variant="outline">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Ask AI Tutor
                  </Button>
                </Link>
                <Link href="/practice">
                  <Button className="w-full justify-start" variant="outline">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Practice Tasks
                  </Button>
                </Link>
                <Link href="/progress">
                  <Button className="w-full justify-start" variant="outline">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Progress
                  </Button>
                </Link>
                <Link href="/achievements">
                  <Button className="w-full justify-start" variant="outline">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Achievements
                  </Button>
                </Link>
              </div>
            </Card>

            {/* AI Recommendations */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                AI Recommendations
              </h2>
              {feedLoading ? (
                <Skeleton className="h-32" />
              )               : feed && (feed as Record<string, unknown>)?.items ? (
                <div className="space-y-3">
                  {((feed as Record<string, unknown>)?.items as any[]).slice(0, 3).map((rec: any, index: number) => (
                    <div key={index} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-900 dark:text-white font-medium">
                            {rec.title}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                            {rec.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Complete more tasks to get personalized recommendations
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
