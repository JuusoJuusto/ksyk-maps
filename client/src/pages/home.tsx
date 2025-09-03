import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import InteractiveMap from "@/components/InteractiveMap";
import StaffDirectory from "@/components/StaffDirectory";
import QuickActions from "@/components/QuickActions";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('unauthorized'),
        description: t('unauthorized.desc'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, t]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden mb-8">
          <div 
            className="h-64 bg-cover bg-center relative" 
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600')"
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-4xl font-bold mb-2">{t('hero.title')}</h1>
                <p className="text-lg opacity-90">{t('hero.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input 
                type="text" 
                placeholder={t('search.placeholder')}
                className="w-full pl-12 pr-4 py-4 text-lg bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent shadow-sm"
                data-testid="input-global-search"
              />
              <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl"></i>
              <button 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                data-testid="button-navigate"
              >
                <i className="fas fa-route mr-2"></i>{t('search.navigate')}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactive Map Section */}
          <div className="lg:col-span-2">
            <InteractiveMap />
          </div>
          
          {/* Quick Actions & Information */}
          <div className="space-y-6">
            <QuickActions />
          </div>
        </div>
        
        {/* Staff Directory Section */}
        <div className="mt-12">
          <StaffDirectory />
        </div>
      </main>
    </div>
  );
}
