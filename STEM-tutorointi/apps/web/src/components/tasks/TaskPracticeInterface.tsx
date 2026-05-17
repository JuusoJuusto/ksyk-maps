// ============================================
// STEM Genius - Task Practice Interface
// Advanced task solving with timer, hints, and AI help
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '../ui/card-premium';
import { Button } from '../ui/button-premium';
import {
  Clock,
  Lightbulb,
  Sparkles,
  Check,
  X,
  Flag,
  RotateCcw,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/lib/store';
import { useSubmitAnswer } from '@/lib/hooks/use-queries';
import { Subject, TaskType } from '@/lib/prisma-types';
import { getSubjectColor } from '@/config/design-system';

interface Task {
  id: string;
  subject: Subject;
  type: TaskType;
  difficulty: number;
  question: {
    text: string;
    latex?: string;
    images?: string[];
  };
  hints: Array<{
    level: number;
    text: string;
  }>;
  estimatedTime: number;
  xpReward: number;
}

interface TaskPracticeInterfaceProps {
  task: Task;
  onComplete?: (result: { isCorrect: boolean; xpEarned: number }) => void;
  onSkip?: () => void;
  className?: string;
}

export function TaskPracticeInterface({
  task,
  onComplete,
  onSkip,
  className,
}: TaskPracticeInterfaceProps) {
  const [answer, setAnswer] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [currentHintLevel, setCurrentHintLevel] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showAIHelp, setShowAIHelp] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { hintsUsed, incrementHints } = useTaskStore();
  const submitAnswerMutation = useSubmitAnswer();
  const subjectColor = getSubjectColor(task.subject);

  // Timer
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle hint request
  const handleRequestHint = () => {
    if (currentHintLevel < task.hints.length) {
      setCurrentHintLevel((prev) => prev + 1);
      incrementHints();
      setShowHints(true);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!answer.trim()) return;

    setIsTimerRunning(false);

    try {
      const result = await submitAnswerMutation.mutateAsync({
        taskId: task.id,
        answer,
      });

      setFeedback({
        type: result.isCorrect ? 'success' : 'error',
        message: result.feedback,
      });

      if (result.isCorrect) {
        setTimeout(() => {
          onComplete?.(result);
        }, 2000);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: 'Failed to submit answer. Please try again.',
      });
    }
  };

  // Handle reset
  const handleReset = () => {
    setAnswer('');
    setFeedback(null);
    setTimeElapsed(0);
    setIsTimerRunning(true);
    setCurrentHintLevel(0);
    setShowHints(false);
  };

  // Calculate XP penalty for hints
  const xpPenalty = hintsUsed * 10;
  const finalXP = Math.max(task.xpReward - xpPenalty, task.xpReward * 0.5);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card
        variant="premium"
        className="overflow-hidden"
        style={{
          borderTop: `4px solid ${subjectColor.primary}`,
        }}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            {/* Subject Badge */}
            <div
              className="px-4 py-2 rounded-full text-white font-semibold text-sm"
              style={{ backgroundColor: subjectColor.primary }}
            >
              {task.subject}
            </div>

            {/* Timer */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg">{formatTime(timeElapsed)}</span>
                <span className="text-xs">/ {task.estimatedTime}m</span>
              </div>

              {/* XP Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-950 rounded-full">
                <span className="text-amber-700 dark:text-amber-400 font-bold">
                  +{Math.floor(finalXP)} XP
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Question */}
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-xl font-semibold mb-4">Question:</h3>
            <p className="text-lg leading-relaxed">{task.question.text}</p>
            {task.question.latex && (
              <div className="my-4 p-4 bg-secondary rounded-lg font-mono text-center">
                {task.question.latex}
              </div>
            )}
          </div>

          {/* Answer Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">
              Your Answer:
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full min-h-[120px] p-4 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none resize-none text-lg"
              disabled={!!feedback}
            />
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'p-4 rounded-xl flex items-start gap-3',
                  feedback.type === 'success'
                    ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200'
                )}
              >
                {feedback.type === 'success' ? (
                  <Check className="w-6 h-6 shrink-0" />
                ) : (
                  <X className="w-6 h-6 shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">
                    {feedback.type === 'success' ? 'Correct!' : 'Not quite right'}
                  </h4>
                  <p className="text-sm">{feedback.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!feedback ? (
              <>
                <Button
                  variant="premium"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!answer.trim() || submitAnswerMutation.isPending}
                  className="flex-1"
                >
                  {submitAnswerMutation.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                      </motion.div>
                      Checking...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Submit Answer
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRequestHint}
                  disabled={currentHintLevel >= task.hints.length}
                >
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Hint ({currentHintLevel}/{task.hints.length})
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowAIHelp(true)}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Ask AI
                </Button>

                <Button variant="ghost" size="lg" onClick={onSkip}>
                  <Flag className="w-5 h-5 mr-2" />
                  Skip
                </Button>
              </>
            ) : (
              <>
                {feedback.type === 'error' && (
                  <Button variant="outline" size="lg" onClick={handleReset}>
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Try Again
                  </Button>
                )}
                <Button
                  variant="premium"
                  size="lg"
                  onClick={() => onComplete?.(feedback as any)}
                  className="flex-1"
                >
                  Continue
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hints Panel */}
      <AnimatePresence>
        {showHints && currentHintLevel > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card variant="elevated" className="bg-amber-50 dark:bg-amber-950/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    Hints
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.hints.slice(0, currentHintLevel).map((hint, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        #{index + 1}
                      </span>
                      <p className="text-sm flex-1">{hint.text}</p>
                    </div>
                  </motion.div>
                ))}
                {currentHintLevel < task.hints.length && (
                  <p className="text-xs text-muted-foreground text-center">
                    💡 Using hints reduces XP reward by 10 per hint
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Help Modal */}
      {showAIHelp && (
        <Card variant="premium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">AI Tutor</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAIHelp(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ask the AI tutor for help with this problem. The AI will guide you without
              giving away the answer.
            </p>
            <Button variant="premium" className="w-full">
              <MessageCircle className="w-4 h-4 mr-2" />
              Open AI Chat
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
