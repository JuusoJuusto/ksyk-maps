'use client';

import { StreakDisplay } from '@/components/gamification/StreakDisplay';
import { XPDisplay } from '@/components/gamification/XPDisplay';
import { DailyQuests } from '@/components/gamification/DailyQuests';
import { PersonalizedFeed } from '@/components/feed/PersonalizedFeed';
import { AchievementCard } from '@/components/gamification/AchievementCard';
import { Card, StatCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card-premium';
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

interface DesktopDashboardProps {
  user: any;
  tasks: any[];
  achievements: any[];
}

export function DesktopDashboard({ user, tasks: initialTasks, achievements: initialAchievements }: DesktopDashboardProps) {
  // Fetch real-time data
  const { data: stats } = useUserStats();
  const { data: dailyProgress } = useDailyProgress();
  const { data: questsData } = useDailyQuests();
  const { data: feedData } = usePersonalizedFeed();
  const { data: tasksData } = useTasks({ limit: 5 });
  const { data: achievementsData } = useAchievements();
  
  // Use real data or fallback to server-side data
  const dailyQuests = questsData?.quests || [];
  const feedItems = feedData?.items || [];
  
  const currentXP = stats?.xp || user.xp?.[0]?.totalXP || 0;
  const level = stats?.level || calculateLevelFromXP(currentXP);
  const xpForNextLevel = stats?.xpToNextLevel || (level * 1000);
  const currentStreak = stats?.streak || user.streaks?.[0]?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || user.streaks?.[0]?.longestStreak || 0;
  
  const tasks = tasksData?.tasks || initialTasks;
  const achievements = achievementsData?.unlocked || initialAchievements;
  
  const tasksCompleted = dailyProgress?.tasksCompleted || 0;
  const tasksThisWeek = dailyProgress?.xpEarned ? Math.floor(dailyProgress.xpEarned / 100) : 0;

  return (
    <div className="hidden lg:block">
      <div className="container mx-auto px-6 py-8 max-w-7xl space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Welcome back, {user.name}!</h1>
            <p className="text-lg text-muted-foreground mt-2">
              🚀 Let's make today count. You're doing amazing!
            </p>
          </div>
          <Button variant="premium" size="lg">
            <span className="mr-2">🤖</span>
            AI Study Coach
          </Button>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <StatCard
            label="Total XP"
            value={currentXP.toLocaleString()}
            icon={<span className="text-2xl">⚡</span>}
            trend="up"
            trendValue={`+${dailyProgress?.xpEarned || 0} today`}
          />
          <StatCard
            label="Current Level"
            value={level}
            icon={<span className="text-2xl">🎯</span>}
            trend="up"
            trendValue="Level up soon!"
          />
          <StatCard
            label="Study Streak"
            value={`${currentStreak} days`}
            icon={<span className="text-2xl">🔥</span>}
            trend="up"
            trendValue="Keep it going!"
          />
          <StatCard
            label="Tasks Completed"
            value={tasksCompleted}
            icon={<span className="text-2xl">✅</span>}
            trend="up"
            trendValue={`+${tasksThisWeek} this week`}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Feed & Tasks */}
          <div className="col-span-2 space-y-6">
            {/* Personalized Feed */}
            <PersonalizedFeed items={feedItems} className="animate-fade-in" />

            {/* Continue Learning */}
            <Card variant="elevated" className="animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Continue Learning</CardTitle>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks.slice(0, 4).map((task, index) => {
                  const subjectColor = getSubjectColor(task.subject);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer animate-slide-in"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: subjectColor.primary }}
                      >
                        {task.subject.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {task.subject} • {task.difficulty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          +{task.xpReward || 100} XP
                        </p>
                        <Button size="sm" variant="outline" className="mt-2">
                          Start
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card variant="elevated" className="animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Achievements</CardTitle>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {achievements.slice(0, 4).map((achievement, index) => (
                  <AchievementCard
                    key={achievement.id}
                    title={achievement.title}
                    description={achievement.description}
                    icon={achievement.icon}
                    unlocked={true}
                    rarity={index === 0 ? 'legendary' : index === 1 ? 'epic' : 'rare'}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Gamification */}
          <div className="space-y-6">
            {/* XP Display */}
            <XPDisplay
              currentXP={currentXP}
              level={level}
              xpForNextLevel={xpForNextLevel}
              className="animate-fade-in"
            />

            {/* Streak Display */}
            <StreakDisplay
              currentStreak={currentStreak}
              longestStreak={longestStreak}
              className="animate-fade-in"
            />

            {/* Daily Quests */}
            <DailyQuests
              quests={dailyQuests}
              className="animate-fade-in"
            />

            {/* Quick Actions */}
            <Card variant="elevated" className="animate-fade-in">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="math" className="w-full justify-start" size="lg">
                  <span className="mr-2">📐</span>
                  Practice Math
                </Button>
                <Button variant="physics" className="w-full justify-start" size="lg">
                  <span className="mr-2">⚛️</span>
                  Study Physics
                </Button>
                <Button variant="chemistry" className="w-full justify-start" size="lg">
                  <span className="mr-2">🧪</span>
                  Learn Chemistry
                </Button>
                <Button variant="astronomy" className="w-full justify-start" size="lg">
                  <span className="mr-2">🌟</span>
                  Explore Astronomy
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
