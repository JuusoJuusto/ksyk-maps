import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function Landing() {
  const { t } = useTranslation();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary">KSYK Map</h1>
                <p className="text-xs text-muted-foreground">by OWL Apps</p>
              </div>
            </div>
            <Button onClick={handleLogin} data-testid="button-login">
              {t('login')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden m-8">
        <div 
          className="h-96 bg-cover bg-center relative" 
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600')"
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-5xl font-bold mb-4">Welcome to KSYK Map</h1>
              <p className="text-xl opacity-90 mb-8">{t('hero.subtitle')}</p>
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="text-lg px-8 py-4"
                data-testid="button-hero-login"
              >
                {t('login')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Navigate with Confidence</h2>
          <p className="text-lg text-muted-foreground">
            Discover our comprehensive school navigation system designed for students, staff, and visitors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-map-marked-alt text-2xl text-primary-foreground"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Maps</h3>
              <p className="text-muted-foreground">
                Navigate through our campus with detailed interactive floor plans and building layouts.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-2xl text-secondary-foreground"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Staff Directory</h3>
              <p className="text-muted-foreground">
                Find and contact our diverse international staff from 40+ nationalities.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-globe text-2xl text-accent-foreground"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Bilingual Support</h3>
              <p className="text-muted-foreground">
                Access information in both Finnish and English to match our bilingual education environment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 OWL Apps. Navigate with confidence.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
