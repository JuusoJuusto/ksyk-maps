import { useState, useEffect } from "react";
import Header from "@/components/Header";
import AdminDashboard from "@/components/AdminDashboard";
import { AdminLogin } from "@/components/AdminLogin";

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // Check authentication status once
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
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

  // Show login prompt if not authenticated
  if (!user) {
    return <AdminLogin onLoginSuccess={() => window.location.reload()} />;
  }

  // Check if user is admin
  const isAdmin = (user as any)?.role === 'admin';

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome, {(user as any)?.email}</p>
          </div>
          <button 
            onClick={() => window.location.href = "/api/logout"}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Logout
          </button>
        </div>
        <AdminDashboard />
      </main>
    </div>
  );
}