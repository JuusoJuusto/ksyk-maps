'use client';

import { StreakDisplay } from '@/components/gamification/StreakDisplay';
import { XPDisplay } from '@/components/gamification/XPDisplay';
import { DailyQuests } from '@/components/gamification/DailyQuests';
import { PersonalizedFeed } from '@/components/feed/PersonalizedFeed';
import { AchievementCard } from '@/components/gamification/AchievementCard';
import { Card, StatCard } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { getSubjectColor } from '@/config/design-system';
import { 
  useUserStats, 
  useDailyProgress, 
  useDailyQuests, 
  usePersonalizedFeed,
  useTasks,
  useAchievements 
} from '@/lib/hooks/use-queries';
import { calculateLevelFromXP } from '@/config/constants';

interface MobileDashboardProps {
  user: any;
  tasks: any[];
  achievements: any[];
}

export function MobileDashboard({ user, tasks: initialTasks, achievements: initialAchievements }: MobileDashboardProps) {
  // Fetch real-time data
  const { data: stats } = useUserStats();
  const { data: dailyProgress } = useDailyProgress();
  const { data: questsData } = useDailyQuests();
  const { data: feedData } = usePersonalizedFeed();
  const { data: tasksData } = useTasks({ limit: 5 });
  const { data: achievementsData } = useAchievements();
  
  // Use real data or fallback to server-side data
  const currentXP = stats?.xp || user.xp?.totalXP || 0;
  const level = stats?.level || calculateLevelFromXP(currentXP);
  const xpForNextLevel = stats?.xpToNextLevel || (level * 1000);
  const currentStreak = stats?.streak || user.streaks?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || user.streaks?.longestStreak || 0;
  
  const dailyQuests = questsData?.quests || [];
  const feedItems = feedData?.items || [];
  const tasks = tasksData?.tasks || initialTasks;
  const achievements = achievementsData?.unlocked || initialAchievements;
  
  const tasksCompleted = dailyProgress?.tasksCompleted || 0;
  const studyTime = dailyProgress?.xpEarned ? `${(dailyProgress.xpEarned / 100).toFixed(1)}h` : '0h';

  return (
    <div className="lg:hidden">
      <div className="p-4 space-y-6">
        {/* Welcome Section with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-6 text-white animate-fade-in">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-lg opacity-90 mt-1">{user.name}</p>
            <p className="text-sm opacity-75 mt-2">
              🎯 Ready to crush your learning goals today?
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 text-9xl opacity-10">🚀</div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <StatCard
            label="Tasks Done"
            value={tasksCompleted}
            icon={<span className="text-2xl">✅</span>}
            trend="up"
            trendValue={`${tasksCompleted} today`}
          />
          <StatCard
            label="Study Time"
            value={studyTime}
            icon={<span className="text-2xl">⏱️</span>}
            trend="up"
            trendValue="Keep going!"
          />
        </div>

        {/* Streak Display */}
        <StreakDisplay
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          className="animate-fade-in"
        />

        {/* XP Display */}
        <XPDisplay
          currentXP={currentXP}
          level={level}
          xpForNextLevel={xpForNextLevel}
          className="animate-fade-in"
        />

        {/* Daily Quests */}
        {dailyQuests.length > 0 && (
          <DailyQuests
            quests={dailyQuests}
            className="animate-fade-in"
          />
        )}

        {/* Continue Learning - Swipeable Cards */}
        {tasks.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Continue Learning</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {tasks.map((task, index) => {
                const subjectColor = getSubjectColor(task.subject);
                return (
                  <Card
                    key={task.id}
                    variant="interactive"
                    padding="none"
                    className="min-w-[280px] animate-slide-in"
                  >
                    <div
                      className="h-2 rounded-t-2xl"
                      style={{ backgroundColor: subjectColor.primary }}
                    />
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold line-clamp-2">
                            {(task.question as any)?.text || task.topic}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.subject}
                          </p>
                        </div>
                        <span
                          className="rounded-full px-2 py-1 text-xs font-semibold text-white"
                          style={{ backgroundColor: subjectColor.primary }}
                        >
                          {task.level}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>⏱️ {Math.floor(task.estimatedTime / 60)} min</span>
                        <span>•</span>
                        <span>+{task.xpReward} XP</span>
                      </div>

                      <Button size="sm" variant="default" className="w-full">
                        Start Task
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Personalized Feed */}
        {feedItems.length > 0 && (
          <PersonalizedFeed
            items={feedItems}
            className="animate-fade-in"
          />
        )}

        {/* Achievements Grid */}
        {achievements.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Achievements</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {achievements.slice(0, 3).map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  title={achievement.name}
                  description={achievement.description}
                  icon={achievement.icon}
                  unlocked={true}
                  rarity={achievement.rarity.toLowerCase() as any}
                />
              ))}
            </div>
          </div>
        )}

        {/* Floating Action Button - AI Tutor */}
        <div className="fixed bottom-24 right-6 z-50 animate-bounce-in">
          <Button
            size="icon-lg"
            variant="premium"
            className="h-16 w-16 rounded-full shadow-2xl"
          >
            <span className="text-2xl">🤖</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
