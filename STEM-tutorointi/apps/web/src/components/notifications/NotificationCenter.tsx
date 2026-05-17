'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'achievement' | 'streak' | 'reminder' | 'social' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
  icon?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function NotificationCenter({ isOpen, onClose, className }: NotificationCenterProps) {
  // TODO: Replace with real API call - useNotifications() hook
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'streak':
        return '🔥';
      case 'reminder':
        return '⏰';
      case 'social':
        return '👥';
      case 'system':
        return '⚙️';
      default:
        return '📬';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'achievement':
        return 'from-amber-400 to-orange-500';
      case 'streak':
        return 'from-orange-500 to-red-500';
      case 'reminder':
        return 'from-blue-400 to-indigo-500';
      case 'social':
        return 'from-purple-400 to-pink-500';
      case 'system':
        return 'from-gray-400 to-gray-600';
      default:
        return 'from-blue-400 to-purple-500';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-96 bg-background border-l border-border z-50 shadow-2xl',
          'animate-slide-in',
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <span className="text-xl">×</span>
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all',
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all',
                  filter === 'unread'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                )}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="w-full mt-2"
              >
                Mark all as read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <div className="text-6xl mb-4">📭</div>
                <p className="font-medium">No notifications</p>
                <p className="text-sm mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredNotifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-secondary/50 transition-colors cursor-pointer animate-fade-in',
                      !notification.read && 'bg-primary/5'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0',
                          'bg-gradient-to-br',
                          getNotificationColor(notification.type)
                        )}
                      >
                        {notification.icon || getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{notification.title}</h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                          {notification.actionLabel && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              {notification.actionLabel}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-lg">×</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Helper function to format timestamp
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB');
}

// Generate sample notifications
function generateSampleNotifications(): Notification[] {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'achievement',
      title: 'New Achievement Unlocked!',
      message: 'You earned the "Week Warrior" badge for maintaining a 7-day streak!',
      timestamp: new Date(now.getTime() - 5 * 60000),
      read: false,
      actionLabel: 'View',
      icon: '🏆',
    },
    {
      id: '2',
      type: 'streak',
      title: 'Streak Alert! 🔥',
      message: 'Don\'t break your 12-day streak! Complete at least one task today.',
      timestamp: new Date(now.getTime() - 2 * 3600000),
      read: false,
      actionLabel: 'Study Now',
      icon: '🔥',
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Exam Reminder',
      message: 'Your Chemistry exam is in 3 days. Time to start reviewing!',
      timestamp: new Date(now.getTime() - 5 * 3600000),
      read: true,
      actionLabel: 'Start Review',
      icon: '⏰',
    },
    {
      id: '4',
      type: 'social',
      title: 'Friend Challenge',
      message: 'Alex challenged you to a math quiz! Can you beat their score?',
      timestamp: new Date(now.getTime() - 86400000),
      read: true,
      actionLabel: 'Accept',
      icon: '👥',
    },
    {
      id: '5',
      type: 'system',
      title: 'New Features Available',
      message: 'Check out the new flashcard system and focus mode!',
      timestamp: new Date(now.getTime() - 2 * 86400000),
      read: true,
      actionLabel: 'Explore',
      icon: '✨',
    },
  ];
}

// Hook to use notification center
export function useNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  return { isOpen, setIsOpen, unreadCount };
}
