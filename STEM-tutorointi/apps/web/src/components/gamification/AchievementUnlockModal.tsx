// ============================================
// STEM Genius - Achievement Unlock Modal
// Celebratory achievement unlock animation
// ============================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Share2, Download } from 'lucide-react';
import { Button } from '../ui/button-premium';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  unlockedAt: Date;
}

interface AchievementUnlockModalProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const rarityConfig = {
  common: {
    gradient: 'from-gray-400 to-gray-600',
    glow: 'shadow-gray-500/50',
    text: 'text-gray-600',
    bg: 'bg-gray-100 dark:bg-gray-900',
    border: 'border-gray-400',
  },
  rare: {
    gradient: 'from-blue-400 to-blue-600',
    glow: 'shadow-blue-500/50',
    text: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900',
    border: 'border-blue-400',
  },
  epic: {
    gradient: 'from-purple-400 to-purple-600',
    glow: 'shadow-purple-500/50',
    text: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900',
    border: 'border-purple-400',
  },
  legendary: {
    gradient: 'from-yellow-400 via-orange-500 to-red-600',
    glow: 'shadow-yellow-500/50',
    text: 'text-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    border: 'border-yellow-400',
  },
};

export function AchievementUnlockModal({
  achievement,
  onClose,
}: AchievementUnlockModalProps) {
  useEffect(() => {
    if (!achievement) return;

    // Trigger confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, [achievement]);

  if (!achievement) return null;

  const config = rarityConfig[achievement.rarity];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Achievement Unlocked: ${achievement.title}`,
        text: achievement.description,
        url: window.location.href,
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: 'spring', duration: 0.7 }}
          className="relative max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow Effect */}
          <div
            className={cn(
              'absolute inset-0 rounded-3xl blur-3xl opacity-50',
              config.bg
            )}
          />

          {/* Card */}
          <div className="relative bg-background border-2 border-border rounded-3xl overflow-hidden shadow-2xl">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className={cn('p-8 bg-gradient-to-br', config.gradient)}>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-white"
              >
                <Trophy className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Achievement Unlocked!</h2>
                <div className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-semibold uppercase tracking-wide">
                  {achievement.rarity}
                </div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="flex justify-center"
              >
                <div
                  className={cn(
                    'w-32 h-32 rounded-full bg-gradient-to-br flex items-center justify-center text-6xl shadow-2xl',
                    config.gradient,
                    config.glow
                  )}
                >
                  <motion.div
                    animate={{
                      rotate: [0, -10, 10, -10, 10, 0],
                      scale: [1, 1.1, 1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  >
                    {achievement.icon}
                  </motion.div>
                </div>
              </motion.div>

              {/* Title & Description */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center space-y-2"
              >
                <h3 className="text-2xl font-bold">{achievement.title}</h3>
                <p className="text-muted-foreground">{achievement.description}</p>
              </motion.div>

              {/* XP Reward */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: 'spring' }}
                className={cn(
                  'p-4 rounded-xl text-center border-2',
                  config.bg,
                  config.border
                )}
              >
                <div className={cn('text-3xl font-bold', config.text)}>
                  +{achievement.xpReward} XP
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Bonus Experience Points
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="flex gap-3"
              >
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // TODO: Implement download certificate
                    console.log('Download certificate');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </motion.div>

              {/* Continue Button */}
              <Button
                variant="premium"
                size="lg"
                className="w-full"
                onClick={onClose}
              >
                Continue Learning
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// ACHIEVEMENT TOAST
// Compact notification for achievement unlock
// ============================================

interface AchievementToastProps {
  achievement: Achievement;
  onView: () => void;
  onDismiss: () => void;
}

export function AchievementToast({
  achievement,
  onView,
  onDismiss,
}: AchievementToastProps) {
  const config = rarityConfig[achievement.rarity];

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed top-4 right-4 z-50 max-w-sm"
    >
      <div
        className={cn(
          'bg-background border-2 rounded-xl shadow-2xl overflow-hidden',
          config.border
        )}
      >
        <div className={cn('h-1 bg-gradient-to-r', config.gradient)} />
        <div className="p-4 flex items-center gap-4">
          {/* Icon */}
          <div
            className={cn(
              'w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-2xl shrink-0',
              config.gradient
            )}
          >
            {achievement.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Achievement Unlocked
            </div>
            <h4 className="font-semibold truncate">{achievement.title}</h4>
            <p className="text-xs text-muted-foreground">+{achievement.xpReward} XP</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            <button
              onClick={onView}
              className="text-xs text-primary hover:underline"
            >
              View
            </button>
            <button
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
