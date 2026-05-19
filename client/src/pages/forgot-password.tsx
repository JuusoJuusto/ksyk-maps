import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Syötä sähköpostiosoite');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
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
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <Card className="w-full max-w-md shadow-2xl relative z-10 border-2 border-green-500">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Sähköposti lähetetty!
            </h2>
            <p className="text-gray-600 mb-6">
              Jos sähköpostiosoite on rekisteröity, olet saanut linkin salasanan palauttamiseen.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Tarkista sähköpostisi ja seuraa ohjeita. Linkki on voimassa 1 tunnin ajan.
            </p>
            <Button
              onClick={() => setLocation('/wilma')}
              className="w-full bg-gradient-to-r from-[#003d82] to-[#0052a3] hover:from-[#0052a3] hover:to-[#0066cc]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Takaisin kirjautumiseen
            </Button>
          </CardContent>
        </Card>

        <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
          <p className="opacity-80">© 2026 Wilma by Nordbyte Studio • Kaikki oikeudet pidätetään</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003d82] via-[#0052a3] to-[#0066cc] flex items-center justify-center p-4">
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
              <Mail className="w-10 h-10 text-[#003d82]" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">Unohditko salasanan?</CardTitle>
            <p className="text-blue-100 text-sm">Syötä sähköpostiosoitteesi, niin lähetämme sinulle linkin salasanan palauttamiseen.</p>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Sähköpostiosoite
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="esim. matti.virtanen@koulu.fi"
                required
                disabled={isLoading}
                className="w-full h-12 text-base border-2 border-gray-300 focus:border-blue-500"
                autoComplete="email"
              />
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
                  Lähetetään...
                </span>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Lähetä palautuslinkki
                </>
              )}
            </Button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setLocation('/wilma')}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Takaisin kirjautumiseen
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Huom!</strong> Jos et saa sähköpostia, tarkista roskapostikansio tai ota yhteyttä ylläpitäjään.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
        <p className="opacity-80">© 2026 Wilma by Nordbyte Studio • Kaikki oikeudet pidätetään</p>
      </div>
    </div>
  );
}
