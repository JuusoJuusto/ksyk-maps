/**
 * /support — support-ticket form.
 *
 * Posts to POST /api/tickets. Pre-fills from ErrorBoundary bounce via
 * ?ref=<errRef>&msg=<msg>&type=bug.
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

const TYPE_META: Record<TicketType, { label: string; hint: string; icon: any; iconTint: string }> = {
  bug:      { label: "Bug report",      hint: "Something broke or looks wrong.",    icon: Bug,        iconTint: "text-red-500 dark:text-red-400" },
  feature:  { label: "Feature request", hint: "Suggest a new capability.",          icon: Lightbulb,  iconTint: "text-amber-500 dark:text-amber-400" },
  support:  { label: "Support request", hint: "Need help with something.",          icon: LifeBuoy,   iconTint: "text-blue-500 dark:text-blue-400" },
  question: { label: "Question",        hint: "Curious about how something works.", icon: HelpCircle, iconTint: "text-emerald-500 dark:text-emerald-400" },
};

const MAX_DESCRIPTION = 4000;
const MAX_TITLE = 140;

export default function Support() {
  const [, setLocation] = useLocation();
  const [type, setType] = useState<TicketType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const [ticketId, setTicketId] = useState("");
  const [copiedId, setCopiedId] = useState(false);

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
        const lines: string[] = [];
        if (msg) lines.push(`Error: ${msg}`);
        if (ref) lines.push(`Reference ID: ${ref}`);
        lines.push("", "What I was doing when this happened:", "");
        setDescription(lines.join("\n"));
      }
    } catch { /* ignore malformed URL */ }
    analytics.featureUsed("support", "opened");
    document.title = "Support — KSYK Maps";
    return () => { document.title = "KSYK Maps"; };
  }, []);

  const emailValid = useMemo(() => {
    if (!email) return true;
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
          priority: "normal",
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
      analytics.featureUsed("support", "completed", { type });
      try { posthog.capture?.("support_ticket_created", { type, ticketId: id }); } catch { /* ignore */ }
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
    // Keep name + email — same reporter submitting another ticket.
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
                  {email.trim()
                    ? "A confirmation is on its way to your inbox. We aim to reply within 24–48 hours."
                    : "We'll look into it. If you left an email, we'll follow up within 24–48 hours."}
                </p>

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
                      aria-label="Copy ticket ID"
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
                    Report a bug, request a feature, or ask a question.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Type — 2×2 grid, hints always visible for all screen sizes */}
                <div>
                  <Label className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 block">
                    What kind of ticket?
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
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
                              ? "text-blue-700 bg-blue-50 ring-blue-300 dark:bg-blue-950/40 dark:ring-blue-800/60 dark:text-blue-300 font-semibold shadow-sm"
                              : "bg-white dark:bg-slate-900/50 ring-slate-200 dark:ring-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <Icon className={`h-4 w-4 mb-1.5 ${meta.iconTint}`} />
                          <div className="text-xs font-semibold leading-tight">{meta.label}</div>
                          <div className="text-[11px] mt-0.5 opacity-60 leading-snug">
                            {meta.hint}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5 block">
                    Title <span className="text-red-500" aria-hidden="true">*</span>
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
                  <p className="text-[11px] text-slate-400 mt-1 text-right tabular-nums" aria-live="polite">
                    {title.length}/{MAX_TITLE}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5 block">
                    Description <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                    placeholder={type === "bug"
                      ? "What happened? What did you expect? Steps to reproduce?"
                      : "The more detail you share, the better we can help."}
                    className="min-h-[160px] text-sm"
                    required
                    minLength={10}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {description.length > 0 && description.length < 10 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400" aria-live="polite">
                        {10 - description.length} more character{10 - description.length !== 1 ? "s" : ""} needed
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 ml-auto tabular-nums" aria-live="polite">
                      {description.length}/{MAX_DESCRIPTION}
                    </p>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5 block">
                      Name <span className="text-slate-400 font-normal text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-11"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5 block">
                      Email <span className="text-slate-400 font-normal text-xs">(for updates)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`h-11 ${email && !emailValid ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      autoComplete="email"
                    />
                    {email && !emailValid && (
                      <p className="text-[11px] text-red-500 mt-1" role="alert">Enter a valid email address.</p>
                    )}
                  </div>
                </div>

                {/* Error banner */}
                {submitMutation.isError && (
                  <div className="rounded-xl p-3 ring-1 ring-red-200 dark:ring-red-900/50 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300 flex items-start gap-2" role="alert">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">Couldn't send your ticket</p>
                      <p className="text-xs mt-0.5 opacity-80">
                        {(submitMutation.error as Error)?.message || "Unknown error"}. Please try again.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions — primary + plain-text cancel */}
                <div className="flex items-center gap-4 pt-1">
                  <Button
                    type="submit"
                    disabled={!canSubmit || submitMutation.isPending}
                    className="flex-1 h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> Sending…</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" aria-hidden="true" /> Send ticket</>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setLocation("/")}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors py-2 shrink-0"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-400 pt-1">
                  <Link href="/privacy" className="underline decoration-slate-300 hover:text-slate-500 dark:decoration-slate-700">Privacy policy</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
