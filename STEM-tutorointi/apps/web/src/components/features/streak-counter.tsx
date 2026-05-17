'use client';

import { motion } from 'framer-motion';
import { Flame, Calendar, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: Date;
}

export default function StreakCounter({
  currentStreak,
  longestStreak,
  lastActivityDate,
}: StreakCounterProps) {
  const isActiveToday = lastActivityDate
    ? new Date(lastActivityDate).toDateString() === new Date().toDateString()
    : false;

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'from-purple-500 to-pink-500';
    if (streak >= 14) return 'from-orange-500 to-red-500';
    if (streak >= 7) return 'from-yellow-500 to-orange-500';
    return 'from-blue-500 to-cyan-500';
  };

  const getStreakBadge = (streak: number) => {
    if (streak >= 30) return { label: 'Legendary', icon: '👑' };
    if (streak >= 14) return { label: 'On Fire', icon: '🔥' };
    if (streak >= 7) return { label: 'Hot Streak', icon: '⚡' };
    if (streak >= 3) return { label: 'Building', icon: '💪' };
    return { label: 'Getting Started', icon: '🌱' };
  };

  const badge = getStreakBadge(currentStreak);

  return (
    <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-gray-900 dark:text-white">
              Daily Streak
            </h3>
          </div>
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500">
            {badge.icon} {badge.label}
          </Badge>
        </div>

        {/* Current Streak */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br ${getStreakColor(
              currentStreak
            )} mb-3`}
          >
            <div className="text-center">
              <p className="text-5xl font-black text-white">{currentStreak}</p>
              <p className="text-sm text-white/90">days</p>
            </div>
          </motion.div>

          {isActiveToday ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium">Active today!</span>
            </motion.div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete a task to continue your streak
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {longestStreak}
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Longest Streak
            </p>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {currentStreak}
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Current Streak
            </p>
          </div>
        </div>

        {/* Streak Calendar Preview */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Last 7 days
          </p>
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => {
              const isActive = i < currentStreak;
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex-1 h-8 rounded ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-500 to-red-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
