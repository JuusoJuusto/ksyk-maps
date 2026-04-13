import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import AdminDashboard from "@/components/AdminDashboard";
import { AdminLogin } from "@/components/AdminLogin";
import LoadingSpinner from "@/components/LoadingSpinner";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { LogOut, Home } from "lucide-react";

export default function Admin() {
  const [, setLocation] = useLocation();
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

  const handleLogout = () => {
    localStorage.removeItem('ksyk_admin_logged_in');
    localStorage.removeItem('ksyk_admin_user');
    setLocation('/'); // Go to home page
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen variant="white" message="Loading Admin Panel..." />;
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
        credentials: "include",
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
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-300 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-blue-900 mb-2">Change Your Password</h2>
            <p className="text-blue-600">You're using a temporary password. Please set a new one.</p>
          </div>
          
          <div className="space-y-4">
            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                {passwordError}
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
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
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            
            <button 
              onClick={handlePasswordChange}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
        <Header />
        <div className="max-w-md mx-auto mt-20 p-6">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-red-200 p-8 text-center">
            <div className="text-6xl text-red-500 mb-6">⚠️</div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Access Denied</h2>
            <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
            <p className="text-sm text-gray-500 mb-8">Current user: {(user as any)?.email || 'Unknown'}</p>
            <button 
              onClick={() => setLocation("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-lg"
            >
              <Home className="inline w-5 h-5 mr-2" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Top Announcement Banner */}
      <AnnouncementBanner />
      <Header />
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 w-full">
        {/* Enhanced Welcome Header */}
        <div className="mb-4 sm:mb-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">👨‍💼</span>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold">Admin Dashboard</h1>
                  <p className="text-blue-100 text-sm sm:text-base mt-1">
                    KSYK Maps Management Portal
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 inline-block">
                <p className="text-sm text-blue-100">Logged in as</p>
                <p className="text-lg font-semibold">{(user as any)?.firstName || (user as any)?.email}</p>
                <p className="text-xs text-blue-200 mt-1">
                  Role: {(user as any)?.role === 'owner' ? '👑 Owner' : '🔧 Administrator'}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-xs text-blue-100">System Status</p>
                <p className="text-2xl font-bold flex items-center justify-center gap-2">
                  <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLocation('/')}
                  className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white px-4 py-2 rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Dashboard Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <AdminDashboard />
        </div>
      </main>
    </div>
  );
}