import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, GraduationCap, MessageSquare, Settings, BarChart3, 
  LogOut, Home, Bell, FileText, Calendar, Shield
} from 'lucide-react';
import WilmaUserManager from '@/components/WilmaUserManager';

export default function WilmaAdmin() {
  const [, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('users');

  useEffect(() => {
    const storedAdmin = localStorage.getItem('wilma_admin');
    if (storedAdmin) {
      try {
        const admin = JSON.parse(storedAdmin);
        setCurrentAdmin(admin);
        setIsLoggedIn(true);
      } catch {
        localStorage.removeItem('wilma_admin');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    // Simple admin check - in production, this should be a proper API call
    if (username === 'admin' && password === 'admin123') {
      const admin = { username: 'admin', role: 'admin' };
      setCurrentAdmin(admin);
      setIsLoggedIn(true);
      localStorage.setItem('wilma_admin', JSON.stringify(admin));
    } else {
      setLoginError('Invalid credentials');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentAdmin(null);
    localStorage.removeItem('wilma_admin');
    setLocation('/');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="bg-[#003d82] text-white rounded-t-lg">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Shield className="w-6 h-6" />
              Wilma Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-center text-gray-600 mb-6">Backend Administration Panel</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {loginError}
                </div>
              )}
              <Button type="submit" className="w-full bg-[#003d82] hover:bg-[#0052a3]" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-[#003d82] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-semibold">Wilma Backend Admin</h1>
                <p className="text-sm text-blue-200">Management Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-600 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[#0052a3] border-b-2 border-[#003d82] shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'users', icon: Users, label: 'User Management' },
              { id: 'messages', icon: MessageSquare, label: 'Messages' },
              { id: 'analytics', icon: BarChart3, label: 'Analytics' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`px-4 py-3 text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeSection === item.id
                    ? 'bg-white text-[#003d82] font-semibold shadow-sm'
                    : 'text-white hover:bg-[#003d82]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeSection === 'users' && (
          <div>
            <WilmaUserManager />
          </div>
        )}

        {activeSection === 'messages' && (
          <Card>
            <CardHeader>
              <CardTitle>Message Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View and manage all Wilma messages</p>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">📧 Message management features coming soon</p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === 'analytics' && (
          <Card>
            <CardHeader>
              <CardTitle>Wilma Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Logins</p>
                  <p className="text-3xl font-bold text-blue-600">1,234</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-green-600">456</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Messages Sent</p>
                  <p className="text-3xl font-bold text-purple-600">789</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Wilma Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">Email Notifications</p>
                    <p className="text-sm text-gray-600">Send email notifications to users</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">Maintenance Mode</p>
                    <p className="text-sm text-gray-600">Enable maintenance mode for Wilma</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
