/**
 * KSYK Maps — admin profile dialog (v4.7.49).
 *
 * Opens when the admin taps their user chip in the sidebar / mobile
 * top bar.  Provides name + email + password change in a single
 * Wilma-style document dialog.  All fields are optional — server
 * merges only the ones the user typed into.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAdminHeaders } from "@/lib/adminAuth";
import { cn } from "@/lib/utils";
import {
  User as UserIcon, Mail, Lock, Eye, EyeOff, X, LogOut, Save, AlertCircle, CheckCircle2,
} from "lucide-react";

export interface AdminProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string | null;
  } | null;
  onLogout: () => void;
}

export default function AdminProfileDialog({
  open,
  onOpenChange,
  currentUser,
  onLogout,
}: AdminProfileDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(currentUser?.name ?? "");
      setEmail(currentUser?.email ?? "");
      setCurrentPassword("");
      setNewPassword("");
      setError(null);
    }
  }, [open, currentUser]);

  const initial = (currentUser?.email || currentUser?.name || "?").slice(0, 1).toUpperCase();
  const roleLabel = currentUser?.role === "owner" ? "Owner" : currentUser?.role === "admin" ? "Admin" : "Staff";

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    setError(null);
    setSaving(true);

    const changes: Record<string, string> = {};
    if (name && name !== currentUser?.name) changes.name = name.trim();
    if (email && email !== currentUser?.email) changes.email = email.trim().toLowerCase();
    if (newPassword) {
      if (!currentPassword) {
        setError("Enter your current password to change it.");
        setSaving(false);
        return;
      }
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        setSaving(false);
        return;
      }
      changes.currentPassword = currentPassword;
      changes.newPassword = newPassword;
    }

    if (Object.keys(changes).length === 0) {
      toast({ title: "No changes to save" });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        credentials: "include",
        body: JSON.stringify(changes),
      });

      // Server endpoint isn't wired everywhere yet (Vercel serverless
      // doesn't ship this route as of v4.7.49).  Fall back to a local
      // update for display-only fields so the change still sticks in
      // the current session — real persistence lands once the API
      // endpoint is deployed.
      if (res.status === 404 || res.status === 405) {
        if (changes.currentPassword || changes.newPassword) {
          throw new Error("Password change not available yet.");
        }
        const merged = { ...(currentUser ?? {}), name: changes.name ?? currentUser?.name, email: changes.email ?? currentUser?.email };
        try { localStorage.setItem("ksyk_admin_user", JSON.stringify(merged)); } catch { /* */ }
        toast({
          title: "Saved locally",
          description: "Server persistence for profile edits ships in a later update.",
        });
        onOpenChange(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? `Save failed (${res.status})`);
      }
      const updated = await res.json().catch(() => null);
      if (updated?.user) {
        try { localStorage.setItem("ksyk_admin_user", JSON.stringify(updated.user)); } catch { /* */ }
      }
      toast({ title: "Profile updated" });
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // v4.7.57 — leave the shadcn default centered-positioning
          // alone (fixed left-50% top-50% translate -50/-50 max-w-lg).
          // Override its layout but NOT its position on desktop; only
          // flip to full-screen on mobile (<640px).
          "p-0 gap-0 overflow-hidden flex flex-col",
          "bg-white dark:bg-gray-950",
          "shadow-[0_24px_60px_-12px_rgba(15,23,42,0.4)]",
          "border border-[#d5dae0] dark:border-[#2a3040]",
          "border-t-[3px] border-t-[#003d82]",
          "[&>button:first-of-type]:hidden",
          // Desktop (default + sm+): comfortable size
          "w-[min(94vw,40rem)] max-w-[40rem] max-h-[88dvh]",
          "rounded-[8px]",
          // Mobile (<640px): full-screen takeover.  max-sm: breakpoint
          // reaches below sm.
          "max-sm:fixed max-sm:inset-0 max-sm:translate-x-0 max-sm:translate-y-0",
          "max-sm:left-0 max-sm:top-0 max-sm:right-0 max-sm:bottom-0",
          "max-sm:w-screen max-sm:h-[100dvh] max-sm:max-w-none max-sm:max-h-none",
          "max-sm:rounded-none max-sm:border-x-0 max-sm:border-b-0",
        )}
      >
        {/* Header */}
        <div
          className="shrink-0 border-b border-[#d5dae0] dark:border-[#2a3040] px-5 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9]">
              {roleLabel}
            </p>
            <DialogTitle className="text-[20px] sm:text-[24px] font-bold tracking-tight leading-tight text-gray-900 dark:text-white mt-0.5">
              Profile settings
            </DialogTitle>
            <DialogDescription className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              Update your display name, email, or password.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="shrink-0 h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        {/* Body — min-h-0 is reliable scroll pattern, h-0 was the bug */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
          {/* Identity row */}
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-[#d5dae0] dark:border-[#2a3040]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] bg-[#003d82] text-white text-[18px] font-bold">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-gray-900 dark:text-white truncate">
                {currentUser?.name || currentUser?.email || "Admin"}
              </p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                {currentUser?.email ?? "—"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <div className="rounded-[6px] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" strokeWidth={2.25} />
                <p className="text-[13px] font-semibold text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Profile section */}
            <section>
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">
                Profile
              </p>
              <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] divide-y divide-[#d5dae0] dark:divide-[#2a3040]">
                <div className="p-3 space-y-1.5">
                  <Label htmlFor="profile-name" className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <UserIcon className="h-3 w-3" strokeWidth={2.25} />
                    Display name
                  </Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="h-10 rounded-[6px] text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
                  />
                </div>
                <div className="p-3 space-y-1.5">
                  <Label htmlFor="profile-email" className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Mail className="h-3 w-3" strokeWidth={2.25} />
                    Email
                  </Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="you@ksyk.fi"
                    autoComplete="email"
                    className="h-10 rounded-[6px] text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
                  />
                </div>
              </div>
            </section>

            {/* Password section */}
            <section>
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">
                Password
              </p>
              <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] divide-y divide-[#d5dae0] dark:divide-[#2a3040]">
                <div className="p-3 space-y-1.5">
                  <Label htmlFor="profile-current" className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Lock className="h-3 w-3" strokeWidth={2.25} />
                    Current password
                  </Label>
                  <div className="relative">
                    <Input
                      id="profile-current"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Only needed to change password"
                      autoComplete="current-password"
                      className="h-10 pr-10 rounded-[6px] text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      tabIndex={-1}
                      aria-label={showCurrent ? "Hide" : "Show"}
                    >
                      {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <Label htmlFor="profile-new" className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Lock className="h-3 w-3" strokeWidth={2.25} />
                    New password
                  </Label>
                  <div className="relative">
                    <Input
                      id="profile-new"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="h-10 pr-10 rounded-[6px] text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      tabIndex={-1}
                      aria-label={showNew ? "Hide" : "Show"}
                    >
                      {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {newPassword && newPassword.length >= 8 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.25} />
                      Meets minimum length
                    </p>
                  )}
                </div>
              </div>
            </section>

          </form>
        </div>

        {/* v1.0.1 — pulled actions out of the scrollable body into a
         *  sticky footer so Save/Sign-out are always visible on short
         *  viewports (e.g. mobile landscape or 150% zoom). */}
        <div
          className="shrink-0 border-t border-[#d5dae0] dark:border-[#2a3040] px-5 sm:px-6 py-3 flex items-center gap-2 bg-white dark:bg-gray-950"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-bold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="h-10 px-3.5 rounded-[6px] border border-[#d5dae0] dark:border-[#2a3040] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[13px] font-bold inline-flex items-center gap-2 transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
