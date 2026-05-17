/**
 * STEM Genius Design System
 * Premium color system with subject-based coding and emotional UI
 * Inspired by: Linear, Notion, Duolingo, Spotify, Apple
 */

export const DESIGN_SYSTEM = {
  // Subject Colors - Premium, intentional color coding
  subjects: {
    math: {
      primary: 'hsl(217, 91%, 60%)', // Blue - logical, structured
      light: 'hsl(217, 91%, 95%)',
      dark: 'hsl(217, 91%, 20%)',
      gradient: 'from-blue-500 to-blue-600',
    },
    physics: {
      primary: 'hsl(271, 76%, 53%)', // Purple - mysterious, powerful
      light: 'hsl(271, 76%, 95%)',
      dark: 'hsl(271, 76%, 20%)',
      gradient: 'from-purple-500 to-purple-600',
    },
    chemistry: {
      primary: 'hsl(142, 71%, 45%)', // Green - experimental, growth
      light: 'hsl(142, 71%, 95%)',
      dark: 'hsl(142, 71%, 20%)',
      gradient: 'from-green-500 to-green-600',
    },
    astronomy: {
      primary: 'hsl(38, 92%, 50%)', // Amber - cosmic, wonder
      light: 'hsl(38, 92%, 95%)',
      dark: 'hsl(38, 92%, 20%)',
      gradient: 'from-amber-500 to-amber-600',
    },
    biology: {
      primary: 'hsl(168, 76%, 42%)', // Teal - life, organic
      light: 'hsl(168, 76%, 95%)',
      dark: 'hsl(168, 76%, 20%)',
      gradient: 'from-teal-500 to-teal-600',
    },
  },

  // Emotional UI Colors - Motivating, psychologically engaging
  emotions: {
    success: {
      primary: 'hsl(142, 71%, 45%)',
      light: 'hsl(142, 71%, 95%)',
      dark: 'hsl(142, 71%, 20%)',
      gradient: 'from-green-400 to-emerald-500',
    },
    achievement: {
      primary: 'hsl(38, 92%, 50%)',
      light: 'hsl(38, 92%, 95%)',
      dark: 'hsl(38, 92%, 20%)',
      gradient: 'from-amber-400 to-orange-500',
    },
    streak: {
      primary: 'hsl(25, 95%, 53%)',
      light: 'hsl(25, 95%, 95%)',
      dark: 'hsl(25, 95%, 20%)',
      gradient: 'from-orange-500 to-red-500',
    },
    progress: {
      primary: 'hsl(217, 91%, 60%)',
      light: 'hsl(217, 91%, 95%)',
      dark: 'hsl(217, 91%, 20%)',
      gradient: 'from-blue-400 to-indigo-500',
    },
    focus: {
      primary: 'hsl(271, 76%, 53%)',
      light: 'hsl(271, 76%, 95%)',
      dark: 'hsl(271, 76%, 20%)',
      gradient: 'from-purple-400 to-violet-500',
    },
    warning: {
      primary: 'hsl(38, 92%, 50%)',
      light: 'hsl(38, 92%, 95%)',
      dark: 'hsl(38, 92%, 20%)',
      gradient: 'from-yellow-400 to-amber-500',
    },
    error: {
      primary: 'hsl(0, 84%, 60%)',
      light: 'hsl(0, 84%, 95%)',
      dark: 'hsl(0, 84%, 20%)',
      gradient: 'from-red-400 to-rose-500',
    },
  },

  // Level Colors - Gamification progression
  levels: {
    beginner: {
      color: 'hsl(142, 71%, 45%)',
      gradient: 'from-green-400 to-emerald-500',
      label: 'Beginner',
    },
    intermediate: {
      color: 'hsl(217, 91%, 60%)',
      gradient: 'from-blue-400 to-indigo-500',
      label: 'Intermediate',
    },
    advanced: {
      color: 'hsl(271, 76%, 53%)',
      gradient: 'from-purple-400 to-violet-500',
      label: 'Advanced',
    },
    expert: {
      color: 'hsl(38, 92%, 50%)',
      gradient: 'from-amber-400 to-orange-500',
      label: 'Expert',
    },
    master: {
      color: 'hsl(0, 0%, 9%)',
      gradient: 'from-gray-700 to-gray-900',
      label: 'Master',
    },
  },

  // Difficulty Colors
  difficulty: {
    easy: {
      color: 'hsl(142, 71%, 45%)',
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    },
    medium: {
      color: 'hsl(38, 92%, 50%)',
      bg: 'bg-amber-50 dark:bg-amber-950',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
    },
    hard: {
      color: 'hsl(0, 84%, 60%)',
      bg: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
    },
  },

  // Typography Scale
  typography: {
    display: 'text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight',
    h1: 'text-4xl md:text-5xl font-bold tracking-tight',
    h2: 'text-3xl md:text-4xl font-bold tracking-tight',
    h3: 'text-2xl md:text-3xl font-semibold tracking-tight',
    h4: 'text-xl md:text-2xl font-semibold',
    h5: 'text-lg md:text-xl font-semibold',
    body: 'text-base',
    small: 'text-sm',
    tiny: 'text-xs',
  },

  // Spacing Scale
  spacing: {
    section: 'py-12 md:py-16 lg:py-20',
    container: 'px-4 md:px-6 lg:px-8',
    card: 'p-4 md:p-6',
    tight: 'space-y-2',
    normal: 'space-y-4',
    relaxed: 'space-y-6',
    loose: 'space-y-8',
  },

  // Shadow System
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    premium: 'shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
    glow: 'shadow-[0_0_20px_rgba(0,0,0,0.1)]',
  },

  // Border Radius
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  },

  // Animation Durations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },

  // Breakpoints (for reference)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Helper function to get subject color
export function getSubjectColor(subject: string) {
  const normalized = subject.toLowerCase();
  if (normalized.includes('math') || normalized.includes('algebra') || normalized.includes('geometry')) {
    return DESIGN_SYSTEM.subjects.math;
  }
  if (normalized.includes('physics') || normalized.includes('mechanics')) {
    return DESIGN_SYSTEM.subjects.physics;
  }
  if (normalized.includes('chemistry') || normalized.includes('chemical')) {
    return DESIGN_SYSTEM.subjects.chemistry;
  }
  if (normalized.includes('astronomy') || normalized.includes('space') || normalized.includes('cosmic')) {
    return DESIGN_SYSTEM.subjects.astronomy;
  }
  if (normalized.includes('biology') || normalized.includes('life')) {
    return DESIGN_SYSTEM.subjects.biology;
  }
  return DESIGN_SYSTEM.subjects.math; // Default
}

// Helper function to get difficulty styling
export function getDifficultyStyle(difficulty: string) {
  const normalized = difficulty.toLowerCase();
  if (normalized === 'easy' || normalized === 'beginner') {
    return DESIGN_SYSTEM.difficulty.easy;
  }
  if (normalized === 'medium' || normalized === 'intermediate') {
    return DESIGN_SYSTEM.difficulty.medium;
  }
  if (normalized === 'hard' || normalized === 'advanced' || normalized === 'expert') {
    return DESIGN_SYSTEM.difficulty.hard;
  }
  return DESIGN_SYSTEM.difficulty.medium; // Default
}

// Helper function to get level styling
export function getLevelStyle(level: number) {
  if (level < 10) return DESIGN_SYSTEM.levels.beginner;
  if (level < 25) return DESIGN_SYSTEM.levels.intermediate;
  if (level < 50) return DESIGN_SYSTEM.levels.advanced;
  if (level < 100) return DESIGN_SYSTEM.levels.expert;
  return DESIGN_SYSTEM.levels.master;
}
