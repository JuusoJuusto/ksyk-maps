/**
 * /support — professional support-ticket form.
 *
 * Posts to POST /api/tickets which runs the existing email + Discord
 * pipeline. Rebuilt in v4.5.54: removed the SmartSupportOwl companion
 * (Tuki Pöllö) so this page is one single-purpose form.
 *
 * Query-string pre-fill: /support?ref=<errRef>&msg=<msg>&type=bug is what
 * the ErrorBoundary's "Contact support" button links to after a crash —
 * lands with the reference + error message already inside the description.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertCircle, ArrowLeft, Bug, CheckCircle, HelpCircle, Home, Lightbulb,
  Loader2, LifeBuoy, Send, Ticket, Copy, ArrowRight,
} from "lucide-react";
import { analytics } from "@/lib/analytics-sdk";
import posthog from "@/lib/posthog";
import { useToast } from "@/hooks/use-toast";

type TicketType = "bug" | "feature" | "support" | "question";
type Priority = "low" | "normal" | "high" | "critical";

// v4.7.22 — Unified selection accent. Previously each type had its
// own colored tint (red / amber / blue / emerald) which created
// competing "badges" when the user tabbed through options. Apple HIG
// prefers a single selection color; semantic hint stays on the icon
// so bugs still feel red without a red-tinted card fighting for
// attention against a green-tinted card two slots over.
const SELECTED_TINT = "text-blue-700 bg-blue-50 ring-blue-300 dark:bg-blue-950/40 dark:ring-blue-800/60 dark:text-blue-300";

const TYPE_META: Record<TicketType, { label: string; hint: string; icon: any; iconTint: string }> = {
  bug:      { label: "Bug report",        hint: "Something broke or looks wrong.",     icon: Bug,        iconTint: "text-red-600 dark:text-red-400" },
  feature:  { label: "Feature request",   hint: "Suggest a new capability.",           icon: Lightbulb,  iconTint: "text-amber-600 dark:text-amber-400" },
  support:  { label: "Support request",   hint: "Need help finishing something.",      icon: LifeBuoy,   iconTint: "text-blue-600 dark:text-blue-400" },
  question: { label: "General question",  hint: "You're not stuck — just curious.",    icon: HelpCircle, iconTint: "text-emerald-600 dark:text-emerald-400" },
};

const PRIORITY_META: Record<Priority, { label: string; hint: string; tint: string }> = {
  low:      { label: "Low",      hint: "Whenever you get to it.",         tint: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  normal:   { label: "Normal",   hint: "Standard turnaround.",            tint: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  high:     { label: "High",     hint: "Blocking me right now.",          tint: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  critical: { label: "Critical", hint: "Data loss / broken for everyone.", tint: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
};

const MAX_DESCRIPTION = 4000;
const MAX_TITLE = 140;

export default function Support() {
  const [, setLocation] = useLocation();
  const [type, setType] = useState<TicketType>("bug");
  const [priority, setPriority] = useState<Priority>("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const [ticketId, setTicketId] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Pre-fill from ErrorBoundary bounce.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const ref = p.get("ref") || "";
      const msg = p.get("msg") || "";
      const t = p.get("type") || "";
      if (ref || msg || t) {
        if (t === "feature" || t === "support" || t === "question" || t === "bug") setType(t);
        else setType("bug");
        if (msg) setTitle(`Auto-report: ${msg.slice(0, MAX_TITLE - 14)}`);
        setDescription([
          msg && `Error: ${msg}`,
          ref && `Reference ID: ${ref}`,
          "",
          "What I was doing when this happened:",
          "",
        ].filter(Boolean).join("\n"));
        setPriority("high");
      }
    } catch { /* ignore malformed URL */ }
    analytics.featureUsed("support", "opened");
    document.title = "Support — KSYK Maps";
    return () => { document.title = "KSYK Maps"; };
  }, []);

  const emailValid = useMemo(() => {
    if (!email) return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);
  const canSubmit = title.trim().length >= 3 && description.trim().length >= 10 && emailValid;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          priority,
          title: title.trim().slice(0, MAX_TITLE),
          description: description.trim().slice(0, MAX_DESCRIPTION),
          name: name.trim(),
          email: email.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return res.json();
    },
    onSuccess: (data) => {
      const id = data.ticketId || data.id || "unknown";
      setTicketId(id);
      setSubmitted(true);
      analytics.featureUsed("support", "completed", { type, priority });
      try { posthog.capture?.("support_ticket_created", { type, priority, ticketId: id }); } catch { /* ignore */ }
    },
    onError: (err: Error) => {
      analytics.error(err, { area: "support-form" });
      toast({ title: "Failed to submit ticket", description: "Please try again or email us directly.", variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    submitMutation.mutate();
  }

  function copyTicketId() {
    try {
      navigator.clipboard.writeText(ticketId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } catch { /* clipboard denied */ }
  }

  function resetForm() {
    setSubmitted(false);
    setTicketId("");
    setTitle("");
    setDescription("");
    setPriority("normal");
    // Keep name + email — probably the same reporter.
  }

  // ── Success screen ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-950">
        <header className="border-b border-border/50 shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to map
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg">
            <Card className="border border-emerald-200/60 dark:border-emerald-900/40 shadow-xl">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-emerald-200 dark:ring-emerald-900/50 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-600 dark:text-emerald-400 mb-2">
                  Ticket received
                </p>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  We got it. Thank you.
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                  A confirmation is on its way to your inbox. We aim to reply within 24–48 hours;
                  critical tickets get faster attention.
                </p>

                {/* Ticket ID card */}
                <div className="rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 mb-6 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Your ticket ID
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 break-all">
                      {ticketId}
                    </code>
                    <button
                      type="button"
                      onClick={copyTicketId}
                      className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                      title="Copy ticket ID"
                    >
                      {copiedId
                        ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                        : <Copy className="h-4 w-4 text-slate-500" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-2">
                    Save this if you need to follow up.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button className="flex-1 h-11 rounded-xl font-semibold" onClick={() => setLocation("/")}>
                    <Home className="h-4 w-4 mr-2" /> Back to map
                  </Button>
                  <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold" onClick={resetForm}>
                    Submit another
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-border/50 shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          <Card className="border border-slate-200/70 dark:border-slate-800 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-200 dark:ring-blue-900/50 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Contact support</CardTitle>
                  <CardDescription className="text-sm">
                    Report a bug, request a feature, or ask a question. We read every ticket.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type — 4 cards */}
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                    What kind of ticket?
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.entries(TYPE_META) as [TicketType, typeof TYPE_META[TicketType]][]).map(([key, meta]) => {
                      const Icon = meta.icon;
                      const sel = type === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setType(key)}
                          aria-pressed={sel}
                          className={`relative rounded-xl p-3 text-left transition ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                            sel
                              ? `${SELECTED_TINT} font-semibold shadow-sm`
                              : "bg-white dark:bg-slate-900/50 ring-slate-200 dark:ring-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <Icon className={`h-4 w-4 mb-2 ${meta.iconTint}`} />
                          <div className="text-xs font-semibold leading-tight">{meta.label}</div>
                          <div className="text-xs mt-0.5 opacity-70 leading-tight hidden sm:block">
                            {meta.hint}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority — 4 chips */}
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                    Priority
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(PRIORITY_META) as [Priority, typeof PRIORITY_META[Priority]][]).map(([key, meta]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPriority(key)}
                        className={`h-8 px-3 rounded-full text-xs font-semibold transition ${
                          priority === key
                            ? meta.tint + " ring-2 ring-current/40"
                            : "bg-slate-100 text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                        title={meta.hint}
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                    placeholder="Short summary of the issue"
                    className="h-11"
                    required
                    minLength={3}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 text-right">
                    {title.length}/{MAX_TITLE}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                    placeholder={type === "bug"
                      ? "What did you expect to happen? What actually happened? What steps reproduce it?"
                      : "Tell us more — the more detail, the better we can help."}
                    className="min-h-[180px] font-mono text-sm"
                    required
                    minLength={10}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-slate-400">
                      {description.length < 10
                        ? `At least ${10 - description.length} more characters`
                        : "Looks good — you can add up to " + (MAX_DESCRIPTION - description.length) + " more"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {description.length}/{MAX_DESCRIPTION}
                    </p>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                      Name (optional)
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                      Email (for updates)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`h-11 ${email && !emailValid ? "border-red-400" : ""}`}
                    />
                    {email && !emailValid && (
                      <p className="text-[10px] text-red-500 mt-1">Not a valid email address.</p>
                    )}
                  </div>
                </div>

                {/* Error banner */}
                {submitMutation.isError && (
                  <div className="rounded-xl p-3 ring-1 ring-red-200 dark:ring-red-900/50 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Couldn't send your ticket</p>
                      <p className="text-xs mt-0.5">
                        {(submitMutation.error as Error)?.message || "Unknown error"}. Please try again in a moment.
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={!canSubmit || submitMutation.isPending}
                    className="flex-1 h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Send ticket</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={() => setLocation("/")}
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-[11px] text-center text-slate-400 pt-2">
                  Tickets are read by KSYK Maps admins. No third-party tools are contacted.{" "}
                  <Link href="/privacy" className="underline hover:text-slate-300">Privacy Policy</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
