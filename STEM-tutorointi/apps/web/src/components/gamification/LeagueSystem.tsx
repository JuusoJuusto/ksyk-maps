// ============================================
// STEM Genius - League System
// Competitive leagues inspired by Duolingo
// ============================================

'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card-premium';
import { Trophy, TrendingUp, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeagueEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  isCurrentUser?: boolean;
}

interface LeagueSystemProps {
  currentLeague: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
  entries: LeagueEntry[];
  userRank: number;
  xpToNextLeague: number;
  className?: string;
}

const leagueConfig = {
  bronze: {
    name: 'Bronze League',
    color: 'from-amber-700 to-amber-900',
    icon: '🥉',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
  },
  silver: {
    name: 'Silver League',
    color: 'from-gray-400 to-gray-600',
    icon: '🥈',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
  },
  gold: {
    name: 'Gold League',
    color: 'from-yellow-400 to-yellow-600',
    icon: '🥇',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
  },
  platinum: {
    name: 'Platinum League',
    color: 'from-cyan-400 to-cyan-600',
    icon: '💎',
    textColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
  },
  diamond: {
    name: 'Diamond League',
    color: 'from-blue-400 to-blue-600',
    icon: '💠',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  master: {
    name: 'Master League',
    color: 'from-purple-400 to-purple-600',
    icon: '👑',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
};

export function LeagueSystem({
  currentLeague,
  entries,
  userRank,
  xpToNextLeague,
  className,
}: LeagueSystemProps) {
  const config = leagueConfig[currentLeague];

  return (
    <Card variant="premium" className={cn('overflow-hidden', className)}>
      {/* League Header */}
      <div className={cn('p-6 bg-gradient-to-br', config.color)}>
        <div className="flex items-center justify-between text-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">{config.icon}</span>
              <h3 className="text-xl font-bold">{config.name}</h3>
            </div>
            <p className="text-sm opacity-90">
              Your rank: #{userRank} • {xpToNextLeague} XP to next league
            </p>
          </div>
          <Trophy className="w-12 h-12 opacity-50" />
        </div>
      </div>

      <CardContent className="p-0">
        {/* Promotion/Demotion Zones */}
        <div className="grid grid-cols-3 text-center text-xs border-b border-border">
          <div className="p-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400">
            <TrendingUp className="w-4 h-4 mx-auto mb-1" />
            <span>Top 10 Promote</span>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
            <Zap className="w-4 h-4 mx-auto mb-1" />
            <span>Safe Zone</span>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 rotate-180" />
            <span>Bottom 5 Demote</span>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {entries.map((entry, index) => {
            const isPromotion = entry.rank <= 10;
            const isDemotion = entry.rank > entries.length - 5;
            const isTop3 = entry.rank <= 3;

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors',
                  entry.isCurrentUser && 'bg-primary/10 border-l-4 border-primary',
                  isPromotion && !entry.isCurrentUser && 'bg-green-50/50 dark:bg-green-950/20',
                  isDemotion && !entry.isCurrentUser && 'bg-red-50/50 dark:bg-red-950/20'
                )}
              >
                {/* Rank */}
                <div className="w-12 text-center">
                  {isTop3 ? (
                    <span className="text-2xl">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {entry.avatar || entry.name.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-semibold', entry.isCurrentUser && 'text-primary')}>
                      {entry.name}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        You
                      </span>
                    )}
                    {entry.rank === 1 && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>

                {/* XP */}
                <div className="text-right">
                  <div className="font-bold text-primary">{entry.xp.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* League Info */}
        <div className="p-4 bg-secondary/30 text-center text-sm text-muted-foreground">
          <p>
            🏆 Compete with other learners! Top 10 advance, bottom 5 drop.
          </p>
          <p className="mt-1">League resets every Monday at 00:00 UTC</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// LEAGUE BADGE
// ============================================

interface LeagueBadgeProps {
  league: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function LeagueBadge({ league, size = 'md', showLabel = true }: LeagueBadgeProps) {
  const config = leagueConfig[league];

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded-full bg-gradient-to-br flex items-center justify-center',
          config.color,
          sizeClasses[size]
        )}
      >
        <span>{config.icon}</span>
      </div>
      {showLabel && (
        <div>
          <div className={cn('font-semibold', config.textColor)}>{config.name}</div>
        </div>
      )}
    </div>
  );
}
