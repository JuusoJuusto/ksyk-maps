import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from 'lucide-react';

export default function WilmaClassicLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    if (!username || !password) {
      setLoginError('Syötä käyttäjätunnus ja salasana');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/wilma/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();
      if (!response.ok) {
        setLoginError(data.message || 'Virheellinen käyttäjätunnus tai salasana');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('wilma_user', JSON.stringify(data));
      setUsername('');
      setPassword('');
      setIsLoading(false);
      
      // Role-based routing
      const roles = data.roles || [data.role];
      
      if (roles.includes('admin') || roles.includes('teacher') || roles.includes('principal') || roles.includes('vice_principal')) {
        setLocation(`/wilma-admin/${data.id}`);
      } else {
        setLocation(`/wilma/${data.id}`);
      }
    } catch {
      setLoginError('Yhteysvirhe. Tarkista palvelimen tila.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Classic Wilma Blue Header */}
      <div className="bg-[#003d82] text-white py-3 px-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-[#003d82] font-bold text-lg">W</span>
            </div>
            <h1 className="text-xl font-semibold">Wilma</h1>
          </div>
          <div className="text-sm">
            <a href="https://ksyk.fi" target="_blank" rel="noopener noreferrer" className="hover:underline">
              ksyk.fi
            </a>
          </div>
        </div>
      </div>

      {/* Login Content */}
      <div className="max-w-md mx-auto mt-16 px-4">
        {/* Login Box */}
        <div className="bg-white border border-gray-300 rounded shadow-sm">
          {/* Header */}
          <div className="bg-gradient-to-b from-[#e8f0fe] to-[#d3e3fd] border-b border-gray-300 px-4 py-3">
            <h2 className="text-lg font-semibold text-[#003d82]">Kirjaudu sisään</h2>
          </div>

          {/* Form */}
          <div className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Käyttäjätunnus
                </label>
                <Input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Käyttäjätunnus" 
                  required 
                  disabled={isLoading} 
                  className="w-full border-gray-300 focus:border-[#003d82] focus:ring-[#003d82]" 
                  autoComplete="username" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salasana
                </label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Salasana" 
                    required 
                    disabled={isLoading} 
                    className="w-full border-gray-300 focus:border-[#003d82] focus:ring-[#003d82] pr-10" 
                    autoComplete="current-password" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
                  {loginError}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#003d82] hover:bg-[#0052a3] text-white font-medium" 
                disabled={isLoading}
              >
                {isLoading ? 'Kirjaudutaan...' : 'Kirjaudu'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <a 
                href="/wilma/forgot-password" 
                className="text-sm text-[#003d82] hover:underline"
              >
                Unohditko salasanan?
              </a>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-4 bg-[#e6f2ff] border border-[#003d82] rounded p-4">
          <p className="text-sm text-[#003d82]">
            <strong>Huom!</strong> Eikö sinulla ole tunnuksia? Ota yhteyttä ylläpitäjään.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>© 2026 Wilma by Nordbyte Studio • Kaikki oikeudet pidätetään</p>
        </div>
      </div>
    </div>
  );
}
