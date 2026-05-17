'use client';

import React from 'react';
import { Card } from '@/components/ui/card-premium';
import { getLevelStyle } from '@/config/design-system';
import { cn } from '@/lib/utils';

interface XPDisplayProps {
  currentXP: number;
  level: number;
  xpForNextLevel: number;
  className?: string;
}

export function XPDisplay({ currentXP, level, xpForNextLevel, className }: XPDisplayProps) {
  const levelStyle = getLevelStyle(level);
  const progress = (currentXP / xpForNextLevel) * 100;
  const xpNeeded = xpForNextLevel - currentXP;

  return (
    <Card variant="premium" className={cn('relative overflow-hidden', className)}>
      {/* Background Gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-10',
        levelStyle.gradient
      )} />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Your Level</p>
            <div className="flex items-baseline gap-2">
              <p className="text-5xl font-bold tracking-tight">{level}</p>
              <div className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                'bg-gradient-to-r text-white',
                levelStyle.gradient
              )}>
                {levelStyle.label}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Total XP</p>
            <p className="text-2xl font-bold">{currentXP.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Level {level + 1}</span>
            <span className="text-muted-foreground">{xpNeeded} XP needed</span>
          </div>
          
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full bg-gradient-to-r transition-all duration-500',
                levelStyle.gradient
              )}
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-0 animate-shimmer" />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentXP} XP</span>
            <span>{xpForNextLevel} XP</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary p-3 text-center">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-lg font-bold">+{Math.floor(Math.random() * 200 + 50)}</p>
          </div>
          <div className="rounded-lg bg-secondary p-3 text-center">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-lg font-bold">+{Math.floor(Math.random() * 1000 + 500)}</p>
          </div>
          <div className="rounded-lg bg-secondary p-3 text-center">
            <p className="text-xs text-muted-foreground">Rank</p>
            <p className="text-lg font-bold">#{Math.floor(Math.random() * 100 + 1)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
