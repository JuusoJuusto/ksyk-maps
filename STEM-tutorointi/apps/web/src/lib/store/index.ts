// ============================================
// STEM Genius - Global State Management
// Zustand Store for Client-Side State
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Subject } from '../prisma-types';

// ============================================
// UI STATE
// ============================================

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Modals
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Notifications
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Mobile
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Modals
      activeModal: null,
      openModal: (modalId) => set({ activeModal: modalId }),
      closeModal: () => set({ activeModal: null }),

      // Notifications
      notificationsOpen: false,
      setNotificationsOpen: (open) => set({ notificationsOpen: open }),
      unreadNotifications: 0,
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),

      // Search
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Mobile
      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'stem-genius-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// ============================================
// ONBOARDING STATE
// ============================================

interface OnboardingState {
  // Progress
  currentStep: number;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Data
  goals: string[];
  setGoals: (goals: string[]) => void;
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;
  studyTime: number;
  setStudyTime: (time: number) => void;
  assessmentId: string | null;
  setAssessmentId: (id: string | null) => void;
  assessmentAnswers: Array<{ questionId: string; answer: any }>;
  setAssessmentAnswers: (answers: Array<{ questionId: string; answer: any }>) => void;

  // Reset
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      // Progress
      currentStep: 0,
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
      previousStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

      // Data
      goals: [],
      setGoals: (goals) => set({ goals }),
      subjects: [],
      setSubjects: (subjects) => set({ subjects }),
      studyTime: 30,
      setStudyTime: (time) => set({ studyTime: time }),
      assessmentId: null,
      setAssessmentId: (id) => set({ assessmentId: id }),
      assessmentAnswers: [],
      setAssessmentAnswers: (answers) => set({ assessmentAnswers: answers }),

      // Reset
      reset: () =>
        set({
          currentStep: 0,
          goals: [],
          subjects: [],
          studyTime: 30,
          assessmentId: null,
          assessmentAnswers: [],
        }),
    }),
    {
      name: 'stem-genius-onboarding',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================
// AI TUTOR STATE
// ============================================

interface AITutorState {
  // Current conversation
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Input
  inputMessage: string;
  setInputMessage: (message: string) => void;

  // Streaming
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamingMessage: string;
  setStreamingMessage: (message: string) => void;
  appendStreamingMessage: (chunk: string) => void;

  // Context
  currentSubject: Subject | null;
  setCurrentSubject: (subject: Subject | null) => void;
  currentTopic: string | null;
  setCurrentTopic: (topic: string | null) => void;

  // Reset
  reset: () => void;
}

export const useAITutorStore = create<AITutorState>((set) => ({
  // Current conversation
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  // Input
  inputMessage: '',
  setInputMessage: (message) => set({ inputMessage: message }),

  // Streaming
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  streamingMessage: '',
  setStreamingMessage: (message) => set({ streamingMessage: message }),
  appendStreamingMessage: (chunk) =>
    set((state) => ({ streamingMessage: state.streamingMessage + chunk })),

  // Context
  currentSubject: null,
  setCurrentSubject: (subject) => set({ currentSubject: subject }),
  currentTopic: null,
  setCurrentTopic: (topic) => set({ currentTopic: topic }),

  // Reset
  reset: () =>
    set({
      activeConversationId: null,
      inputMessage: '',
      isStreaming: false,
      streamingMessage: '',
      currentSubject: null,
      currentTopic: null,
    }),
}));

// ============================================
// TASK STATE
// ============================================

interface TaskState {
  // Current task
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;

  // Answer
  currentAnswer: any;
  setCurrentAnswer: (answer: any) => void;

  // Hints
  hintsUsed: number;
  setHintsUsed: (count: number) => void;
  incrementHints: () => void;

  // Timer
  startTime: number | null;
  setStartTime: (time: number | null) => void;
  timeSpent: number;
  setTimeSpent: (time: number) => void;

  // Filters
  selectedSubject: Subject | null;
  setSelectedSubject: (subject: Subject | null) => void;
  selectedDifficulty: number | null;
  setSelectedDifficulty: (difficulty: number | null) => void;

  // Reset
  reset: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  // Current task
  activeTaskId: null,
  setActiveTaskId: (id) => set({ activeTaskId: id }),

  // Answer
  currentAnswer: null,
  setCurrentAnswer: (answer) => set({ currentAnswer: answer }),

  // Hints
  hintsUsed: 0,
  setHintsUsed: (count) => set({ hintsUsed: count }),
  incrementHints: () => set((state) => ({ hintsUsed: state.hintsUsed + 1 })),

  // Timer
  startTime: null,
  setStartTime: (time) => set({ startTime: time }),
  timeSpent: 0,
  setTimeSpent: (time) => set({ timeSpent: time }),

  // Filters
  selectedSubject: null,
  setSelectedSubject: (subject) => set({ selectedSubject: subject }),
  selectedDifficulty: null,
  setSelectedDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),

  // Reset
  reset: () =>
    set({
      activeTaskId: null,
      currentAnswer: null,
      hintsUsed: 0,
      startTime: null,
      timeSpent: 0,
    }),
}));

// ============================================
// ANALYTICS STATE
// ============================================

interface AnalyticsState {
  // Filters
  timeframe: 'week' | 'month' | 'year';
  setTimeframe: (timeframe: 'week' | 'month' | 'year') => void;
  selectedSubject: Subject | null;
  setSelectedSubject: (subject: Subject | null) => void;

  // Leaderboard
  leaderboardScope: 'global' | 'friends' | 'school' | 'class';
  setLeaderboardScope: (scope: 'global' | 'friends' | 'school' | 'class') => void;
  leaderboardPeriod: 'daily' | 'weekly' | 'monthly' | 'all-time';
  setLeaderboardPeriod: (period: 'daily' | 'weekly' | 'monthly' | 'all-time') => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  // Filters
  timeframe: 'week',
  setTimeframe: (timeframe) => set({ timeframe }),
  selectedSubject: null,
  setSelectedSubject: (subject) => set({ selectedSubject: subject }),

  // Leaderboard
  leaderboardScope: 'global',
  setLeaderboardScope: (scope) => set({ leaderboardScope: scope }),
  leaderboardPeriod: 'weekly',
  setLeaderboardPeriod: (period) => set({ leaderboardPeriod: period }),
}));

// ============================================
// TOAST STATE (Custom Implementation)
// ============================================

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // Auto-remove after duration
    const duration = toast.duration || 3000;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));
