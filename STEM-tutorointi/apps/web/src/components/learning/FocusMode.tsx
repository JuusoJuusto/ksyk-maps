'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { cn } from '@/lib/utils';

interface FocusModeProps {
  onExit?: () => void;
  className?: string;
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const TIMER_DURATIONS = {
  focus: 25 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60, // 15 minutes
};

export function FocusMode({ onExit, className }: FocusModeProps) {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((TIMER_DURATIONS[mode] - timeLeft) / TIMER_DURATIONS[mode]) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    
    if (mode === 'focus') {
      setCompletedSessions(prev => prev + 1);
      setTotalFocusTime(prev => prev + TIMER_DURATIONS.focus);
      
      // Play completion sound (if available)
      if (typeof Audio !== 'undefined') {
        const audio = new Audio('/sounds/complete.mp3');
        audio.play().catch(() => {});
      }
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus Session Complete! 🎉', {
          body: 'Great work! Time for a break.',
          icon: '/icon.png',
        });
      }
      
      // Auto-switch to break
      const nextMode = completedSessions % 4 === 3 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeLeft(TIMER_DURATIONS[nextMode]);
    } else {
      // Break complete, switch to focus
      setMode('focus');
      setTimeLeft(TIMER_DURATIONS.focus);
    }
  }, [mode, completedSessions]);

  const handleStart = () => {
    setIsRunning(true);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_DURATIONS[mode]);
  };

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_DURATIONS[newMode]);
    setIsRunning(false);
  };

  const modeColors = {
    focus: 'from-blue-500 to-purple-600',
    shortBreak: 'from-green-500 to-emerald-600',
    longBreak: 'from-amber-500 to-orange-600',
  };

  const modeLabels = {
    focus: 'Focus Time',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  };

  const modeIcons = {
    focus: '🎯',
    shortBreak: '☕',
    longBreak: '🌴',
  };

  return (
    <div className={cn('min-h-screen bg-gradient-to-br', modeColors[mode], className)}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 text-white">
          <h1 className="text-2xl font-bold">Focus Mode</h1>
          <Button variant="ghost" onClick={onExit} className="text-white hover:bg-white/20">
            Exit
          </Button>
        </div>

        {/* Main Timer Card */}
        <Card variant="premium" className="p-8 mb-6">
          {/* Mode Selector */}
          <div className="flex gap-2 mb-8">
            {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  'flex-1 py-3 px-4 rounded-xl font-semibold transition-all',
                  mode === m
                    ? 'bg-gradient-to-r text-white shadow-lg scale-105'
                    : 'bg-secondary hover:bg-secondary/80',
                  mode === m && modeColors[m]
                )}
              >
                <span className="mr-2">{modeIcons[m]}</span>
                {modeLabels[m]}
              </button>
            ))}
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              {/* Circular Progress */}
              <svg className="w-64 h-64 transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-secondary"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={mode === 'focus' ? '#3b82f6' : mode === 'shortBreak' ? '#10b981' : '#f59e0b'} />
                    <stop offset="100%" stopColor={mode === 'focus' ? '#9333ea' : mode === 'shortBreak' ? '#059669' : '#ea580c'} />
                  </linearGradient>
                </defs>
              </svg>

              {/* Time Display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold tracking-tight">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {isRunning ? 'In Progress' : 'Paused'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center mb-6">
            {!isRunning ? (
              <Button
                variant="premium"
                size="xl"
                onClick={handleStart}
                className="min-w-[200px]"
              >
                <span className="text-xl mr-2">▶️</span>
                Start
              </Button>
            ) : (
              <Button
                variant="outline"
                size="xl"
                onClick={handlePause}
                className="min-w-[200px]"
              >
                <span className="text-xl mr-2">⏸️</span>
                Pause
              </Button>
            )}
            <Button variant="outline" size="xl" onClick={handleReset}>
              <span className="text-xl">↻</span>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-sm text-muted-foreground">Sessions</p>
              <p className="text-3xl font-bold">{completedSessions}</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-sm text-muted-foreground">Focus Time</p>
              <p className="text-3xl font-bold">{Math.floor(totalFocusTime / 60)}m</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-sm text-muted-foreground">Streak</p>
              <p className="text-3xl font-bold">{Math.floor(completedSessions / 4)}</p>
            </div>
          </div>
        </Card>

        {/* Tips */}
        <Card variant="elevated" className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>💡</span>
            Focus Tips
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Eliminate distractions before starting</li>
            <li>• Keep water nearby to stay hydrated</li>
            <li>• Take breaks seriously - they help you focus better</li>
            <li>• After 4 sessions, take a longer break</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
