import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FirstTimePasswordChangeProps {
  open: boolean;
  onPasswordChanged: () => void;
  userId: string;
}

export default function FirstTimePasswordChange({
  open,
  onPasswordChanged,
  userId
}: FirstTimePasswordChangeProps) {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (newPassword.length < 8) {
      setError("Salasanan tulee olla vähintään 8 merkkiä pitkä");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Salasanat eivät täsmää");
      return;
    }

    if (newPassword === oldPassword) {
      setError("Uusi salasana ei voi olla sama kuin vanha");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/wilma/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          oldPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Salasanan vaihto epäonnistui');
      }

      // Update user in localStorage
      const storedUser = localStorage.getItem('wilma_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.isTemporaryPassword = false;
        localStorage.setItem('wilma_user', JSON.stringify(user));
      }

      toast({
        title: "✅ Salasana vaihdettu!",
        description: "Salasanasi on nyt päivitetty.",
      });

      onPasswordChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-6 h-6 text-blue-600" />
            Vaihda salasana
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Pakollinen toimenpide:</strong> Sinun on vaihdettava väliaikainen salasanasi ennen jatkamista.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="oldPassword">Vanha salasana *</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              placeholder="Syötä väliaikainen salasanasi"
            />
          </div>

          <div>
            <Label htmlFor="newPassword">Uusi salasana * (vähintään 8 merkkiä)</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Syötä uusi salasana"
            />
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-red-600 mt-1">Liian lyhyt ({newPassword.length}/8)</p>
            )}
            {newPassword.length >= 8 && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Salasana on riittävän pitkä
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Vahvista uusi salasana *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Syötä uusi salasana uudelleen"
            />
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <p className="text-xs text-red-600 mt-1">Salasanat eivät täsmää</p>
            )}
            {confirmPassword.length > 0 && confirmPassword === newPassword && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Salasanat täsmäävät
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Vaihdetaan...
              </>
            ) : (
              "Vaihda salasana"
            )}
          </Button>
        </form>

        <div className="text-xs text-gray-500 text-center">
          <p>Salasanan tulee sisältää vähintään 8 merkkiä.</p>
          <p>Suosittelemme käyttämään vahvaa salasanaa.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
