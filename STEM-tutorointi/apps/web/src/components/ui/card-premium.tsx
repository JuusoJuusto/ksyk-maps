import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-2xl border bg-card text-card-foreground transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'shadow-sm hover:shadow-md',
        elevated: 'shadow-md hover:shadow-lg',
        premium: 'shadow-lg hover:shadow-xl',
        interactive: 'shadow-sm hover:shadow-lg hover:scale-[1.02] cursor-pointer',
        glow: 'shadow-[0_0_20px_rgba(0,0,0,0.1)] hover:shadow-[0_0_30px_rgba(0,0,0,0.15)]',
        
        // Subject-themed cards
        math: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50',
        physics: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/50',
        chemistry: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50',
        astronomy: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/50',
        
        // Emotional cards
        success: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50',
        achievement: 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950',
        streak: 'border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// Animated Card Component
interface AnimatedCardProps extends CardProps {
  delay?: number;
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, delay = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-fade-in', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card {...props} />
    </div>
  )
);
AnimatedCard.displayName = 'AnimatedCard';

// Stat Card Component
interface StatCardProps extends CardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, icon, trend, trendValue, className, ...props }, ref) => (
    <Card ref={ref} variant="elevated" className={cn('relative overflow-hidden', className)} {...props}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trendValue && (
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium',
                trend === 'up' && 'text-green-600 dark:text-green-400',
                trend === 'down' && 'text-red-600 dark:text-red-400',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trend === 'neutral' && '→'}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
);
StatCard.displayName = 'StatCard';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  AnimatedCard,
  StatCard,
  cardVariants,
};
