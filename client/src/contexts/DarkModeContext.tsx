import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Listen for theme changes from the theme context
    const handleThemeChange = (event: CustomEvent) => {
      setDarkModeState(event.detail.isDark);
    };
    
    window.addEventListener('themeChange', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    // Don't manage dark class here anymore - let theme context handle it
  }, [darkMode]);

  const toggleDarkMode = () => {
    // This will be handled by the theme system now
    const currentTheme = localStorage.getItem('ksyk-theme') || 'light';
    let newTheme: 'light' | 'dark';
    
    if (currentTheme === 'light') {
      newTheme = 'dark';
    } else {
      newTheme = 'light';
    }
    
    // Trigger theme change
    const themeChangeEvent = new CustomEvent('manualThemeChange', { detail: { theme: newTheme } });
    window.dispatchEvent(themeChangeEvent);
  };

  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
  };

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}
