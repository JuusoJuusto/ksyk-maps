'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  Flame,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Practice', icon: BookOpen },
  { href: '/tutor', label: 'AI Tutor', icon: MessageSquare },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              STEM Genius
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn(
                      'relative',
                      isActive && 'bg-gradient-to-r from-blue-500 to-purple-600'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md -z-10"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Info & Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* XP & Streak */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  0
                </span>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                  0 XP
                </span>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Level 1
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {session?.user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 space-y-2"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className="w-full justify-start"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 dark:text-red-400"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
