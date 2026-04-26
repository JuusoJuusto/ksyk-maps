import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Lock, User, AlertCircle } from "lucide-react";

interface WilmaAdminLoginProps {
  onLoginSuccess: () => void;
}

export default function WilmaAdminLogin({ onLoginSuccess }: WilmaAdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/wilma/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Login failed");
      }

      const user = await response.json();

      // Check if user is admin or teacher
      if (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'principal' && user.role !== 'vice_principal') {
        throw new Error("Access denied. Admin, teacher, or principal privileges required.");
      }

      // Store user in localStorage
      localStorage.setItem('wilma_admin_user', JSON.stringify(user));
      localStorage.setItem('wilma_admin_logged_in', 'true');

      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003d82] via-[#0052a3] to-[#0056b3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-2xl mb-4">
            <GraduationCap className="w-12 h-12 text-[#003d82]" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Wilma Admin</h1>
          <p className="text-blue-100">Kulosaaren yhteiskoulu</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-2xl text-center">Kirjaudu sisään</CardTitle>
            <CardDescription className="text-center">
              Syötä Wilma-tunnuksesi ja salasanasi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  <User className="w-4 h-4 inline mr-2" />
                  Käyttäjätunnus
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="esim. matti.meikalainen"
                  required
                  className="h-12 text-base"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Salasana
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 text-base"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-[#003d82] hover:bg-[#0052a3] text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Kirjaudutaan...
                  </>
                ) : (
                  "Kirjaudu sisään"
                )}
              </Button>

              <div className="text-center text-sm text-gray-600 mt-4">
                <p>Vain ylläpitäjät, opettajat ja rehtorit voivat kirjautua</p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-100 text-sm">
          <p>© 2026 Kulosaaren yhteiskoulu</p>
          <p className="mt-1">Wilma Admin Panel v3.0</p>
        </div>
      </div>
    </div>
  );
}
