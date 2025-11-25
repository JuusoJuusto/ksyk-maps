import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface LoginResponse {
  success: boolean;
  user?: any;
  message?: string;
  requirePasswordChange?: boolean;
}

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
      // Use Firebase Auth directly for login
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      
      try {
        // Try Firebase Auth first
        const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        
        // Verify with backend
        const response = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Login failed");
        }
        
        const data = await response.json();
        return { ...data, firebaseUser: userCredential.user };
      } catch (firebaseError: any) {
        // If Firebase auth fails, try backend only (for hardcoded credentials)
        const response = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Login failed");
        }
        
        return response.json();
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        // Store user info in localStorage for persistence
        localStorage.setItem('ksyk_admin_user', JSON.stringify(data.user));
        localStorage.setItem('ksyk_admin_logged_in', 'true');
        
        if (data.requirePasswordChange) {
          setShowPasswordChange(true);
        } else {
          // Redirect to admin portal
          window.location.href = "/admin-ksyk-management-portal";
        }
      } else {
        setError(data.message || "Login failed");
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    loginMutation.mutate({ email, password });
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword })
      });
      
      if (!response.ok) {
        throw new Error("Failed to change password");
      }
      
      alert("Password changed successfully!");
      setLocation("/admin-ksyk-management-portal");
    } catch (error) {
      setError("Failed to change password");
    }
  };

  if (showPasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200">
          <CardHeader className="text-center bg-white border-b-2 border-blue-100">
            <CardTitle className="text-2xl font-bold text-blue-900">Change Your Password</CardTitle>
            <CardDescription className="text-blue-600">
              You're using a temporary password. Please set a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ For security, you must change your temporary password before continuing.
                </p>
              </div>
              
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              
              <div>
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              
              <Button 
                onClick={handlePasswordChange}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Change Password & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200 relative z-10">
        <CardHeader className="text-center bg-white border-b-2 border-blue-100 rounded-t-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-blue-900">KSYK Admin Portal</CardTitle>
          <CardDescription className="text-blue-600 text-lg">
            Secure access to campus management system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ksyk.fi"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginMutation.isPending}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg font-semibold shadow-lg text-white" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In to Dashboard
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-semibold mb-2">Owner Access Only</p>
              <p className="text-xs text-blue-600 mt-2">
                Contact the system owner for admin credentials
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}