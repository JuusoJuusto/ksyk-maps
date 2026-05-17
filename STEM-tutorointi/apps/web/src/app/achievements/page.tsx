'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAchievements } from '@/lib/hooks/use-queries';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function AchievementsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const { data: achievementsData, isLoading: achievementsLoading } = useAchievements();

  const isLoading = authLoading || achievementsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const unlocked = achievementsData?.unlocked || [];
  const locked = achievementsData?.locked || [];
  const progress = achievementsData?.progress || {};

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'EPIC':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'RARE':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      default:
        return 'bg-gradient-to-r from-neutral-400 to-neutral-500';
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'EPIC':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'RARE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Achievements 🏆
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                {unlocked.length} of {unlocked.length + locked.length} unlocked
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card className="p-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Total
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                {unlocked.length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Legendary
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {unlocked.filter((a: any) => a.rarity === 'LEGENDARY').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Epic
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {unlocked.filter((a: any) => a.rarity === 'EPIC').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Rare
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {unlocked.filter((a: any) => a.rarity === 'RARE').length}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Unlocked Achievements */}
        {unlocked.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
              Unlocked
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {unlocked.map((achievement: any) => (
                <Card
                  key={achievement.id}
                  className="p-6 relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 ${getRarityColor(achievement.rarity)}`} />
                  
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl flex-shrink-0">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-neutral-900 dark:text-white">
                          {achievement.name}
                        </h3>
                        <Badge className={getRarityBadgeColor(achievement.rarity)}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        {achievement.description}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span className="font-medium text-orange-600">
                          +{achievement.xpReward} XP
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {locked.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
              Locked
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {locked.map((achievement: any) => (
                <Card
                  key={achievement.id}
                  className="p-6 relative overflow-hidden opacity-60"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-300 dark:bg-neutral-700" />
                  
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-3xl flex-shrink-0 grayscale">
                      🔒
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-neutral-900 dark:text-white">
                          {achievement.name}
                        </h3>
                        <Badge variant="outline">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        {achievement.description}
                      </p>
                      {progress[achievement.id] !== undefined && (
                        <div className="mb-2">
                          <Progress value={progress[achievement.id]} className="h-2" />
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {progress[achievement.id]}% complete
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span className="font-medium text-neutral-400">
                          +{achievement.xpReward} XP
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
