'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button-premium';
import { Card } from '@/components/ui/card-premium';

interface WelcomeStepProps {
  onNext: (data: any) => void;
  onBack?: () => void;
  data: any;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-8"
      >
        {/* Hero Section */}
        <div className="space-y-6">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-8xl"
          >
            🚀
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            Welcome to STEM Genius
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Your personal AI-powered learning companion. We'll help you master STEM subjects
            with personalized lessons, adaptive difficulty, and gamified progress tracking.
          </motion.p>
        </div>

        {/* Feature Cards */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-3 gap-6 mt-12"
        >
          <Card variant="premium" className="p-6 text-center space-y-3">
            <div className="text-4xl">🤖</div>
            <h3 className="font-semibold text-lg">AI Tutor</h3>
            <p className="text-sm text-muted-foreground">
              Get instant help from your personal AI tutor, available 24/7
            </p>
          </Card>

          <Card variant="premium" className="p-6 text-center space-y-3">
            <div className="text-4xl">📊</div>
            <h3 className="font-semibold text-lg">Adaptive Learning</h3>
            <p className="text-sm text-muted-foreground">
              Personalized difficulty that adapts to your skill level
            </p>
          </Card>

          <Card variant="premium" className="p-6 text-center space-y-3">
            <div className="text-4xl">🎮</div>
            <h3 className="font-semibold text-lg">Gamification</h3>
            <p className="text-sm text-muted-foreground">
              Earn XP, unlock achievements, and compete on leaderboards
            </p>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pt-8"
        >
          <Button
            size="lg"
            variant="premium"
            onClick={() => onNext({})}
            className="text-lg px-12 py-6 h-auto"
          >
            Let's Get Started! →
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Takes only 2 minutes to set up
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
