import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'blueprint';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('ksyk-theme');
    return (saved as Theme) || 'light';
  });

  useEffect(() => {
    // Load theme from server settings on app start
    const loadThemeFromServer = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          if (settings.theme && settings.theme !== theme) {
            setTheme(settings.theme);
          }
        }
      } catch (error) {
        console.error('Failed to load theme from server:', error);
      }
    };
    
    // Listen for manual theme changes from dark mode toggle
    const handleManualThemeChange = (event: CustomEvent) => {
      setTheme(event.detail.theme);
    };
    
    loadThemeFromServer();
    window.addEventListener('manualThemeChange', handleManualThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('manualThemeChange', handleManualThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ksyk-theme', theme);
    
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark', 'blueprint');
    
    // Add current theme class
    document.documentElement.classList.add(theme);
    
    // Apply theme-specific styles and tooltip colors
    if (theme === 'blueprint') {
      document.documentElement.style.setProperty('--bg-primary', '#0a1628');
      document.documentElement.style.setProperty('--bg-secondary', '#1e3a8a');
      document.documentElement.style.setProperty('--text-primary', '#00d4ff');
      document.documentElement.style.setProperty('--text-secondary', '#7dd3fc');
      document.documentElement.style.setProperty('--accent', '#0ea5e9');
      document.documentElement.style.setProperty('--border', '#1e40af');
      document.documentElement.style.setProperty('--tooltip-bg', '#0a1628');
      document.documentElement.style.setProperty('--tooltip-text', '#00d4ff');
    } else if (theme === 'dark') {
      document.documentElement.style.setProperty('--bg-primary', '#0f172a');
      document.documentElement.style.setProperty('--bg-secondary', '#1e293b');
      document.documentElement.style.setProperty('--text-primary', '#f1f5f9');
      document.documentElement.style.setProperty('--text-secondary', '#cbd5e1');
      document.documentElement.style.setProperty('--accent', '#3b82f6');
      document.documentElement.style.setProperty('--border', '#334155');
      document.documentElement.style.setProperty('--tooltip-bg', '#1f2937');
      document.documentElement.style.setProperty('--tooltip-text', '#f1f5f9');
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f8fafc');
      document.documentElement.style.setProperty('--text-primary', '#0f172a');
      document.documentElement.style.setProperty('--text-secondary', '#475569');
      document.documentElement.style.setProperty('--accent', '#3b82f6');
      document.documentElement.style.setProperty('--border', '#e2e8f0');
      document.documentElement.style.setProperty('--tooltip-bg', '#1f2937');
      document.documentElement.style.setProperty('--tooltip-text', '#ffffff');
    }
    
    // Sync with dark mode context for backward compatibility
    const isDark = theme === 'dark' || theme === 'blueprint';
    const darkModeEvent = new CustomEvent('themeChange', { detail: { isDark } });
    window.dispatchEvent(darkModeEvent);
  }, [theme]);

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'blueprint'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}