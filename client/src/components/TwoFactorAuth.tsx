import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Smartphone, Key, CheckCircle, XCircle, Copy, Check } from "lucide-react";
import QRCode from "react-qr-code";

export default function TwoFactorAuth() {
  const queryClient = useQueryClient();
  const [verificationCode, setVerificationCode] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get current user
  const storedUser = localStorage.getItem('ksyk_admin_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  // Check 2FA status
  const { data: twoFactorStatus } = useQuery({
    queryKey: ["2fa-status", currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/auth/2fa/status`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch 2FA status");
      return response.json();
    },
    enabled: !!currentUser,
  });

  // Generate 2FA secret
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/2fa/generate", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate 2FA secret");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setShowSetup(true);
    },
  });

  // Enable 2FA
  const enableMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enable 2FA");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setShowSetup(false);
      setSetupCode("");
      alert("2FA enabled successfully!");
    },
  });

  // Disable 2FA
  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to disable 2FA");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setVerificationCode("");
      alert("2FA disabled successfully!");
    },
  });

  const handleCopySecret = () => {
    if (twoFactorStatus?.secret) {
      navigator.clipboard.writeText(twoFactorStatus.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEnableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupCode.length === 6) {
      enableMutation.mutate(setupCode);
    }
  };

  const handleDisableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length === 6) {
      if (confirm("Are you sure you want to disable 2FA? This will make your account less secure.")) {
        disableMutation.mutate(verificationCode);
      }
    }
  };

  if (!currentUser) {
    return (
      <Alert>
        <AlertDescription>Please log in to manage 2FA settings.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription className="text-blue-100">
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* Current Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {twoFactorStatus?.enabled ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900">2FA is Enabled</p>
                      <p className="text-sm text-gray-600">Your account is protected</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-orange-600" />
                    <div>
                      <p className="font-semibold text-gray-900">2FA is Disabled</p>
                      <p className="text-sm text-gray-600">Enable 2FA for better security</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Enable 2FA Section */}
          {!twoFactorStatus?.enabled && !showSetup && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  How it works
                </h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                  <li>Scan the QR code or enter the secret key</li>
                  <li>Enter the 6-digit code from your app to verify</li>
                  <li>You'll need this code every time you log in</li>
                </ul>
              </div>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}

          {/* Setup 2FA */}
          {showSetup && twoFactorStatus?.secret && (
            <div className="space-y-6">
              <Alert>
                <AlertDescription>
                  Scan this QR code with your authenticator app or manually enter the secret key.
                </AlertDescription>
              </Alert>

              {/* QR Code */}
              <div className="flex justify-center p-6 bg-white border-2 border-gray-200 rounded-lg">
                <QRCode
                  value={twoFactorStatus.otpauthUrl || `otpauth://totp/KSYK:${currentUser.email}?secret=${twoFactorStatus.secret}&issuer=KSYK`}
                  size={200}
                />
              </div>

              {/* Manual Entry */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Or enter this secret key manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-sm">
                    {twoFactorStatus.secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopySecret}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Verification */}
              <form onSubmit={handleEnableSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="setupCode">Enter 6-digit code from your app</Label>
                  <Input
                    id="setupCode"
                    type="text"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={setupCode.length !== 6 || enableMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Verify & Enable
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowSetup(false);
                      setSetupCode("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Disable 2FA Section */}
          {twoFactorStatus?.enabled && (
            <div className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800">
                  Disabling 2FA will make your account less secure. You'll only need your password to log in.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleDisableSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="verificationCode">Enter 6-digit code to disable 2FA</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={verificationCode.length !== 6 || disableMutation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Disable Two-Factor Authentication
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Codes Section */}
      {twoFactorStatus?.enabled && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Backup Codes
            </CardTitle>
            <CardDescription className="text-gray-300">
              Save these codes in a safe place. You can use them if you lose access to your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                ⚠️ Feature coming soon: Backup codes will be generated when you enable 2FA.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
