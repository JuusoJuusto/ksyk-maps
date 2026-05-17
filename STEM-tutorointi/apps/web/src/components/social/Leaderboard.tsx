'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  streak: number;
  tasksCompleted: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  className?: string;
}

type LeaderboardFilter = 'global' | 'friends' | 'school' | 'class';
type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'allTime';

export function Leaderboard({ entries, currentUserRank, className }: LeaderboardProps) {
  const [filter, setFilter] = useState<LeaderboardFilter>('global');
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-amber-400 to-yellow-500';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-blue-400 to-purple-500';
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <Card variant="elevated">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {(['global', 'friends', 'school', 'class'] as LeaderboardFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all',
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Period Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {(['daily', 'weekly', 'monthly', 'allTime'] as LeaderboardPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                    period === p
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p === 'allTime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-3">
        {entries.slice(0, 3).map((entry, index) => {
          const positions = [1, 0, 2]; // Center, Left, Right
          const actualIndex = positions[index];
          const actualEntry = entries[actualIndex];
          
          return (
            <Card
              key={actualEntry.id}
              variant="premium"
              className={cn(
                'relative overflow-hidden',
                actualIndex === 0 && 'col-start-2 row-start-1'
              )}
            >
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-10',
                  getRankColor(actualEntry.rank)
                )}
              />
              <CardContent className="relative p-4 text-center">
                <div className="text-4xl mb-2">{getRankEmoji(actualEntry.rank)}</div>
                <div
                  className={cn(
                    'w-16 h-16 mx-auto rounded-full bg-gradient-to-br flex items-center justify-center text-2xl mb-2',
                    getRankColor(actualEntry.rank)
                  )}
                >
                  {actualEntry.avatar || '👤'}
                </div>
                <h4 className="font-semibold text-sm truncate">{actualEntry.name}</h4>
                <p className="text-xs text-muted-foreground">Level {actualEntry.level}</p>
                <p className="text-lg font-bold mt-2">{actualEntry.xp.toLocaleString()} XP</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Leaderboard List */}
      <Card variant="premium">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rankings</CardTitle>
            {currentUserRank && currentUserRank > 10 && (
              <span className="text-sm text-muted-foreground">
                You're #{currentUserRank}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.slice(3).map((entry, index) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all animate-fade-in',
                entry.isCurrentUser
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-secondary hover:bg-secondary/80'
              )}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                <span className="font-bold text-muted-foreground">
                  #{entry.rank}
                </span>
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">
                {entry.avatar || '👤'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">
                  {entry.name}
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-xs text-primary">(You)</span>
                  )}
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Level {entry.level}</span>
                  <span>•</span>
                  <span>{entry.tasksCompleted} tasks</span>
                  {entry.streak > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        🔥 {entry.streak}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* XP */}
              <div className="text-right">
                <p className="font-bold">{entry.xp.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>

              {/* Action */}
              {!entry.isCurrentUser && (
                <Button variant="ghost" size="sm">
                  Challenge
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Your Stats */}
      {currentUserRank && (
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-3xl font-bold">#{currentUserRank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next Rank</p>
                <p className="text-lg font-semibold">+{Math.floor(Math.random() * 500 + 100)} XP</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: '65%' }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
