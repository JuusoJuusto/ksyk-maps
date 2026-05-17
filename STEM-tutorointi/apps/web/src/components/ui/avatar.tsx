// ============================================
// STEM Genius - Avatar Component
// User avatar with fallback
// ============================================

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const initials = React.useMemo(() => {
    if (fallback) {
      return fallback
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return '?';
  }, [fallback]);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || fallback || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="font-medium text-neutral-600 dark:text-neutral-400">
          {initials}
        </span>
      )}
    </div>
  );
}
