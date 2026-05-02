import { useEffect } from 'react';
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
 */
export default function WilmaRouter() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/:section?');
  
  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('wilma_user');
    
    if (!storedUser) {
      // Not logged in, redirect to login
      setLocation('/wilma');
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
        return;
      }
      
      // Check if student/parent is trying to access wrong studentId
      if (match && params?.studentId) {
        const requestedStudentId = params.studentId;
        
        // For students, ensure they can only access their own studentId
        if (user.role === 'student' && user.studentId !== requestedStudentId) {
          console.log('Student trying to access different studentId, redirecting');
          setLocation(`/wilma/${user.studentId}`);
          return;
        }
        
        // For parents, check if requested studentId is one of their children
        if (user.role === 'parent') {
          // Parent can access any of their children's studentIds
          // This will be validated by the parent component
        }
      }
      
    } catch (err) {
      console.error('Failed to parse stored user:', err);
      localStorage.removeItem('wilma_user');
      setLocation('/wilma');
    }
  }, [match, params]);

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
