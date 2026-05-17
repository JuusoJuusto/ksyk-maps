'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { useUpdateProfile } from '@/lib/hooks/use-queries';
import { toast } from 'react-hot-toast';
import { useUIStore } from '@/lib/store';

export default function SettingsPage() {
  const { user, isLoading, logout } = useRequireAuth();
  const updateProfile = useUpdateProfile();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      const profile = user.profile as Record<string, unknown> | undefined;
      if (profile) {
        setNotifications((profile.notifications as boolean) ?? true);
        setSoundEffects((profile.soundEffects as boolean) ?? true);
      }
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        notifications,
        soundEffects,
      });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20 md:pb-0">
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Settings
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Manage your account and preferences
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Profile */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Profile</h2>
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="w-20 h-20">
              <div className="w-full h-full rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 text-2xl font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
            </Avatar>
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">{name}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{email}</p>
              <Badge variant="secondary" className="mt-1">{user.role}</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled className="bg-neutral-100 dark:bg-neutral-800" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Email cannot be changed</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending || !name.trim()}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Appearance</h2>
          <div className="flex gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Button
                key={t}
                variant={theme === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange(t)}
                className={theme === t ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : ''}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </Card>

        {/* Preferences */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive updates about your progress</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Daily Reminders</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Get reminded to practice daily</p>
              </div>
              <Switch checked={reminders} onCheckedChange={setReminders} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Sound Effects</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Play sounds for achievements</p>
              </div>
              <Switch checked={soundEffects} onCheckedChange={setSoundEffects} />
            </div>
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Subscription</h2>
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                {user.subscriptionTier === 'PREMIUM' ? 'Premium Plan' : 'Free Plan'}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {user.subscriptionTier === 'PREMIUM'
                  ? 'All features unlocked'
                  : 'Upgrade to unlock all features'}
              </p>
            </div>
            {user.subscriptionTier === 'FREE' && (
              <Button className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
                Upgrade
              </Button>
            )}
          </div>
        </Card>

        {/* Sign Out */}
        <Card className="p-6">
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-red-200 dark:border-red-900">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h2>
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button className="bg-red-600 text-white hover:bg-red-700">Confirm Delete</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
