import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=open]:duration-[200ms] data-[state=closed]:duration-[160ms]",
          )}
        />

        {/* Dialog / Sheet */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            // Base
            "fixed z-50 flex flex-col overflow-hidden outline-none",
            "bg-white dark:bg-gray-950",
            "border border-[#d5dae0] dark:border-[#2a3040]",
            "shadow-[0_24px_60px_-12px_rgba(15,23,42,0.4)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=open]:duration-[220ms] data-[state=open]:ease-out",
            "data-[state=closed]:duration-[160ms] data-[state=closed]:ease-in",
            // Desktop — centered modal
            "sm:left-[50%] sm:top-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:w-[min(94vw,40rem)] sm:max-h-[88dvh]",
            "sm:rounded-[8px] sm:border-t-[3px] sm:border-t-[#003d82]",
            "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
            // Mobile — bottom sheet, slides up from bottom
            "max-sm:bottom-0 max-sm:left-0 max-sm:right-0",
            "max-sm:w-full max-sm:max-h-[92dvh]",
            "max-sm:rounded-t-[20px] max-sm:border-x-0 max-sm:border-b-0 max-sm:border-t-[3px] max-sm:border-t-[#003d82]",
            "max-sm:data-[state=open]:slide-in-from-bottom-[15%]",
            "max-sm:data-[state=closed]:slide-out-to-bottom-[30%]",
          )}
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden shrink-0 flex justify-center pt-3 pb-0" aria-hidden>
            <div className="w-9 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>

          {/* Header */}
          <div
            className="shrink-0 border-b border-[#d5dae0] dark:border-[#2a3040] px-5 sm:px-6 py-4 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9]">
                {roleLabel}
              </p>
              <DialogPrimitive.Title className="text-[20px] sm:text-[24px] font-bold tracking-tight leading-tight text-gray-900 dark:text-white mt-0.5">
                Profile settings
              </DialogPrimitive.Title>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                Update your display name, email, or password.
              </p>
            </div>
            <DialogPrimitive.Close
              className="shrink-0 h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable body — min-h-0 + flex-1 is the reliable flex-scroll pattern */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
            {/* Identity row */}
            <div className="flex items-center gap-3 pb-5 mb-5 border-b border-[#d5dae0] dark:border-[#2a3040]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] bg-[#003d82] text-white text-[18px] font-bold select-none">
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
                      // text-base (16px) prevents iOS auto-zoom on focus
                      className="h-11 rounded-[6px] text-base sm:text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
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
                      className="h-11 rounded-[6px] text-base sm:text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
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
                        className="h-11 pr-10 rounded-[6px] text-base sm:text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                        className="h-11 pr-10 rounded-[6px] text-base sm:text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

              {/* Spacer so last field is never hidden behind sticky footer on small phones */}
              <div className="h-2" />
            </form>
          </div>

          {/* Sticky footer — always visible above keyboard */}
          <div
            className="shrink-0 border-t border-[#d5dae0] dark:border-[#2a3040] px-5 sm:px-6 py-3 flex items-center gap-2 bg-white dark:bg-gray-950"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" strokeWidth={2} />
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="h-11 px-3.5 rounded-[6px] border border-[#d5dae0] dark:border-[#2a3040] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[13px] font-bold inline-flex items-center gap-2 transition-colors"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
