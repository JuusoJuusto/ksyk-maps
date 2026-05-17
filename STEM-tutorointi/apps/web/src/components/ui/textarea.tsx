// ============================================
// STEM Genius - Textarea Component
// Multi-line text input
// ============================================

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-neutral-200 dark:border-neutral-800',
          'bg-white dark:bg-neutral-900 px-3 py-2 text-sm',
          'ring-offset-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300',
          'resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
