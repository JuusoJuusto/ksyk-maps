'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button-premium';
import { Card } from '@/components/ui/card-premium';
import { cn } from '@/lib/utils';
import { useStartAssessment, useSubmitAssessment } from '@/lib/hooks/use-queries';

interface AssessmentStepProps {
  onNext: (data: any) => void;
  onBack?: () => void;
  data: any;
}

export function AssessmentStep({ onNext, onBack, data }: AssessmentStepProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  const startAssessment = useStartAssessment();
  const submitAssessment = useSubmitAssessment();

  useEffect(() => {
    // Start assessment when component mounts
    startAssessment.mutate(undefined, {
      onSuccess: (data) => {
        setAssessmentId(data.assessmentId);
        setQuestions(data.questions);
      },
    });
  }, []);

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Submit assessment
      if (assessmentId) {
        const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        }));

        submitAssessment.mutate(
          { assessmentId, answers: answerArray },
          {
            onSuccess: (result) => {
              onNext({
                assessmentResults: result.results,
              });
            },
          }
        );
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (startAssessment.isPending) {
    return (
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6"
        >
          <div className="text-6xl animate-bounce">🤖</div>
          <h2 className="text-3xl font-bold">Preparing Your Assessment...</h2>
          <p className="text-lg text-muted-foreground">
            Our AI is generating personalized questions based on your goals
          </p>
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-3xl font-bold">Unable to Generate Assessment</h2>
        <p className="text-lg text-muted-foreground">
          We encountered an issue. Let's skip this step for now.
        </p>
        <Button variant="premium" size="lg" onClick={() => onNext({})}>
          Continue Without Assessment
        </Button>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const hasAnswer = answers[question?.id];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-block"
        >
          <div className="text-5xl">🎯</div>
        </motion.div>
        <h2 className="text-3xl font-bold">Quick Skill Assessment</h2>
        <p className="text-lg text-muted-foreground">
          Help us understand your current level so we can personalize your learning
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card variant="premium" className="p-8">
          <div className="space-y-6">
            {/* Subject Badge */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {question.subject}
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary text-sm">
                {question.difficulty}
              </span>
            </div>

            {/* Question */}
            <div>
              <h3 className="text-2xl font-semibold mb-4">{question.question}</h3>
              {question.context && (
                <p className="text-muted-foreground">{question.context}</p>
              )}
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {question.options.map((option: any, index: number) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(question.id, option.value)}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    answers[question.id] === option.value
                      ? 'border-primary bg-primary/10 scale-[1.02]'
                      : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold',
                      answers[question.id] === option.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border'
                    )}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1">{option.label}</span>
                    {answers[question.id] === option.value && (
                      <div className="text-primary text-xl">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Confidence Slider */}
            {hasAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 border-t border-border"
              >
                <label className="text-sm font-medium mb-2 block">
                  How confident are you in this answer?
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Not sure</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    defaultValue="3"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">Very confident</span>
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={currentQuestion === 0 ? onBack : handlePrevious}
        >
          ← {currentQuestion === 0 ? 'Back' : 'Previous'}
        </Button>
        <Button
          variant="premium"
          size="lg"
          onClick={handleNext}
          disabled={!hasAnswer || submitAssessment.isPending}
        >
          {submitAssessment.isPending ? (
            <>Analyzing...</>
          ) : currentQuestion === questions.length - 1 ? (
            <>Complete Assessment →</>
          ) : (
            <>Next Question →</>
          )}
        </Button>
      </div>
    </div>
  );
}
