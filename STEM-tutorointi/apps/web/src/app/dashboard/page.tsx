'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { DashboardContent } from './dashboard-content';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth will redirect
  }

  return <DashboardContent user={user} />;
}
