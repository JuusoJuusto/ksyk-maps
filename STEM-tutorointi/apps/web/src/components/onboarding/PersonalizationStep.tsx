'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button-premium';
import { Card } from '@/components/ui/card-premium';
import { useCompleteOnboarding } from '@/lib/hooks/use-queries';
import { getSubjectColor } from '@/config/design-system';

interface PersonalizationStepProps {
  onNext: (data: any) => void;
  onBack?: () => void;
  data: any;
}

export function PersonalizationStep({ onNext, onBack, data }: PersonalizationStepProps) {
  const completeOnboarding = useCompleteOnboarding();

  const results = data.assessmentResults || {
    estimatedLevel: 5,
    strengths: ['Problem Solving', 'Logical Thinking'],
    weaknesses: ['Advanced Calculus', 'Quantum Physics'],
    recommendations: [
      'Start with intermediate algebra to build confidence',
      'Practice physics fundamentals daily',
      'Use visual learning tools for chemistry',
    ],
  };

  const handleComplete = () => {
    completeOnboarding.mutate(
      {
        goals: data.goals || [],
        subjects: data.subjects || [],
        studyTime: data.studyTime || 30,
      },
      {
        onSuccess: () => {
          onNext({});
        },
      }
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-4"
      >
        <div className="text-6xl">🎉</div>
        <h2 className="text-4xl font-bold">Your Personalized Learning Plan is Ready!</h2>
        <p className="text-lg text-muted-foreground">
          Based on your assessment, we've created a custom roadmap just for you
        </p>
      </motion.div>

      {/* Level Badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center"
      >
        <Card variant="premium" className="inline-block p-8 text-center">
          <div className="space-y-2">
            <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Level {results.estimatedLevel}
            </div>
            <p className="text-sm text-muted-foreground">Your Starting Level</p>
          </div>
        </Card>
      </motion.div>

      {/* Strengths & Weaknesses */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid md:grid-cols-2 gap-6"
      >
        {/* Strengths */}
        <Card variant="premium" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">💪</div>
              <h3 className="text-xl font-semibold">Your Strengths</h3>
            </div>
            <div className="space-y-2">
              {results.strengths.map((strength: string, index: number) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                >
                  <div className="text-green-600 dark:text-green-400">✓</div>
                  <span className="text-sm font-medium">{strength}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>

        {/* Areas to Improve */}
        <Card variant="premium" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎯</div>
              <h3 className="text-xl font-semibold">Areas to Improve</h3>
            </div>
            <div className="space-y-2">
              {results.weaknesses.map((weakness: string, index: number) => (
                <motion.div
                  key={index}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
                >
                  <div className="text-amber-600 dark:text-amber-400">→</div>
                  <span className="text-sm font-medium">{weakness}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* AI Recommendations */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card variant="premium" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🤖</div>
              <h3 className="text-xl font-semibold">AI Coach Recommendations</h3>
            </div>
            <div className="space-y-3">
              {results.recommendations.map((rec: string, index: number) => (
                <motion.div
                  key={index}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-lg bg-secondary"
                >
                  <div className="text-xl">💡</div>
                  <p className="text-sm flex-1">{rec}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Your Subjects */}
      {data.subjects && data.subjects.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Card variant="premium" className="p-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Your Learning Path</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.subjects.map((subject: string, index: number) => {
                  const color = getSubjectColor(subject);
                  return (
                    <motion.div
                      key={subject}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="p-4 rounded-xl text-center"
                      style={{ backgroundColor: color.light }}
                    >
                      <div className="text-3xl mb-2">
                        {subject === 'MATHEMATICS' && '📐'}
                        {subject === 'PHYSICS' && '⚛️'}
                        {subject === 'CHEMISTRY' && '🧪'}
                        {subject === 'ASTRONOMY' && '🌟'}
                      </div>
                      <div className="text-sm font-semibold" style={{ color: color.primary }}>
                        {subject}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Daily Goal */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-center space-y-4"
      >
        <Card variant="premium" className="inline-block p-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">⏱️</div>
            <div className="text-left">
              <div className="text-2xl font-bold">{data.studyTime} minutes/day</div>
              <div className="text-sm text-muted-foreground">Your daily goal</div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex justify-between pt-8"
      >
        {onBack && (
          <Button variant="outline" size="lg" onClick={onBack}>
            ← Back
          </Button>
        )}
        <Button
          variant="premium"
          size="lg"
          onClick={handleComplete}
          disabled={completeOnboarding.isPending}
          className="ml-auto text-lg px-12"
        >
          {completeOnboarding.isPending ? (
            <>Setting Up Your Dashboard...</>
          ) : (
            <>Start Learning! 🚀</>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
