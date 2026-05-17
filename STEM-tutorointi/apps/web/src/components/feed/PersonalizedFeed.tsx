'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { getSubjectColor } from '@/config/design-system';
import { cn } from '@/lib/utils';

interface FeedItem {
  id: string;
  type: 'recommendation' | 'challenge' | 'achievement' | 'insight' | 'countdown' | 'alert' | 'coach-tip';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  metadata?: any;
}

interface PersonalizedFeedProps {
  items: FeedItem[];
  className?: string;
}

export function PersonalizedFeed({ items, className }: PersonalizedFeedProps) {
  const getIcon = (type: string): string => {
    switch (type) {
      case 'recommendation': return '📐';
      case 'challenge': return '⚡';
      case 'achievement': return '🏆';
      case 'insight': return '📊';
      case 'countdown': return '⏰';
      case 'alert': return '🔥';
      case 'coach-tip': return '💡';
      default: return '✨';
    }
  };

  const getPriority = (type: string): 'low' | 'medium' | 'high' => {
    if (type === 'alert' || type === 'countdown') return 'high';
    if (type === 'challenge' || type === 'recommendation') return 'medium';
    return 'low';
  };

  const renderFeedItem = (item: FeedItem, index: number) => {
    const subject = item.metadata?.subject;
    const subjectColor = subject ? getSubjectColor(subject) : null;
    const icon = item.metadata?.icon || getIcon(item.type);
    const priority = getPriority(item.type);

    return (
      <Card
        key={item.id}
        variant="interactive"
        className={cn(
          'animate-fade-in',
          priority === 'high' && 'border-l-4 border-l-orange-500'
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl text-2xl flex-shrink-0',
              subjectColor ? 'bg-opacity-10' : 'bg-secondary'
            )}
            style={subjectColor ? { backgroundColor: `${subjectColor.light}` } : undefined}
            >
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold leading-tight">{item.title}</h4>
                  {subject && (
                    <span
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: subjectColor?.primary }}
                    >
                      {subject}
                    </span>
                  )}
                </div>
                
                {priority === 'high' && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                    Priority
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground">{item.description}</p>

              {item.action && (
                <Button
                  size="sm"
                  variant={subject ? 'default' : 'outline'}
                  className="mt-2"
                >
                  {item.action.label}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Learning Feed</h2>
        <Button variant="ghost" size="sm">
          Customize
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => renderFeedItem(item, index))}
      </div>

      {items.length === 0 && (
        <Card variant="default" className="p-12 text-center">
          <div className="space-y-4">
            <div className="text-6xl">📚</div>
            <div>
              <h3 className="text-xl font-semibold">Your feed is empty</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Complete some tasks to get personalized recommendations!
              </p>
            </div>
            <Button variant="premium">Start Learning</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
