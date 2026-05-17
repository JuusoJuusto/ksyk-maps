// ============================================
// STEM Genius - Activity Heatmap
// GitHub-style contribution graph
// ============================================

'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card-premium';
import { cn } from '@/lib/utils';
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns';

interface ActivityData {
  date: Date;
  count: number;
  xp: number;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
  weeks?: number;
  className?: string;
}

export function ActivityHeatmap({ data, weeks = 26, className }: ActivityHeatmapProps) {
  // Generate grid of dates
  const today = new Date();
  const startDate = subDays(today, weeks * 7);
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday

  const grid: Date[][] = [];
  let currentDate = weekStart;

  // Generate weeks
  for (let week = 0; week < weeks; week++) {
    const weekDays: Date[] = [];
    for (let day = 0; day < 7; day++) {
      weekDays.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    grid.push(weekDays);
  }

  // Get activity for a specific date
  const getActivity = (date: Date): ActivityData | undefined => {
    return data.find((activity) => isSameDay(activity.date, date));
  };

  // Get color intensity based on activity count
  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-secondary';
    if (count <= 2) return 'bg-green-200 dark:bg-green-900';
    if (count <= 5) return 'bg-green-400 dark:bg-green-700';
    if (count <= 10) return 'bg-green-600 dark:bg-green-500';
    return 'bg-green-800 dark:bg-green-300';
  };

  // Calculate stats
  const totalDays = data.filter((d) => d.count > 0).length;
  const totalTasks = data.reduce((sum, d) => sum + d.count, 0);
  const totalXP = data.reduce((sum, d) => sum + d.xp, 0);
  const currentStreak = calculateCurrentStreak(data);
  const longestStreak = calculateLongestStreak(data);

  return (
    <Card variant="premium" className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Activity Overview</CardTitle>
          <div className="text-sm text-muted-foreground">
            {totalDays} days active
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{totalTasks}</div>
            <div className="text-xs text-muted-foreground">Tasks Completed</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{totalXP.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total XP</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">🔥 {currentStreak}</div>
            <div className="text-xs text-muted-foreground">Current Streak</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">⭐ {longestStreak}</div>
            <div className="text-xs text-muted-foreground">Longest Streak</div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="flex gap-1 mb-2 ml-8">
              {getMonthLabels(grid).map((month, index) => (
                <div
                  key={index}
                  className="text-xs text-muted-foreground"
                  style={{ width: `${month.weeks * 12}px` }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-2">
                <div className="h-3"></div>
                <div className="h-3">Mon</div>
                <div className="h-3"></div>
                <div className="h-3">Wed</div>
                <div className="h-3"></div>
                <div className="h-3">Fri</div>
                <div className="h-3"></div>
              </div>

              {/* Weeks */}
              {grid.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((date, dayIndex) => {
                    const activity = getActivity(date);
                    const count = activity?.count || 0;
                    const xp = activity?.xp || 0;
                    const isFuture = date > today;

                    return (
                      <motion.div
                        key={dayIndex}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (weekIndex * 7 + dayIndex) * 0.002 }}
                        className="group relative"
                      >
                        <div
                          className={cn(
                            'w-3 h-3 rounded-sm transition-all cursor-pointer',
                            isFuture ? 'bg-secondary/30' : getIntensity(count),
                            'hover:ring-2 hover:ring-primary hover:scale-110'
                          )}
                        />

                        {/* Tooltip */}
                        {!isFuture && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                              <div className="font-semibold">{format(date, 'MMM d, yyyy')}</div>
                              <div className="text-muted-foreground">
                                {count} {count === 1 ? 'task' : 'tasks'} • {xp} XP
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-secondary" />
            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
            <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
            <div className="w-3 h-3 rounded-sm bg-green-800 dark:bg-green-300" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to calculate current streak
function calculateCurrentStreak(data: ActivityData[]): number {
  const sortedData = [...data].sort((a, b) => b.date.getTime() - a.date.getTime());
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedData.length; i++) {
    const date = new Date(sortedData[i].date);
    date.setHours(0, 0, 0, 0);
    const expectedDate = subDays(today, i);
    expectedDate.setHours(0, 0, 0, 0);

    if (isSameDay(date, expectedDate) && sortedData[i].count > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Helper function to calculate longest streak
function calculateLongestStreak(data: ActivityData[]): number {
  const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const activity of sortedData) {
    if (activity.count === 0) {
      currentStreak = 0;
      lastDate = null;
      continue;
    }

    if (lastDate === null) {
      currentStreak = 1;
    } else {
      const daysDiff = Math.floor(
        (activity.date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }

    maxStreak = Math.max(maxStreak, currentStreak);
    lastDate = activity.date;
  }

  return maxStreak;
}

// Helper function to get month labels
function getMonthLabels(grid: Date[][]): Array<{ label: string; weeks: number }> {
  const months: Array<{ label: string; weeks: number }> = [];
  let currentMonth = '';
  let weekCount = 0;

  for (const week of grid) {
    const monthLabel = format(week[0], 'MMM');
    if (monthLabel !== currentMonth) {
      if (currentMonth) {
        months.push({ label: currentMonth, weeks: weekCount });
      }
      currentMonth = monthLabel;
      weekCount = 1;
    } else {
      weekCount++;
    }
  }

  if (currentMonth) {
    months.push({ label: currentMonth, weeks: weekCount });
  }

  return months;
}
