import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'neon' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  neonUnlocked: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('ksyk-theme');
    return (saved as Theme) || 'light';
  });
  
  const [neonUnlocked, setNeonUnlocked] = useState(() => {
    return localStorage.getItem('ksyk_neon_unlocked') === 'true';
  });

  useEffect(() => {
    // Check if neon is unlocked
    const checkNeonUnlock = () => {
      const unlocked = localStorage.getItem('ksyk_neon_unlocked') === 'true';
      setNeonUnlocked(unlocked);
    };
    
    checkNeonUnlock();
    const interval = setInterval(checkNeonUnlock, 1000);
    return () => clearInterval(interval);
  }, []);

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
    let actualTheme: 'light' | 'dark' | 'neon' = 'light';
    if (theme === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      actualTheme = prefersDark ? 'dark' : 'light';
    } else {
      actualTheme = theme as 'light' | 'dark' | 'neon';
    }
    
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark', 'neon');
    
    // Add current theme class
    document.documentElement.classList.add(actualTheme);
    applyThemeStyles(actualTheme);
    
    // Sync with dark mode context for backward compatibility
    const isDark = actualTheme === 'dark' || actualTheme === 'neon';
    const darkModeEvent = new CustomEvent('themeChange', { detail: { isDark } });
    window.dispatchEvent(darkModeEvent);
  }, [theme]);

  const applyThemeStyles = (activeTheme: 'light' | 'dark' | 'neon') => {
    if (activeTheme === 'neon') {
      // Neon theme - cyberpunk style with dark blue-purple base
      document.documentElement.style.setProperty('--bg-primary', '#0d1117');
      document.documentElement.style.setProperty('--bg-secondary', '#161b22');
      document.documentElement.style.setProperty('--text-primary', '#00ff88');
      document.documentElement.style.setProperty('--text-secondary', '#00cc66');
      document.documentElement.style.setProperty('--accent', '#ff00ff');
      document.documentElement.style.setProperty('--border', '#00ff88');
      document.documentElement.style.setProperty('--tooltip-bg', '#161b22');
      document.documentElement.style.setProperty('--tooltip-text', '#00ff88');
      document.body.style.background = 'linear-gradient(135deg, #0d1117 0%, #1a0a2e 100%)';
    } else if (activeTheme === 'dark') {
      // Modern dark theme - inspired by Discord, Slack, VS Code
      // Using slate/gray tones instead of pure black
      document.documentElement.style.setProperty('--bg-primary', '#1e1e2e'); // Soft dark purple-gray
      document.documentElement.style.setProperty('--bg-secondary', '#2a2a3e'); // Slightly lighter
      document.documentElement.style.setProperty('--text-primary', '#e0e0e6'); // Soft white
      document.documentElement.style.setProperty('--text-secondary', '#b4b4c8'); // Muted gray
      document.documentElement.style.setProperty('--accent', '#5865f2'); // Discord-like blue
      document.documentElement.style.setProperty('--border', '#3a3a4e'); // Subtle borders
      document.documentElement.style.setProperty('--tooltip-bg', '#2a2a3e');
      document.documentElement.style.setProperty('--tooltip-text', '#e0e0e6');
      document.body.style.background = 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)';
    } else {
      // Light theme - clean and modern
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f8fafc');
      document.documentElement.style.setProperty('--text-primary', '#0f172a');
      document.documentElement.style.setProperty('--text-secondary', '#475569');
      document.documentElement.style.setProperty('--accent', '#3b82f6');
      document.documentElement.style.setProperty('--border', '#e2e8f0');
      document.documentElement.style.setProperty('--tooltip-bg', '#1f2937');
      document.documentElement.style.setProperty('--tooltip-text', '#ffffff');
      document.body.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
    }
  };

  const toggleTheme = () => {
    // Cycle through: light -> dark -> neon (if unlocked) -> light
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark' && neonUnlocked) {
      setTheme('neon');
    } else {
      setTheme('light');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, neonUnlocked }}>
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