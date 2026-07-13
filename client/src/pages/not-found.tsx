import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Home, ArrowLeft, Send, Ticket, CheckCircle } from "lucide-react";
import Header from "@/components/Header";

export default function NotFound() {
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
    name: "",
    email: "",
    priority: "normal",
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create ticket");
      return response.json();
    },
    onSuccess: (data) => {
      setTicketId(data.ticketId || data.id);
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTicketMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      type: "bug",
      title: "",
      description: "",
      name: "",
      email: "",
      priority: "normal",
    });
    setSubmitted(false);
    setShowSupportDialog(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* 404 card — clean KSYK vocabulary: rounded-2xl ring-1, no
           *  heavy shadows, no purple gradient. */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-black/5 dark:ring-white/5 shadow-sm overflow-hidden">
            {/* Thin blue accent bar */}
            <div className="h-1 w-full bg-blue-600" />

            <div className="px-6 sm:px-8 py-8 sm:py-10 text-center">
              {/* Editorial kicker */}
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-3">
                Error 404
              </div>

              {/* Big bold heading */}
              <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.02em] text-gray-900 dark:text-white leading-tight mb-3">
                Page not found
              </h1>

              <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
                The page you're looking for doesn't exist. It might have been moved or removed.
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-center">
                <Link href="/">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98] transition-all"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go home
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold active:scale-[0.98] transition-all"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go back
                </Button>
              </div>
            </div>

            {/* Support link — subtle footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-[12px] text-gray-500 dark:text-gray-500">
                Something broken? Let us know.
              </p>
              <button
                type="button"
                onClick={() => setShowSupportDialog(true)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Ticket className="h-3.5 w-3.5" />
                Contact support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Support Dialog — matches announcement popup + settings vocab */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[calc(100dvh-3rem)] bg-white dark:bg-gray-950">
          <div className="h-1 w-full bg-blue-600" />
          {submitted ? (
            <div className="text-center py-8 px-6">
              <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-100 dark:ring-emerald-900/40 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
              </div>
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-600 dark:text-emerald-400 mb-2">
                Submitted
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
                Ticket received
              </h2>
              <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/5 bg-gray-50 dark:bg-gray-900 p-4 mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-500 mb-1">
                  Ticket ID
                </p>
                <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">{ticketId}</p>
              </div>
              <p className="text-[14px] text-gray-600 dark:text-gray-400 mb-5">
                We'll review it shortly. Check your email for updates.
              </p>
              <Button
                onClick={resetForm}
                className="h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98]"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader className="px-5 sm:px-6 pt-5 pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/40 flex items-center justify-center shrink-0">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-600 dark:text-blue-400 mb-0.5">
                      Support
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                      Contact us
                    </DialogTitle>
                  </div>
                </div>
              </DialogHeader>
              <div className="px-5 sm:px-6 pb-5 overflow-y-auto max-h-[calc(100dvh-14rem)]">
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Ticket Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">🐛 Bug Report</SelectItem>
                        <SelectItem value="feature">✨ Feature Request</SelectItem>
                        <SelectItem value="support">❓ Support Question</SelectItem>
                        <SelectItem value="error">⚠️ Error Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Provide detailed information about your issue..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Your Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={createTicketMutation.isPending}
                >
                  {createTicketMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Submit Ticket
                    </>
                  )}
                </Button>

                {createTicketMutation.isError && (
                  <div className="rounded-2xl ring-1 ring-red-200 dark:ring-red-900/40 bg-red-50 dark:bg-red-950/30 p-4">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm font-semibold">Failed to submit</p>
                    </div>
                    <p className="text-[13px] text-red-700/80 dark:text-red-300/80 mt-1">
                      Please try again or contact us directly.
                    </p>
                  </div>
                )}
              </form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
