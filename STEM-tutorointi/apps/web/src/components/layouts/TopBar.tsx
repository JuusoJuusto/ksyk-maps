'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

export function TopBar({ onOpenNotifications, unreadCount = 0 }: TopBarProps) {
  const user = useUser();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Mobile Logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">SG</span>
          </div>
          <span className="text-lg font-semibold text-neutral-900 dark:text-white">
            STEM Genius
          </span>
        </div>

        {/* Desktop: Search or Title */}
        <div className="hidden lg:flex items-center flex-1">
          <div className="max-w-md w-full">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search or press Cmd+K..."
                className="w-full h-10 pl-10 pr-4 text-sm bg-neutral-100 dark:bg-neutral-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                onFocus={(e) => {
                  e.target.blur();
                  // Trigger Cmd+K
                  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                }}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs font-semibold bg-secondary rounded hidden lg:inline-block">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative w-10 h-10 p-0 rounded-full hover:bg-secondary"
            onClick={onOpenNotifications}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Streak */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 animate-pulse-glow">
              <span className="text-lg animate-streak-fire">🔥</span>
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                5 day streak
              </span>
            </div>
          )}

          {/* Mobile Menu */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden w-10 h-10 p-0 rounded-full"
            onClick={() => setShowMenu(!showMenu)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {showMenu && (
        <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 animate-fade-in">
          <div className="px-4 py-3 space-y-2">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">Settings</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left text-red-600 dark:text-red-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
