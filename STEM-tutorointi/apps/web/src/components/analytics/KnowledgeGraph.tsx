// ============================================
// STEM Genius - Knowledge Graph
// Interactive skill tree visualization
// ============================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card-premium';
import { Lock, Check, Play, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Subject } from '@/lib/prisma-types';

interface TopicNode {
  id: string;
  name: string;
  status: 'locked' | 'available' | 'in-progress' | 'mastered';
  mastery: number; // 0-100
  prerequisites: string[];
  unlocks: string[];
  position: { x: number; y: number };
}

interface KnowledgeGraphProps {
  subject: Subject;
  topics: TopicNode[];
  onTopicClick?: (topicId: string) => void;
  className?: string;
}

export function KnowledgeGraph({
  subject,
  topics,
  onTopicClick,
  className,
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

  const getStatusColor = (status: TopicNode['status']) => {
    switch (status) {
      case 'locked':
        return 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
      case 'available':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-2 border-blue-500';
      case 'in-progress':
        return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-2 border-amber-500';
      case 'mastered':
        return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-2 border-green-500';
    }
  };

  const getStatusIcon = (status: TopicNode['status']) => {
    switch (status) {
      case 'locked':
        return <Lock className="w-4 h-4" />;
      case 'available':
        return <Play className="w-4 h-4" />;
      case 'in-progress':
        return <Star className="w-4 h-4" />;
      case 'mastered':
        return <Check className="w-4 h-4" />;
    }
  };

  const handleTopicClick = (topicId: string, status: TopicNode['status']) => {
    if (status === 'locked') return;
    setSelectedTopic(topicId);
    onTopicClick?.(topicId);
  };

  // Calculate connections between topics
  const connections = topics.flatMap((topic) =>
    topic.unlocks.map((unlockId) => ({
      from: topic.id,
      to: unlockId,
      fromPos: topic.position,
      toPos: topics.find((t) => t.id === unlockId)?.position || { x: 0, y: 0 },
    }))
  );

  return (
    <Card variant="premium" className={cn('p-6', className)}>
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Knowledge Map: {subject}</h3>
        <p className="text-sm text-muted-foreground">
          Complete topics to unlock new ones. Master all to become an expert!
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            <Lock className="w-3 h-3" />
          </div>
          <span>Locked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 border-2 border-blue-500 flex items-center justify-center">
            <Play className="w-3 h-3 text-blue-700 dark:text-blue-400" />
          </div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 border-2 border-amber-500 flex items-center justify-center">
            <Star className="w-3 h-3 text-amber-700 dark:text-amber-400" />
          </div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950 border-2 border-green-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-700 dark:text-green-400" />
          </div>
          <span>Mastered</span>
        </div>
      </div>

      {/* Graph Container */}
      <div className="relative w-full h-[600px] bg-secondary/20 rounded-xl overflow-hidden">
        {/* SVG for connections */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                className="fill-border"
              />
            </marker>
          </defs>
          {connections.map((conn, index) => (
            <line
              key={index}
              x1={conn.fromPos.x}
              y1={conn.fromPos.y}
              x2={conn.toPos.x}
              y2={conn.toPos.y}
              className="stroke-border"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          ))}
        </svg>

        {/* Topic Nodes */}
        {topics.map((topic, index) => {
          const isSelected = selectedTopic === topic.id;
          const isHovered = hoveredTopic === topic.id;

          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="absolute"
              style={{
                left: `${topic.position.x}px`,
                top: `${topic.position.y}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected || isHovered ? 10 : 1,
              }}
            >
              <motion.button
                whileHover={{ scale: topic.status !== 'locked' ? 1.1 : 1 }}
                whileTap={{ scale: topic.status !== 'locked' ? 0.95 : 1 }}
                onClick={() => handleTopicClick(topic.id, topic.status)}
                onMouseEnter={() => setHoveredTopic(topic.id)}
                onMouseLeave={() => setHoveredTopic(null)}
                className={cn(
                  'relative w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all',
                  getStatusColor(topic.status),
                  topic.status !== 'locked' && 'cursor-pointer hover:shadow-lg',
                  topic.status === 'locked' && 'cursor-not-allowed opacity-60',
                  isSelected && 'ring-4 ring-primary'
                )}
                disabled={topic.status === 'locked'}
              >
                {/* Icon */}
                <div className="mb-1">{getStatusIcon(topic.status)}</div>

                {/* Name */}
                <div className="text-xs font-semibold text-center px-2 leading-tight">
                  {topic.name}
                </div>

                {/* Mastery Progress */}
                {topic.status !== 'locked' && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${topic.mastery}%` }}
                      transition={{ delay: index * 0.05 + 0.3 }}
                    />
                  </div>
                )}

                {/* Mastery Badge */}
                {topic.status === 'mastered' && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.05 + 0.5, type: 'spring' }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white"
                  >
                    ⭐
                  </motion.div>
                )}
              </motion.button>

              {/* Tooltip */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-popover border border-border rounded-lg shadow-lg z-50"
                >
                  <h4 className="font-semibold mb-1">{topic.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Mastery: {topic.mastery}%
                  </p>
                  {topic.prerequisites.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Prerequisites: {topic.prerequisites.length}
                    </p>
                  )}
                  {topic.unlocks.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Unlocks: {topic.unlocks.length} topics
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Selected Topic Details */}
      {selectedTopic && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-secondary/50 rounded-lg"
        >
          {(() => {
            const topic = topics.find((t) => t.id === selectedTopic);
            if (!topic) return null;

            return (
              <div>
                <h4 className="font-semibold mb-2">{topic.name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 font-semibold capitalize">{topic.status}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mastery:</span>
                    <span className="ml-2 font-semibold">{topic.mastery}%</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                    Start Learning
                  </button>
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity">
                    View Details
                  </button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </Card>
  );
}
