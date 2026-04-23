import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout
const CHECK_INTERVAL = 60 * 1000; // Check every minute

export default function SessionTimeoutHandler() {
  const [, setLocation] = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      // Save current location as return path
      const currentPath = window.location.pathname;
      localStorage.setItem('wilma_return_path', currentPath);
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('wilma_user');
      setLocation('/wilma?session=expired');
    }
  }, [setLocation]);

  const extendSession = useCallback(() => {
    resetActivity();
    // Make a simple API call to extend the session
    fetch('/api/auth/user', { credentials: 'include' })
      .then(() => console.log('Session extended'))
      .catch(err => console.error('Failed to extend session:', err));
  }, [resetActivity]);

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      resetActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler);
      });
    };
  }, [resetActivity]);

  // Check session timeout
  useEffect(() => {
    const checkTimeout = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const remaining = SESSION_TIMEOUT - timeSinceActivity;

      if (remaining <= 0) {
        // Session expired
        handleLogout();
      } else if (remaining <= WARNING_TIME && !showWarning) {
        // Show warning
        setShowWarning(true);
        setTimeRemaining(Math.floor(remaining / 1000));
      } else if (remaining > WARNING_TIME && showWarning) {
        // Hide warning if user became active
        setShowWarning(false);
      }

      if (showWarning) {
        setTimeRemaining(Math.floor(remaining / 1000));
      }
    };

    const interval = setInterval(checkTimeout, CHECK_INTERVAL);
    checkTimeout(); // Check immediately

    return () => clearInterval(interval);
  }, [lastActivity, showWarning, handleLogout]);

  // Global error handler for 401 responses
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 401) {
        const clone = response.clone();
        try {
          const data = await clone.json();
          if (data.sessionExpired) {
            alert('Istuntosi on vanhentunut. Kirjaudu sisään uudelleen.');
            handleLogout();
          }
        } catch (e) {
          // Not JSON response, ignore
        }
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [handleLogout]);

  if (!showWarning) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <Card className="w-full max-w-md border-4 border-yellow-500 shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardTitle className="flex items-center gap-3 text-yellow-800">
            <div className="p-2 bg-yellow-200 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-700" />
            </div>
            <div>
              <p className="text-xl font-bold">Istunto vanhenee pian!</p>
              <p className="text-sm font-normal text-yellow-700">
                Istuntosi päättyy {minutes} minuutin ja {seconds} sekunnin kuluttua
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-300">
            <Clock className="w-12 h-12 text-yellow-600" />
            <div className="text-center">
              <p className="text-4xl font-bold text-yellow-800 tabular-nums">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </p>
              <p className="text-sm text-yellow-700 font-medium">jäljellä</p>
            </div>
          </div>

          <p className="text-center text-gray-700 font-medium">
            Haluatko jatkaa istuntoa vai kirjautua ulos?
          </p>

          <div className="flex gap-3">
            <Button
              onClick={extendSession}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              <Clock className="w-5 h-5 mr-2" />
              Jatka istuntoa
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1 border-2 border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 transition-all"
              size="lg"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Kirjaudu ulos
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 bg-gray-50 p-2 rounded">
            💡 Istunto päättyy automaattisesti 30 minuutin toimettomuuden jälkeen turvallisuussyistä.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
