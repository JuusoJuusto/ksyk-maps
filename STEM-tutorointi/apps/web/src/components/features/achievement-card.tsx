'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AchievementCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

export default function AchievementCard({
  name,
  description,
  icon: Icon,
  unlocked,
  unlockedAt,
  progress = 0,
  maxProgress = 100,
}: AchievementCardProps) {
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: unlocked ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card
        className={`backdrop-blur-sm ${
          unlocked
            ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-500'
            : 'bg-white/80 dark:bg-gray-800/80 opacity-60'
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <motion.div
              animate={unlocked ? { rotate: [0, -10, 10, -10, 0] } : {}}
              transition={{ duration: 0.5 }}
              className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                unlocked
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <Icon
                className={`w-8 h-8 ${
                  unlocked ? 'text-white' : 'text-gray-400'
                }`}
              />
            </motion.div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {name}
                </h3>
                {unlocked ? (
                  <Badge className="bg-green-500">Unlocked</Badge>
                ) : (
                  <Badge variant="outline">Locked</Badge>
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {description}
              </p>

              {/* Progress Bar (for locked achievements) */}
              {!unlocked && maxProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Progress</span>
                    <span>
                      {progress} / {maxProgress}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                    />
                  </div>
                </div>
              )}

              {/* Unlocked Date */}
              {unlocked && unlockedAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Unlocked on {new Date(unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
