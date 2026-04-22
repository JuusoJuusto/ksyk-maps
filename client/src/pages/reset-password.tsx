import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Virheellinen palautuslinkki');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Salasanan on oltava vähintään 6 merkkiä');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Salasanat eivät täsmää');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setLocation('/wilma');
        }, 3000);
      } else {
        setError(data.message || 'Salasanan palautus epäonnistui');
      }
    } catch (error) {
      setError('Yhteysvirhe. Tarkista palvelimen tila.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003d82] via-[#0052a3] to-[#0066cc] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-green-500">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Salasana vaihdettu!
            </h2>
            <p className="text-gray-600 mb-4">
              Salasanasi on vaihdettu onnistuneesti. Sinut ohjataan kirjautumissivulle...
            </p>
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003d82] via-[#0052a3] to-[#0066cc] flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl relative z-10 border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white rounded-t-lg pb-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Lock className="w-10 h-10 text-[#003d82]" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">Palauta salasana</CardTitle>
            <p className="text-blue-100 text-sm">Syötä uusi salasanasi</p>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {!token ? (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="font-medium">Virheellinen palautuslinkki. Pyydä uusi linkki.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Uusi salasana
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Vähintään 6 merkkiä"
                    required
                    disabled={isLoading}
                    className="w-full h-12 text-base border-2 border-gray-300 focus:border-blue-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Vahvista salasana
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Kirjoita salasana uudelleen"
                    required
                    disabled={isLoading}
                    className="w-full h-12 text-base border-2 border-gray-300 focus:border-blue-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#003d82] to-[#0052a3] hover:from-[#0052a3] hover:to-[#0066cc] text-white text-lg font-bold shadow-lg transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Vaihdetaan...
                  </span>
                ) : (
                  'Vaihda salasana'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setLocation('/wilma')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                >
                  ← Takaisin kirjautumiseen
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
        <p className="opacity-80">© 2026 Wilma by SL Studio • Kaikki oikeudet pidätetään</p>
      </div>
    </div>
  );
}
