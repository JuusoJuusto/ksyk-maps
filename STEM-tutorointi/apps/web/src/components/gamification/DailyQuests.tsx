'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { cn } from '@/lib/utils';

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
}

interface DailyQuestsProps {
  quests: Quest[];
  className?: string;
}

export function DailyQuests({ quests, className }: DailyQuestsProps) {
  const completedCount = quests.filter(q => q.completed).length;
  const totalXP = quests.reduce((sum, q) => sum + (q.completed ? q.xpReward : 0), 0);
  const allCompleted = completedCount === quests.length;

  // Calculate difficulty based on target
  const getDifficulty = (target: number): 'easy' | 'medium' | 'hard' => {
    if (target <= 3) return 'easy';
    if (target <= 5) return 'medium';
    return 'hard';
  };

  const getIcon = (questId: string): string => {
    if (questId.includes('tasks')) return '☀️';
    if (questId.includes('xp')) return '📚';
    if (questId.includes('perfect')) return '🎯';
    if (questId.includes('time')) return '⏱️';
    return '✨';
  };

  const difficultyColors = {
    easy: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-700 dark:text-green-300',
      progress: 'from-green-400 to-emerald-500',
    },
    medium: {
      bg: 'bg-amber-100 dark:bg-amber-900',
      text: 'text-amber-700 dark:text-amber-300',
      progress: 'from-amber-400 to-orange-500',
    },
    hard: {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-700 dark:text-purple-300',
      progress: 'from-purple-400 to-violet-500',
    },
  };

  return (
    <Card variant="premium" className={cn('relative overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Daily Quests</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete all quests for bonus rewards!
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{completedCount}/{quests.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {quests.map((quest, index) => {
          const progressPercent = (quest.progress / quest.target) * 100;
          const difficulty = getDifficulty(quest.target);
          const difficultyStyle = difficultyColors[difficulty];
          const icon = getIcon(quest.id);

          return (
            <div
              key={quest.id}
              className={cn(
                'rounded-xl border-2 p-4 transition-all duration-300',
                quest.completed
                  ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
                  : 'border-border bg-card hover:shadow-md',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
                  quest.completed ? 'bg-green-100 dark:bg-green-900' : difficultyStyle.bg
                )}>
                  {quest.completed ? '✅' : icon}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={cn(
                        'font-semibold leading-tight',
                        quest.completed && 'line-through opacity-70'
                      )}>
                        {quest.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {quest.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        difficultyStyle.bg,
                        difficultyStyle.text
                      )}>
                        {difficulty}
                      </span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        +{quest.xpReward} XP
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {!quest.completed && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{quest.progress}/{quest.target}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn(
                            'h-full bg-gradient-to-r transition-all duration-500',
                            difficultyStyle.progress
                          )}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!quest.completed && (
                    <Button size="sm" variant="outline" className="mt-2">
                      Continue
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* All Completed Bonus */}
        {allCompleted && (
          <div className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-center text-white animate-bounce-in">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-bold">All Quests Completed!</h3>
            <p className="text-sm mt-1 opacity-90">
              You earned {totalXP} XP + 200 bonus XP!
            </p>
            <Button variant="secondary" size="sm" className="mt-3">
              Claim Rewards
            </Button>
          </div>
        )}

        {/* Timer */}
        <div className="rounded-lg bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Quests reset in</p>
          <p className="text-lg font-bold">
            {24 - new Date().getHours()} hours
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
