import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Cookie, Shield, BarChart3 } from "lucide-react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Show banner after 1 second
      setTimeout(() => setShow(true), 1000);
    } else {
      // Initialize analytics if consent given
      const consentData = JSON.parse(consent);
      if (consentData.analytics) {
        initializeAnalytics();
      }
    }
  }, []);

  const initializeAnalytics = () => {
    // Track page views
    trackPageView();
    
    // Track user interactions
    window.addEventListener('click', trackClick);
    
    // Track session duration
    const sessionStart = Date.now();
    window.addEventListener('beforeunload', () => {
      const duration = Date.now() - sessionStart;
      trackEvent('session_duration', { duration });
    });
  };

  const trackPageView = () => {
    const data = {
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    };
    
    // Send to analytics endpoint
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(console.error);
  };

  const trackClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A') {
      trackEvent('click', {
        element: target.tagName,
        text: target.textContent?.substring(0, 50),
        href: (target as HTMLAnchorElement).href
      });
    }
  };

  const trackEvent = (eventName: string, data: any) => {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        data,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  };

  const acceptAll = () => {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookie_consent', JSON.stringify(consent));
    initializeAnalytics();
    setShow(false);
  };

  const acceptNecessary = () => {
    const consent = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookie_consent', JSON.stringify(consent));
    setShow(false);
  };

  const acceptCustom = (analytics: boolean, marketing: boolean) => {
    const consent = {
      necessary: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookie_consent', JSON.stringify(consent));
    if (analytics) {
      initializeAnalytics();
    }
    setShow(false);
    setShowDetails(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <Card className="w-full max-w-2xl bg-white shadow-2xl border-2 border-gray-200 pointer-events-auto animate-slideUp">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Cookie className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Evästeet ja tietosuoja</h3>
                <p className="text-sm text-gray-600">Käytämme evästeitä parantaaksemme käyttökokemustasi</p>
              </div>
            </div>
            <Button
              onClick={() => setShow(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {!showDetails ? (
            <>
              {/* Simple View */}
              <p className="text-sm text-gray-700 mb-6">
                Käytämme välttämättömiä evästeitä sivuston toiminnan varmistamiseksi ja analytiikkaevästeitä 
                palvelun parantamiseksi. Voit hallita evästeasetuksiasi alla.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={acceptAll}
                  className="flex-1 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white hover:opacity-90"
                >
                  Hyväksy kaikki
                </Button>
                <Button
                  onClick={acceptNecessary}
                  variant="outline"
                  className="flex-1"
                >
                  Vain välttämättömät
                </Button>
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="outline"
                  className="flex-1"
                >
                  Muokkaa asetuksia
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Detailed View */}
              <div className="space-y-4 mb-6">
                {/* Necessary Cookies */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900">Välttämättömät evästeet</h4>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                        Aina käytössä
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Nämä evästeet ovat välttämättömiä sivuston perustoimintojen, kuten kirjautumisen ja 
                      navigoinnin, mahdollistamiseksi.
                    </p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900">Analytiikkaevästeet</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="analytics"
                          defaultChecked
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600">
                      Auttavat meitä ymmärtämään, miten käytät sivustoa, jotta voimme parantaa palvelua. 
                      Tiedot ovat anonyymejä.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    const analytics = (document.getElementById('analytics') as HTMLInputElement)?.checked;
                    acceptCustom(analytics, false);
                  }}
                  className="flex-1 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white hover:opacity-90"
                >
                  Tallenna asetukset
                </Button>
                <Button
                  onClick={() => setShowDetails(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Takaisin
                </Button>
              </div>
            </>
          )}

          {/* Footer Links */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Lue lisää{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">tietosuojaselosteestamme</a>
              {' '}ja{' '}
              <a href="/cookies" className="text-blue-600 hover:underline">evästekäytännöistämme</a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
