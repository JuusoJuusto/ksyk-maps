'use client';

import React from 'react';
import { Card } from '@/components/ui/card-premium';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakDisplay({ currentStreak, longestStreak, className }: StreakDisplayProps) {
  const isOnFire = currentStreak >= 7;
  const isHot = currentStreak >= 3;

  return (
    <Card 
      variant="streak" 
      className={cn(
        'relative overflow-hidden',
        isOnFire && 'animate-pulse-glow',
        className
      )}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Daily Streak</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold tracking-tight">{currentStreak}</p>
              <p className="text-lg text-muted-foreground">days</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Best: {longestStreak} days
            </p>
          </div>
          
          <div className={cn(
            'text-6xl transition-all duration-300',
            isOnFire && 'animate-streak-fire'
          )}>
            {isOnFire ? '🔥' : isHot ? '⚡' : '📚'}
          </div>
        </div>

        {/* Streak Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Keep it going!</span>
            <span>{currentStreak}/30</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
              style={{ width: `${Math.min((currentStreak / 30) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Motivational Messages */}
        {isOnFire && (
          <div className="mt-4 rounded-lg bg-orange-100 dark:bg-orange-950 p-3 text-center">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
              🔥 You're on fire! Keep the momentum going!
            </p>
          </div>
        )}
        
        {currentStreak === 0 && (
          <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-center">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Start your streak today! 💪
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
