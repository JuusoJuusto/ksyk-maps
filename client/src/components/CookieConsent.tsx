import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Cookie } from "lucide-react";

const fireConsentEvent = () =>
  window.dispatchEvent(new CustomEvent('ksyk:analytics-consent'));

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true, analytics: true, timestamp: new Date().toISOString(),
    }));
    fireConsentEvent();
    setShow(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true, analytics: false, timestamp: new Date().toISOString(),
    }));
    setShow(false);
  };

  const acceptCustom = (analytics: boolean) => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true, analytics, timestamp: new Date().toISOString(),
    }));
    if (analytics) fireConsentEvent();
    setShow(false);
    setShowDetails(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <Card className="w-full max-w-2xl bg-white shadow-2xl border-2 border-gray-200 pointer-events-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Cookie className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Evästeet</h3>
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
              <p className="text-sm text-gray-700 mb-6">
                Käytämme välttämättömiä evästeitä sivuston toiminnan varmistamiseksi.
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
                  Muokkaa
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900">Analytiikka</h4>
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
                      Auttaa parantamaan palvelua
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    const analytics = (document.getElementById('analytics') as HTMLInputElement)?.checked;
                    acceptCustom(analytics);
                  }}
                  className="flex-1 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white hover:opacity-90"
                >
                  Tallenna
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
        </div>
      </Card>
    </div>
  );
}
