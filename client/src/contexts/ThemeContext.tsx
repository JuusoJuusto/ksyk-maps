import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

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
        // Log to admin panel
        try {
          await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'error',
              message: `Theme loading error: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString(),
              source: 'ThemeContext'
            })
          });
        } catch (logError) {
          console.error('Failed to log error:', logError);
        }
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
    
    // Determine the actual theme to apply
    let actualTheme: 'light' | 'dark' = 'light';
    if (theme === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      actualTheme = prefersDark ? 'dark' : 'light';
    } else {
      actualTheme = theme;
    }
    
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark');
    
    // Add current theme class
    document.documentElement.classList.add(actualTheme);
    applyThemeStyles(actualTheme);
    
    // Sync with dark mode context for backward compatibility
    const isDark = actualTheme === 'dark';
    const darkModeEvent = new CustomEvent('themeChange', { detail: { isDark } });
    window.dispatchEvent(darkModeEvent);
  }, [theme]);

  const applyThemeStyles = (activeTheme: 'light' | 'dark') => {
    if (activeTheme === 'dark') {
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
  };

  const toggleTheme = () => {
    // Cycle through: light -> dark -> light (skip system in toggle)
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
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