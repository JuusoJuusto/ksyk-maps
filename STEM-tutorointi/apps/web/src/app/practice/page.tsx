'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { PracticeInterface } from './practice-interface';
import { Skeleton } from '@/components/ui/skeleton';

export default function PracticePage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth will redirect
  }

  return <PracticeInterface user={user} />;
}
