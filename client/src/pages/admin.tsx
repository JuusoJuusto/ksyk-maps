import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import AdminDashboard from "@/components/AdminDashboard";
import { useTranslation } from "react-i18next";

export default function Admin() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  // Check if user is admin
  const isAdmin = (user as any)?.role === 'admin';

  // Handle authentication for admin features
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('unauthorized'),
        description: "Please log in to access admin features.",
        variant: "destructive",
      });
    }

    if (!isLoading && isAuthenticated && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required to access this page.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, isLoading, isAdmin, toast, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-md mx-auto mt-20 p-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
            <i className="fas fa-lock text-4xl text-muted-foreground mb-4"></i>
            <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
            <p className="text-muted-foreground mb-6">Please log in to access the admin panel.</p>
            <button 
              onClick={() => window.location.href = "/api/login"}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-md mx-auto mt-20 p-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-destructive mb-4"></i>
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
            <button 
              onClick={() => window.location.href = "/"}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard />
      </main>
    </div>
  );
}
