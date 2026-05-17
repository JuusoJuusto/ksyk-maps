'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button-premium';
import { Card } from '@/components/ui/card-premium';
import { cn } from '@/lib/utils';
import { Subject } from '@/lib/prisma-types';

interface GoalsStepProps {
  onNext: (data: any) => void;
  onBack?: () => void;
  data: any;
}

const subjects = [
  { id: 'MATHEMATICS', name: 'Mathematics', icon: '📐', color: 'from-blue-500 to-cyan-500' },
  { id: 'PHYSICS', name: 'Physics', icon: '⚛️', color: 'from-purple-500 to-pink-500' },
  { id: 'CHEMISTRY', name: 'Chemistry', icon: '🧪', color: 'from-green-500 to-emerald-500' },
  { id: 'ASTRONOMY', name: 'Astronomy', icon: '🌟', color: 'from-amber-500 to-orange-500' },
];

const goals = [
  { id: 'exam-prep', name: 'Exam Preparation', icon: '📝', description: 'Ace your upcoming tests' },
  { id: 'improve-grades', name: 'Improve Grades', icon: '📈', description: 'Boost your academic performance' },
  { id: 'learn-new', name: 'Learn Something New', icon: '🎓', description: 'Explore new topics' },
  { id: 'homework-help', name: 'Homework Help', icon: '✏️', description: 'Get help with assignments' },
  { id: 'competition', name: 'Competition Prep', icon: '🏆', description: 'Prepare for competitions' },
  { id: 'curiosity', name: 'Pure Curiosity', icon: '🔬', description: 'Learn for the love of learning' },
];

const studyTimes = [
  { id: '15', label: '15 min/day', icon: '⚡' },
  { id: '30', label: '30 min/day', icon: '📚' },
  { id: '60', label: '1 hour/day', icon: '🎯' },
  { id: '120', label: '2+ hours/day', icon: '🚀' },
];

export function GoalsStep({ onNext, onBack, data }: GoalsStepProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(data.subjects || []);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(data.goals || []);
  const [studyTime, setStudyTime] = useState<string>(data.studyTime || '');
  const [gradeLevel, setGradeLevel] = useState<string>(data.gradeLevel || '');

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const canProceed = selectedSubjects.length > 0 && selectedGoals.length > 0 && studyTime && gradeLevel;

  const handleNext = () => {
    onNext({
      subjects: selectedSubjects,
      goals: selectedGoals,
      studyTime: parseInt(studyTime),
      gradeLevel: parseInt(gradeLevel),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-bold"
        >
          Let's Personalize Your Experience
        </motion.h2>
        <p className="text-lg text-muted-foreground">
          Tell us about your learning goals so we can create the perfect plan for you
        </p>
      </div>

      {/* Grade Level */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h3 className="text-xl font-semibold">What grade are you in?</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[7, 8, 9, 10, 11, 12].map((grade) => (
            <button
              key={grade}
              onClick={() => setGradeLevel(grade.toString())}
              className={cn(
                'p-4 rounded-xl border-2 transition-all',
                gradeLevel === grade.toString()
                  ? 'border-primary bg-primary/10 scale-105'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="text-2xl font-bold">{grade}</div>
              <div className="text-xs text-muted-foreground">Grade</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Subjects */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h3 className="text-xl font-semibold">Which subjects interest you?</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              variant={selectedSubjects.includes(subject.id) ? 'premium' : 'interactive'}
              className={cn(
                'p-6 cursor-pointer transition-all',
                selectedSubjects.includes(subject.id) && 'ring-2 ring-primary scale-105'
              )}
              onClick={() => toggleSubject(subject.id)}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'text-4xl w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br',
                  subject.color
                )}>
                  {subject.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{subject.name}</h4>
                </div>
                {selectedSubjects.includes(subject.id) && (
                  <div className="text-2xl">✓</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Goals */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h3 className="text-xl font-semibold">What are your learning goals?</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              variant={selectedGoals.includes(goal.id) ? 'premium' : 'interactive'}
              className={cn(
                'p-4 cursor-pointer transition-all',
                selectedGoals.includes(goal.id) && 'ring-2 ring-primary'
              )}
              onClick={() => toggleGoal(goal.id)}
            >
              <div className="text-center space-y-2">
                <div className="text-3xl">{goal.icon}</div>
                <h4 className="font-semibold">{goal.name}</h4>
                <p className="text-xs text-muted-foreground">{goal.description}</p>
                {selectedGoals.includes(goal.id) && (
                  <div className="text-xl">✓</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Study Time */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="text-xl font-semibold">How much time can you dedicate daily?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {studyTimes.map((time) => (
            <Card
              key={time.id}
              variant={studyTime === time.id ? 'premium' : 'interactive'}
              className={cn(
                'p-6 cursor-pointer transition-all text-center',
                studyTime === time.id && 'ring-2 ring-primary scale-105'
              )}
              onClick={() => setStudyTime(time.id)}
            >
              <div className="text-3xl mb-2">{time.icon}</div>
              <div className="font-semibold">{time.label}</div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
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
          onClick={handleNext}
          disabled={!canProceed}
          className="ml-auto"
        >
          Continue →
        </Button>
      </motion.div>
    </div>
  );
}
