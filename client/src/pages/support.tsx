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
      <div
        className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-950"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <header className="border-b border-border/50 shrink-0 animate-fade-in">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <Link href="/" className="inline-flex items-center gap-2 h-11 -ml-2 px-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to map
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg animate-fade-in-up">
            <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
              <CardContent className="pt-8 pb-7 text-center">
                <div
                  className="animate-scale-in mx-auto mb-5 h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"
                >
                  <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                </div>
                <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white mb-2 leading-[1.15]">
                  Ticket sent
                </h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
                  {email.trim()
                    ? "A confirmation is on its way to your inbox. We usually reply within 24–48 hours."
                    : "We'll look into it. Add your email next time to hear back."}
                </p>

                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4 mb-6 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Your ticket ID
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[14px] font-mono font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 break-all">
                      {ticketId}
                    </code>
                    <button
                      type="button"
                      onClick={copyTicketId}
                      className="shrink-0 h-11 w-11 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-[0.96] transition-all"
                      title="Copy ticket ID"
                      aria-label="Copy ticket ID"
                    >
                      {copiedId
                        ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                        : <Copy className="h-4 w-4 text-slate-500" />}
                    </button>
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-500 mt-2">
                    Save this if you need to follow up.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    className="flex-1 h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] transition-all"
                    onClick={() => setLocation("/")}
                  >
                    <Home className="h-4 w-4 mr-2" /> Back to map
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-semibold border-gray-200 dark:border-gray-800 active:scale-[0.98] transition-all"
                    onClick={resetForm}
                  >
                    Send another
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
    <div
      className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-950"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <header className="border-b border-border/50 shrink-0 animate-fade-in">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2 h-11 -ml-2 px-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl animate-fade-in-up">
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                </div>
                <div>
                  <CardTitle className="text-[20px] font-semibold tracking-tight leading-[1.15]">Contact support</CardTitle>
                  <CardDescription className="text-[14px] mt-0.5">
                    Report a bug, request a feature, or ask a question.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Type — 2×2 grid, hints always visible for all screen sizes */}
                <div>
                  <Label className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 mb-2 block">
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
                          className={`relative rounded-xl p-3 min-h-[68px] text-left transition-all border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                            sel
                              ? "text-blue-700 bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300 font-semibold"
                              : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <Icon className={`h-4 w-4 mb-1.5 ${meta.iconTint}`} strokeWidth={2.25} />
                          <div className="text-[13px] font-semibold leading-tight">{meta.label}</div>
                          <div className="text-[12px] mt-0.5 opacity-60 leading-snug">
                            {meta.hint}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title" className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 mb-1.5 block">
                    Title <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                    placeholder="Short summary of the issue"
                    className="h-11 rounded-xl text-[16px] sm:text-[15px]"
                    required
                    minLength={3}
                  />
                  <p className="text-[12px] text-slate-400 mt-1 text-right tabular-nums" aria-live="polite">
                    {title.length}/{MAX_TITLE}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 mb-1.5 block">
                    Description <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                    placeholder={type === "bug"
                      ? "What happened? What did you expect? Steps to reproduce?"
                      : "The more detail you share, the better we can help."}
                    className="min-h-[160px] rounded-xl text-[16px] sm:text-[15px] leading-relaxed"
                    required
                    minLength={10}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {description.length > 0 && description.length < 10 && (
                      <p className="text-[12px] text-amber-600 dark:text-amber-400" aria-live="polite">
                        {10 - description.length} more character{10 - description.length !== 1 ? "s" : ""} needed
                      </p>
                    )}
                    <p className="text-[12px] text-slate-400 ml-auto tabular-nums" aria-live="polite">
                      {description.length}/{MAX_DESCRIPTION}
                    </p>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 mb-1.5 block">
                      Name <span className="text-slate-400 font-normal text-[12px]">(optional)</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-11 rounded-xl text-[16px] sm:text-[15px]"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 mb-1.5 block">
                      Email <span className="text-slate-400 font-normal text-[12px]">(for updates)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`h-11 rounded-xl text-[16px] sm:text-[15px] ${email && !emailValid ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      autoComplete="email"
                    />
                    {email && !emailValid && (
                      <p className="text-[12px] text-red-500 mt-1" role="alert">Enter a valid email address.</p>
                    )}
                  </div>
                </div>

                {/* Error banner */}
                {submitMutation.isError && (
                  <div className="rounded-xl p-3.5 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-[14px] text-red-700 dark:text-red-300 flex items-start gap-2.5" role="alert">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-semibold">Couldn't send your ticket</p>
                      <p className="text-[13px] mt-0.5 opacity-80">
                        {(submitMutation.error as Error)?.message || "Unknown error"}.
                      </p>
                      <button
                        type="button"
                        onClick={() => submitMutation.mutate()}
                        className="mt-2 text-[13px] font-semibold underline underline-offset-2 hover:no-underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions — primary + plain-text cancel */}
                <div className="flex items-center gap-4 pt-1">
                  <Button
                    type="submit"
                    disabled={!canSubmit || submitMutation.isPending}
                    className="flex-1 h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] transition-all"
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> Sending…</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" aria-hidden="true" /> Send message</>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setLocation("/")}
                    className="text-[14px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors h-11 px-2 shrink-0"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[12px] text-center text-slate-400 pt-1">
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
