'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card-premium';
import { getSubjectColor } from '@/config/design-system';
import { cn } from '@/lib/utils';

interface SubjectProgress {
  subject: string;
  mastery: number; // 0-100
  tasksCompleted: number;
  totalTasks: number;
  weakTopics: string[];
  strongTopics: string[];
  timeSpent: number; // minutes
  trend: 'up' | 'down' | 'stable';
}

interface ProgressDashboardProps {
  subjects: SubjectProgress[];
  className?: string;
}

export function ProgressDashboard({ subjects, className }: ProgressDashboardProps) {
  const totalTimeSpent = subjects.reduce((sum, s) => sum + s.timeSpent, 0);
  const averageMastery = subjects.reduce((sum, s) => sum + s.mastery, 0) / subjects.length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Overall Mastery</p>
            <p className="text-4xl font-bold">{Math.round(averageMastery)}%</p>
            <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${averageMastery}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Study Time</p>
            <p className="text-4xl font-bold">{Math.floor(totalTimeSpent / 60)}h</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTimeSpent % 60}m this week
            </p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Tasks Done</p>
            <p className="text-4xl font-bold">
              {subjects.reduce((sum, s) => sum + s.tasksCompleted, 0)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              ↑ +12 this week
            </p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Subjects</p>
            <p className="text-4xl font-bold">{subjects.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {subjects.filter(s => s.mastery >= 70).length} mastered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Breakdown */}
      <Card variant="premium">
        <CardHeader>
          <CardTitle>Subject Mastery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjects.map((subject, index) => {
            const subjectColor = getSubjectColor(subject.subject);
            const masteryLevel = 
              subject.mastery >= 80 ? 'Expert' :
              subject.mastery >= 60 ? 'Advanced' :
              subject.mastery >= 40 ? 'Intermediate' :
              'Beginner';

            return (
              <div
                key={subject.subject}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: subjectColor.primary }}
                    >
                      {subject.subject.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{subject.subject}</h4>
                      <p className="text-xs text-muted-foreground">
                        {subject.tasksCompleted}/{subject.totalTasks} tasks • {subject.timeSpent}m
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{subject.mastery}%</p>
                    <p className="text-xs text-muted-foreground">{masteryLevel}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${subject.mastery}%`,
                      backgroundColor: subjectColor.primary,
                    }}
                  />
                  <div className="absolute inset-0 animate-shimmer" />
                </div>

                {/* Weak/Strong Topics */}
                <div className="mt-3 flex gap-4 text-xs">
                  {subject.weakTopics.length > 0 && (
                    <div className="flex-1">
                      <p className="text-muted-foreground mb-1">Needs Work:</p>
                      <div className="flex flex-wrap gap-1">
                        {subject.weakTopics.slice(0, 2).map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 rounded-md bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {subject.strongTopics.length > 0 && (
                    <div className="flex-1">
                      <p className="text-muted-foreground mb-1">Strong:</p>
                      <div className="flex flex-wrap gap-1">
                        {subject.strongTopics.slice(0, 2).map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 rounded-md bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Weekly Activity Chart */}
      <Card variant="premium">
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const activity = Math.random() * 100; // Replace with real data
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-12">{day}</span>
                  <div className="flex-1 h-8 bg-secondary rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${activity}%` }}
                    >
                      {activity > 20 && (
                        <span className="text-xs font-semibold text-white">
                          {Math.round(activity)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Learning Insights */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-semibold text-sm">Peak Performance Time</p>
              <p className="text-sm text-muted-foreground">
                You learn best between 2-4 PM. Schedule difficult topics during this window.
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-sm">Attention Needed</p>
              <p className="text-sm text-muted-foreground">
                Your physics mastery dropped 5% this week. Consider reviewing mechanics.
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-semibold text-sm">On Track</p>
              <p className="text-sm text-muted-foreground">
                You're 85% ready for your chemistry exam. Keep up the great work!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
