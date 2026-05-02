import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import WilmaHome from './wilma-home';
import WilmaParent from './wilma-parent';

/**
 * Wilma Router - Routes users to correct view based on role
 * 
 * Routing Rules:
 * - Students: /wilma/:studentId (6-digit ID)
 * - Parents: /wilma/:studentId (can switch children)
 * - Admin/Teacher: /wilma-admin/:id (Firebase ID)
 * 
 * This component checks the logged-in user's role and routes accordingly
 * FIXED: Prevents random logouts on back button
 */
export default function WilmaRouter() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/:section?');
  const [isValidating, setIsValidating] = useState(true);
  
  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('wilma_user');
    
    if (!storedUser) {
      // Not logged in, redirect to login
      setLocation('/wilma');
      setIsValidating(false);
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const roles = user.roles || [user.role];
      
      // Check if user should be on admin panel instead
      const isAdminRole = roles.some((r: string) => 
        ['admin', 'teacher', 'principal', 'vice_principal'].includes(r)
      );
      
      if (isAdminRole && match) {
        // Admin/Teacher trying to access student view - redirect to admin panel
        console.log('Admin/Teacher detected, redirecting to admin panel');
        setLocation(`/wilma-admin/${user.id}`);
        setIsValidating(false);
        return;
      }
      
      // For students and parents, allow navigation
      // Don't redirect on every route change - this was causing logouts
      setIsValidating(false);
      
    } catch (err) {
      console.error('Failed to parse stored user:', err);
      localStorage.removeItem('wilma_user');
      setLocation('/wilma');
      setIsValidating(false);
    }
  }, []); // Only run once on mount, not on every route change

  if (isValidating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003d82] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  // Get current user to determine which component to render
  const storedUser = localStorage.getItem('wilma_user');
  if (!storedUser) {
    return null; // Will redirect in useEffect
  }

  try {
    const user = JSON.parse(storedUser);
    
    // Render appropriate component based on role
    if (user.role === 'parent') {
      return <WilmaParent />;
    } else if (user.role === 'student') {
      return <WilmaHome />;
    } else {
      // Admin/Teacher should not reach here (redirected in useEffect)
      return null;
    }
  } catch (err) {
    return null;
  }
}
