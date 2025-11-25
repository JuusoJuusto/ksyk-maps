import { useState, useEffect } from "react";
import Header from "@/components/Header";
import AdminDashboard from "@/components/AdminDashboard";
import { AdminLogin } from "@/components/AdminLogin";

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    // Check authentication status from localStorage
    const checkAuth = () => {
      try {
        const isLoggedIn = localStorage.getItem('ksyk_admin_logged_in');
        const storedUser = localStorage.getItem('ksyk_admin_user');
        
        if (isLoggedIn === 'true' && storedUser) {
          // User is logged in
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } else {
          // Not logged in
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setError(err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show password change modal if temporary password
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword })
      });
      
      if (!response.ok) {
        throw new Error("Failed to change password");
      }
      
      alert("Password changed successfully!");
      setShowPasswordChange(false);
      window.location.reload();
    } catch (error) {
      setPasswordError("Failed to change password");
    }
  };

  if (showPasswordChange) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-200 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-blue-900 mb-2">Change Your Password</h2>
            <p className="text-blue-600">You're using a temporary password. Please set a new one.</p>
          </div>
          
          <div className="space-y-4">
            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
                {passwordError}
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ For security, you must change your temporary password before continuing.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            
            <button 
              onClick={handlePasswordChange}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold"
            >
              Change Password & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return <AdminLogin onLoginSuccess={() => window.location.reload()} />;
  }

  // Check if user is admin (accept both 'admin' and 'owner' roles)
  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'owner';

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-md mx-auto mt-20 p-6">
          <div className="bg-card rounded-lg shadow-lg border border-border p-8 text-center">
            <div className="text-6xl text-red-500 mb-6">⚠️</div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
            <p className="text-sm text-muted-foreground mb-8">Current user: {(user as any)?.email || 'Unknown'}</p>
            <button 
              onClick={() => window.location.href = "/"}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render admin dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {(user as any)?.email}</p>
            </div>
          </div>
        </div>
        <AdminDashboard />
      </main>
    </div>
  );
}