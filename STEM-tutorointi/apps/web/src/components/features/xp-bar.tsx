'use client';

import { motion } from 'framer-motion';
import { Zap, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface XPBarProps {
  currentXP: number;
  level: number;
  totalXP: number;
  showDetails?: boolean;
}

export default function XPBar({ currentXP, level, totalXP, showDetails = true }: XPBarProps) {
  const xpForNextLevel = 100;
  const progress = (currentXP / xpForNextLevel) * 100;
  const xpNeeded = xpForNextLevel - currentXP;

  return (
    <div className="space-y-3">
      {/* Level Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
          >
            <span className="text-xl font-black text-white">{level}</span>
          </motion.div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Level</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {level}
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total XP</p>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {totalXP}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Progress to Level {level + 1}
          </span>
          <span className="font-bold text-gray-900 dark:text-white">
            {currentXP} / {xpForNextLevel} XP
          </span>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-3" />
          {progress > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-8 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded"
              style={{ left: `${Math.min(progress, 95)}%` }}
            >
              {currentXP} XP
            </motion.div>
          )}
        </div>
      </div>

      {/* XP Needed */}
      {showDetails && xpNeeded > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <TrendingUp className="w-4 h-4" />
          <span>
            {xpNeeded} XP needed to reach Level {level + 1}
          </span>
        </motion.div>
      )}
    </div>
  );
}
