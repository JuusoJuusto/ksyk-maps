'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card-premium';
import { cn } from '@/lib/utils';

interface AchievementCardProps {
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  className?: string;
}

const rarityStyles = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-900',
    border: 'border-gray-300 dark:border-gray-700',
    glow: 'shadow-gray-500/20',
  },
  rare: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    border: 'border-blue-300 dark:border-blue-700',
    glow: 'shadow-blue-500/30',
  },
  epic: {
    bg: 'bg-purple-100 dark:bg-purple-900',
    border: 'border-purple-300 dark:border-purple-700',
    glow: 'shadow-purple-500/40',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900',
    border: 'border-amber-300 dark:border-amber-700',
    glow: 'shadow-amber-500/50',
  },
};

export function AchievementCard({
  title,
  description,
  icon,
  unlocked,
  unlockedAt,
  progress = 0,
  maxProgress = 100,
  rarity = 'common',
  className,
}: AchievementCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const rarityStyle = rarityStyles[rarity];
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <Card
      variant={unlocked ? 'achievement' : 'default'}
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        unlocked && 'cursor-pointer hover:scale-105',
        unlocked && rarityStyle.border,
        unlocked && isHovered && `shadow-lg ${rarityStyle.glow}`,
        !unlocked && 'opacity-60 grayscale',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shimmer effect for unlocked achievements */}
      {unlocked && isHovered && (
        <div className="absolute inset-0 animate-shimmer" />
      )}

      <div className="relative p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'flex h-16 w-16 items-center justify-center rounded-xl text-4xl transition-transform duration-300',
            unlocked ? rarityStyle.bg : 'bg-secondary',
            isHovered && unlocked && 'scale-110'
          )}>
            {unlocked ? icon : '🔒'}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between">
              <h4 className="font-semibold leading-tight">{title}</h4>
              {rarity !== 'common' && unlocked && (
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  rarity === 'rare' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                  rarity === 'epic' && 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                  rarity === 'legendary' && 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                )}>
                  {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                </span>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>

            {/* Progress Bar (for locked achievements) */}
            {!unlocked && maxProgress > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{progress}/{maxProgress}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Unlocked Date */}
            {unlocked && unlockedAt && (
              <p className="text-xs text-muted-foreground">
                Unlocked {new Date(unlockedAt).toLocaleDateString('en-GB')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Celebration Effect */}
      {unlocked && isHovered && rarity === 'legendary' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${i * 0.1}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
