'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card-premium';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  category: 'navigation' | 'actions' | 'learning' | 'settings';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: '🏠', category: 'navigation', action: () => window.location.href = '/dashboard' },
    { id: 'nav-tasks', label: 'View All Tasks', icon: '📚', category: 'navigation', action: () => console.log('Navigate to tasks') },
    { id: 'nav-achievements', label: 'View Achievements', icon: '🏆', category: 'navigation', action: () => console.log('Navigate to achievements') },
    { id: 'nav-profile', label: 'View Profile', icon: '👤', category: 'navigation', action: () => console.log('Navigate to profile') },
    { id: 'nav-settings', label: 'Open Settings', icon: '⚙️', category: 'navigation', action: () => console.log('Navigate to settings') },
    
    // Actions
    { id: 'action-new-task', label: 'Generate New Task', icon: '➕', category: 'actions', shortcut: '⌘N', action: () => console.log('Generate task') },
    { id: 'action-ai-tutor', label: 'Chat with AI Tutor', icon: '🤖', category: 'actions', shortcut: '⌘T', action: () => console.log('Open AI tutor') },
    { id: 'action-flashcards', label: 'Study Flashcards', icon: '🎴', category: 'actions', action: () => console.log('Open flashcards') },
    { id: 'action-focus', label: 'Start Focus Mode', icon: '🎯', category: 'actions', shortcut: '⌘F', action: () => console.log('Start focus mode') },
    
    // Learning
    { id: 'learn-math', label: 'Practice Mathematics', icon: '📐', category: 'learning', action: () => console.log('Practice math') },
    { id: 'learn-physics', label: 'Study Physics', icon: '⚛️', category: 'learning', action: () => console.log('Study physics') },
    { id: 'learn-chemistry', label: 'Learn Chemistry', icon: '🧪', category: 'learning', action: () => console.log('Learn chemistry') },
    { id: 'learn-astronomy', label: 'Explore Astronomy', icon: '🌟', category: 'learning', action: () => console.log('Explore astronomy') },
    
    // Settings
    { id: 'settings-theme', label: 'Toggle Dark Mode', icon: '🌙', category: 'settings', action: () => console.log('Toggle theme') },
    { id: 'settings-notifications', label: 'Notification Settings', icon: '🔔', category: 'settings', action: () => console.log('Notifications') },
    { id: 'settings-account', label: 'Account Settings', icon: '👤', category: 'settings', action: () => console.log('Account') },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    learning: 'Learning',
    settings: 'Settings',
  };

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] pointer-events-none">
        <Card
          variant="premium"
          padding="none"
          className="w-full max-w-2xl mx-4 pointer-events-auto animate-scale-in"
        >
          {/* Search Input */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔍</span>
              <input
                type="text"
                placeholder="Type a command or search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold bg-secondary rounded">
                ESC
              </kbd>
            </div>
          </div>

          {/* Commands List */}
          <div className="max-h-[60vh] overflow-y-auto scrollbar-hide">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>
                {cmds.map((cmd, index) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary'
                      )}
                    >
                      {cmd.icon && <span className="text-2xl">{cmd.icon}</span>}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{cmd.label}</div>
                        {cmd.description && (
                          <div className="text-xs opacity-70">{cmd.description}</div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd className="px-2 py-1 text-xs font-semibold bg-secondary rounded">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <div className="text-4xl mb-2">🔍</div>
                <p>No commands found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-secondary/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-background rounded">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded">↵</kbd>
                  Select
                </span>
              </div>
              <span>{filteredCommands.length} commands</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// Hook to use command palette
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
}
