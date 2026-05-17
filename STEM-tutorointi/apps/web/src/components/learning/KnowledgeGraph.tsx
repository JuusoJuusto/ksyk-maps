'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { getSubjectColor } from '@/config/design-system';
import { cn } from '@/lib/utils';

interface TopicNode {
  id: string;
  name: string;
  subject: string;
  mastery: number; // 0-100
  status: 'locked' | 'available' | 'in-progress' | 'mastered';
  prerequisites: string[];
  unlocks: string[];
  tasksCompleted: number;
  totalTasks: number;
}

interface KnowledgeGraphProps {
  topics: TopicNode[];
  onTopicClick?: (topic: TopicNode) => void;
  className?: string;
}

export function KnowledgeGraph({ topics, onTopicClick, className }: KnowledgeGraphProps) {
  const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'mastered'>('all');

  const filteredTopics = topics.filter(topic => {
    if (filter === 'all') return true;
    if (filter === 'available') return topic.status === 'available' || topic.status === 'in-progress';
    if (filter === 'mastered') return topic.status === 'mastered';
    return true;
  });

  const getStatusColor = (status: TopicNode['status']) => {
    switch (status) {
      case 'locked':
        return 'bg-gray-200 dark:bg-gray-800 text-gray-500';
      case 'available':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-2 border-blue-500';
      case 'in-progress':
        return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-2 border-amber-500';
      case 'mastered':
        return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-2 border-green-500';
    }
  };

  const getStatusIcon = (status: TopicNode['status']) => {
    switch (status) {
      case 'locked':
        return '🔒';
      case 'available':
        return '📖';
      case 'in-progress':
        return '⏳';
      case 'mastered':
        return '✅';
    }
  };

  const handleTopicClick = (topic: TopicNode) => {
    setSelectedTopic(topic);
    onTopicClick?.(topic);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(['all', 'available', 'mastered'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Graph View */}
      <Card variant="premium">
        <CardHeader>
          <CardTitle>Learning Path</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Group by subject */}
            {Array.from(new Set(filteredTopics.map(t => t.subject))).map((subject) => {
              const subjectTopics = filteredTopics.filter(t => t.subject === subject);
              const subjectColor = getSubjectColor(subject);

              return (
                <div key={subject} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subjectColor.primary }}
                    />
                    <h3 className="font-semibold">{subject}</h3>
                    <span className="text-xs text-muted-foreground">
                      {subjectTopics.filter(t => t.status === 'mastered').length}/{subjectTopics.length} mastered
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {subjectTopics.map((topic, index) => (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicClick(topic)}
                        disabled={topic.status === 'locked'}
                        className={cn(
                          'relative p-4 rounded-xl text-left transition-all animate-fade-in',
                          getStatusColor(topic.status),
                          topic.status !== 'locked' && 'hover:scale-105 hover:shadow-lg cursor-pointer',
                          selectedTopic?.id === topic.id && 'ring-2 ring-primary ring-offset-2',
                          topic.status === 'locked' && 'cursor-not-allowed opacity-60'
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        {/* Status Icon */}
                        <div className="text-2xl mb-2">{getStatusIcon(topic.status)}</div>

                        {/* Topic Name */}
                        <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                          {topic.name}
                        </h4>

                        {/* Progress */}
                        {topic.status !== 'locked' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{topic.mastery}%</span>
                              <span>{topic.tasksCompleted}/{topic.totalTasks}</span>
                            </div>
                            <div className="h-1.5 bg-white/30 dark:bg-black/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-current transition-all duration-500"
                                style={{ width: `${topic.mastery}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Prerequisites indicator */}
                        {topic.status === 'locked' && topic.prerequisites.length > 0 && (
                          <p className="text-xs mt-2">
                            Complete {topic.prerequisites.length} prerequisite{topic.prerequisites.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Topic Details */}
      {selectedTopic && (
        <Card variant="elevated" className="animate-scale-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedTopic.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedTopic(null)}
              >
                <span className="text-xl">×</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getStatusIcon(selectedTopic.status)}</span>
              <span className={cn(
                'px-3 py-1 rounded-full text-sm font-semibold',
                getStatusColor(selectedTopic.status)
              )}>
                {selectedTopic.status.charAt(0).toUpperCase() + selectedTopic.status.slice(1).replace('-', ' ')}
              </span>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">
                  {selectedTopic.tasksCompleted}/{selectedTopic.totalTasks} tasks
                </span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${selectedTopic.mastery}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTopic.mastery}% mastered
              </p>
            </div>

            {/* Prerequisites */}
            {selectedTopic.prerequisites.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Prerequisites</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTopic.prerequisites.map((prereqId) => {
                    const prereq = topics.find(t => t.id === prereqId);
                    return prereq ? (
                      <span
                        key={prereqId}
                        className="px-3 py-1 rounded-lg bg-secondary text-sm"
                      >
                        {prereq.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Unlocks */}
            {selectedTopic.unlocks.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Unlocks</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTopic.unlocks.map((unlockId) => {
                    const unlock = topics.find(t => t.id === unlockId);
                    return unlock ? (
                      <span
                        key={unlockId}
                        className="px-3 py-1 rounded-lg bg-secondary text-sm"
                      >
                        {unlock.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Action Button */}
            {selectedTopic.status !== 'locked' && (
              <Button
                variant={selectedTopic.status === 'mastered' ? 'outline' : 'premium'}
                className="w-full"
              >
                {selectedTopic.status === 'mastered' ? 'Review' : 'Continue Learning'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
