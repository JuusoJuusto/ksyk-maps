'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import { AITutorInterface } from './tutor-interface';
import { Skeleton } from '@/components/ui/skeleton';

export default function TutorPage() {
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

  return <AITutorInterface user={user} />;
}
