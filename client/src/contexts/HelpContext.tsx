import React, { createContext, useContext, useState, useEffect } from 'react';

interface HelpStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  page: string;
}

interface HelpContextType {
  isHelpActive: boolean;
  currentStep: number;
  steps: HelpStep[];
  startHelp: (page?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipHelp: () => void;
  finishHelp: () => void;
  isFirstTimeUser: boolean;
  setIsFirstTimeUser: (value: boolean) => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

const helpSteps: HelpStep[] = [
  {
    id: 'search',
    target: '[data-testid="search-input"]',
    title: 'Search for Rooms',
    content: 'Type room numbers like "M12" or "K15" to quickly find and navigate to any room on campus.',
    placement: 'bottom',
    page: 'map'
  },
  {
    id: 'floor-selector',
    target: '[data-testid="floor-1"]',
    title: 'Floor Navigation',
    content: 'Switch between floors to view rooms on different levels. The campus has 3 floors.',
    placement: 'bottom',
    page: 'map'
  },
  {
    id: 'zoom-controls',
    target: '[data-testid="zoom-in-button"]',
    title: 'Map Controls',
    content: 'Use these buttons to zoom in (+), zoom out (-), and center the map (⌂) for better navigation.',
    placement: 'right',
    page: 'map'
  },
  {
    id: 'room-click',
    target: '[data-testid="room-M12"]',
    title: 'Room Selection',
    content: 'Click on any room to select it as your starting point or destination for navigation.',
    placement: 'top',
    page: 'map'
  },
  {
    id: 'language-toggle',
    target: '[data-testid="button-lang-en"]',
    title: 'Language Options',
    content: 'Switch between English and Finnish using these language buttons.',
    placement: 'bottom',
    page: 'map'
  },
  {
    id: 'admin-panel',
    target: '[data-testid="button-admin"]',
    title: 'Admin Panel',
    content: 'Access administrative features to manage buildings, rooms, and campus data.',
    placement: 'bottom',
    page: 'map'
  }
];

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isHelpActive, setIsHelpActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  useEffect(() => {
    // Check if user has completed the help tour before
    const hasCompletedHelp = localStorage.getItem('ksyk-help-completed');
    if (!hasCompletedHelp) {
      setIsFirstTimeUser(true);
      // Auto-start help after a short delay for first-time users
      setTimeout(() => {
        startHelp();
      }, 2000);
    }
  }, []);

  const startHelp = (page: string = 'map') => {
    const pageSteps = helpSteps.filter(step => step.page === page);
    if (pageSteps.length > 0) {
      setCurrentStep(0);
      setIsHelpActive(true);
    }
  };

  const nextStep = () => {
    const pageSteps = helpSteps.filter(step => step.page === getCurrentPage());
    if (currentStep < pageSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishHelp();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipHelp = () => {
    setIsHelpActive(false);
    setCurrentStep(0);
    localStorage.setItem('ksyk-help-completed', 'true');
    setIsFirstTimeUser(false);
  };

  const finishHelp = () => {
    setIsHelpActive(false);
    setCurrentStep(0);
    localStorage.setItem('ksyk-help-completed', 'true');
    setIsFirstTimeUser(false);
  };

  const getCurrentPage = () => {
    return window.location.pathname.includes('/admin') ? 'admin' : 'map';
  };

  const getCurrentSteps = () => {
    return helpSteps.filter(step => step.page === getCurrentPage());
  };

  return (
    <HelpContext.Provider value={{
      isHelpActive,
      currentStep,
      steps: getCurrentSteps(),
      startHelp,
      nextStep,
      prevStep,
      skipHelp,
      finishHelp,
      isFirstTimeUser,
      setIsFirstTimeUser
    }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}