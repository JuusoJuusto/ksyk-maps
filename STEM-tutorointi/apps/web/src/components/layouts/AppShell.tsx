'use client';

import { ReactNode } from 'react';
import { MobileNav } from './MobileNav';
import { DesktopSidebar } from './DesktopSidebar';
import { TopBar } from './TopBar';
import { CommandPalette, useCommandPalette } from '@/components/command/CommandPalette';
import { NotificationCenter, useNotificationCenter } from '@/components/notifications/NotificationCenter';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isOpen: isCommandOpen, setIsOpen: setCommandOpen } = useCommandPalette();
  const { isOpen: isNotificationOpen, setIsOpen: setNotificationOpen, unreadCount } = useNotificationCenter();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <TopBar 
          onOpenNotifications={() => setNotificationOpen(true)}
          unreadCount={unreadCount}
        />
        
        {/* Page Content */}
        <main className="pb-20 lg:pb-8">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Command Palette (Cmd+K) */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setCommandOpen(false)} />

      {/* Notification Center */}
      <NotificationCenter isOpen={isNotificationOpen} onClose={() => setNotificationOpen(false)} />
    </div>
  );
}
