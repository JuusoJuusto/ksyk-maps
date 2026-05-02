import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface FirstTimePasswordDialogProps {
  open: boolean;
  user: any;
  onSuccess: () => void;
}

/**
 * First-Time Password Change Dialog
 * Forces users with temporary passwords to change their password
 * Cannot be closed until password is changed
 */
export default function FirstTimePasswordDialog({ open, user, onSuccess }: FirstTimePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch(`/api/wilma/users/${user.id}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          isFirstTime: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Salasanan vaihto epäonnistui');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update user in localStorage
      const updatedUser = { ...user, isTemporaryPassword: false };
      localStorage.setItem('wilma_user', JSON.stringify(updatedUser));
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      
      // Call success callback
      onSuccess();
    },
    onError: (error: any) => {
      setError(error.message || 'Salasanan vaihto epäonnistui');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Täytä kaikki kentät');
      return;
    }

    if (newPassword.length < 6) {
      setError('Uuden salasanan on oltava vähintään 6 merkkiä pitkä');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Uudet salasanat eivät täsmää');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Uuden salasanan on oltava eri kuin nykyinen salasana');
      return;
    }

    // Submit
    changePasswordMutation.mutate({
      currentPassword,
      newPassword
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Vaihda salasana</DialogTitle>
              <DialogDescription className="text-sm">
                Ensimmäinen kirjautuminen
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            Käytät väliaikaista salasanaa. Turvallisuussyistä sinun on vaihdettava salasanasi ennen jatkamista.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              Nykyinen salasana <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Syötä väliaikainen salasanasi"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              Uusi salasana <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Vähintään 6 merkkiä"
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Salasanan tulee olla vähintään 6 merkkiä pitkä
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Vahvista uusi salasana <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Syötä uusi salasana uudelleen"
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <DialogFooter>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Vaihdetaan...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Vaihda salasana
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

        <div className="text-xs text-gray-500 text-center mt-4">
          <p>Tämä ikkuna sulkeutuu automaattisesti salasanan vaihdon jälkeen.</p>
          <p className="mt-1">Et voi jatkaa ennen kuin olet vaihtanut salasanasi.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
