'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { getSubjectColor } from '@/config/design-system';
import { cn } from '@/lib/utils';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mastered: boolean;
}

interface FlashcardDeckProps {
  cards: Flashcard[];
  onComplete?: () => void;
  className?: string;
}

export function FlashcardDeck({ cards, onComplete, className }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());
  const [difficultCards, setDifficultCards] = useState<Set<string>>(new Set());

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const subjectColor = currentCard ? getSubjectColor(currentCard.subject) : null;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete?.();
    }
  };

  const handleMastered = () => {
    setMasteredCards(prev => new Set([...prev, currentCard.id]));
    handleNext();
  };

  const handleDifficult = () => {
    setDifficultCards(prev => new Set([...prev, currentCard.id]));
    handleNext();
  };

  const handleSkip = () => {
    handleNext();
  };

  if (!currentCard) {
    return (
      <Card variant="premium" className={cn('p-12 text-center', className)}>
        <div className="space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold">Deck Complete!</h2>
          <p className="text-muted-foreground">
            You reviewed {cards.length} cards
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-6">
            <div className="rounded-xl bg-green-50 dark:bg-green-950 p-4">
              <p className="text-sm text-muted-foreground">Mastered</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {masteredCards.size}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950 p-4">
              <p className="text-sm text-muted-foreground">Need Review</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {difficultCards.size}
              </p>
            </div>
          </div>
          <Button variant="premium" size="lg" onClick={onComplete}>
            Continue Learning
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="relative h-[400px] cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <div
          className={cn(
            'relative w-full h-full transition-transform duration-500 transform-style-3d',
            isFlipped && 'rotate-y-180'
          )}
        >
          {/* Front */}
          <Card
            variant="premium"
            className={cn(
              'absolute inset-0 backface-hidden flex items-center justify-center p-8',
              'border-4'
            )}
            style={{ borderColor: subjectColor?.primary }}
          >
            <div className="text-center space-y-4">
              <div
                className="inline-block px-4 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: subjectColor?.primary }}
              >
                {currentCard.subject}
              </div>
              <p className="text-2xl font-semibold">{currentCard.front}</p>
              <p className="text-sm text-muted-foreground">Click to reveal answer</p>
            </div>
          </Card>

          {/* Back */}
          <Card
            variant="premium"
            className={cn(
              'absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center p-8',
              'border-4'
            )}
            style={{ borderColor: subjectColor?.primary }}
          >
            <div className="text-center space-y-4">
              <div
                className="inline-block px-4 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: subjectColor?.primary }}
              >
                Answer
              </div>
              <p className="text-2xl font-semibold">{currentCard.back}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      {isFlipped && (
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          <Button
            variant="outline"
            size="lg"
            onClick={handleDifficult}
            className="flex flex-col gap-2 h-auto py-4"
          >
            <span className="text-2xl">😓</span>
            <span className="text-sm">Hard</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleSkip}
            className="flex flex-col gap-2 h-auto py-4"
          >
            <span className="text-2xl">🤔</span>
            <span className="text-sm">Good</span>
          </Button>
          <Button
            variant="success"
            size="lg"
            onClick={handleMastered}
            className="flex flex-col gap-2 h-auto py-4"
          >
            <span className="text-2xl">✅</span>
            <span className="text-sm">Easy</span>
          </Button>
        </div>
      )}

      {!isFlipped && (
        <div className="text-center">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Card →
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-lg font-bold">{cards.length - currentIndex - 1}</p>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-center">
          <p className="text-xs text-muted-foreground">Mastered</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {masteredCards.size}
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-center">
          <p className="text-xs text-muted-foreground">Review</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {difficultCards.size}
          </p>
        </div>
      </div>
    </div>
  );
}
