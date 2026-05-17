'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTasks, useGenerateTask, useSubmitAnswer } from '@/lib/hooks/use-queries';
import { Subject, TaskType } from '@/lib/prisma-types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface PracticeInterfaceProps {
  user: any;
}

export function PracticeInterface({ user }: PracticeInterfaceProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject>('MATHEMATICS');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    subject: selectedSubject,
    limit: 10,
  });
  const generateTask = useGenerateTask();
  const submitAnswer = useSubmitAnswer();

  const tasks = tasksData?.tasks || [];
  const currentTask = tasks[currentTaskIndex];

  const handleGenerateTask = async () => {
    try {
      await generateTask.mutateAsync({
        subject: selectedSubject,
        topic: 'General',
        difficulty: 5,
        type: 'OPEN_ENDED',
      });
    } catch (error) {
      console.error('Failed to generate task:', error);
    }
  };

  const handleGetHint = async () => {
    if (!currentTask) return;
    const hints = (currentTask.hints as Array<{ level: number; text: string }> | undefined);
    if (!hints || hints.length === 0) return;

    const nextHintIndex = Math.min(hintsUsed, hints.length - 1);
    setCurrentHint(hints[nextHintIndex].text);
    setHintsUsed((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    if (!currentTask || !answer.trim()) return;

    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 180;

    try {
      const submitResult = await submitAnswer.mutateAsync({
        taskId: currentTask.id,
        answer,
        timeSpent,
        hintsUsed,
      });

      setResult(submitResult);
      setShowResult(true);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handleNext = () => {
    setAnswer('');
    setShowResult(false);
    setResult(null);
    setHintsUsed(0);
    setCurrentHint(null);
    setStartTime(null);

    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      handleGenerateTask();
      setCurrentTaskIndex(0);
    }
  };

  const subjects: Subject[] = ['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY'];

  useEffect(() => {
    if (currentTask && !showResult) {
      setStartTime(Date.now());
    }
  }, [currentTaskIndex, currentTask, showResult]);

  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Practice 📝
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Master concepts through practice
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Subject Filter */}
          <div className="flex gap-2 mt-4">
            {subjects.map((subject) => (
              <Button
                key={subject}
                size="sm"
                variant={selectedSubject === subject ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedSubject(subject);
                  setCurrentTaskIndex(0);
                  setShowResult(false);
                }}
              >
                {subject}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {tasks.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              No tasks available
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Generate your first task to start practicing
            </p>
            <Button
              onClick={handleGenerateTask}
              disabled={generateTask.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {generateTask.isPending ? 'Generating...' : 'Generate Task'}
            </Button>
          </Card>
        ) : (
          <>
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Task {currentTaskIndex + 1} of {tasks.length}
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {Math.round(((currentTaskIndex + 1) / tasks.length) * 100)}%
                </span>
              </div>
              <Progress value={((currentTaskIndex + 1) / tasks.length) * 100} className="h-2" />
            </div>

            {/* Task Card */}
            <Card className="p-8 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-2">
                  <Badge variant="secondary">{currentTask.subject}</Badge>
                  <Badge variant="outline">{currentTask.type}</Badge>
                  <Badge variant="outline">Difficulty: {currentTask.difficulty}/10</Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    +{currentTask.xpReward} XP
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                {(currentTask.question as Record<string, unknown>)?.text || (currentTask.question as Record<string, unknown>)?.fi || currentTask.topic || 'Practice Task'}
              </h2>

              {((currentTask.question as Record<string, unknown>)?.latex as string) && (
                <div className="mb-4 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-mono text-center text-lg">
                  {(currentTask.question as Record<string, unknown>)?.latex as string}
                </div>
              )}

              {!showResult ? (
                <div className="space-y-4">
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter your answer..."
                    disabled={submitAnswer.isPending}
                    className="text-lg"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmit();
                      }
                    }}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSubmit}
                      disabled={!answer.trim() || submitAnswer.isPending}
                      className="bg-blue-600 text-white hover:bg-blue-700 flex-1"
                    >
                      {submitAnswer.isPending ? 'Checking...' : 'Submit Answer'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGetHint}
                      disabled={hintsUsed >= ((currentTask.hints as Array<unknown> | undefined)?.length || 0)}
                    >
                      Get Hint {hintsUsed > 0 && `(${hintsUsed})`}
                    </Button>
                  </div>
                  {currentHint && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        💡 {currentHint}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-6 rounded-xl border-2 ${
                  result?.isCorrect
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      result?.isCorrect
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}>
                      {result?.isCorrect ? (
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold mb-2 ${
                        result?.isCorrect
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-red-900 dark:text-red-100'
                      }`}>
                        {result?.isCorrect ? 'Correct! 🎉' : 'Not quite right'}
                      </h3>
                      <p className={`mb-4 ${
                        result?.isCorrect
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {result?.feedback}
                      </p>
                      {result?.isCorrect && (
                        <div className="flex items-center gap-4 text-sm font-medium">
                          <span className="text-green-900 dark:text-green-100">
                            +{result.xpEarned} XP
                          </span>
                          {result.leveledUp && (
                            <span className="text-green-900 dark:text-green-100">
                              🎊 Level Up! Now Level {result.newLevel}
                            </span>
                          )}
                        </div>
                      )}
                      <Button
                        onClick={handleNext}
                        className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Next Task
                        <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Tasks Completed
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {currentTaskIndex}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  XP Earned Today
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {result?.xpEarned || 0}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Accuracy
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {currentTaskIndex > 0 ? Math.round((currentTaskIndex / tasks.length) * 100) : 0}%
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
