import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Send, Ticket, MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import SmartSupportOwl from "@/components/SmartSupportOwl";

export default function Support() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
    name: "",
    email: "",
    priority: "normal",
  });
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");

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

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-2xl">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="mb-6">
                <div className="bg-green-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Ticket Submitted Successfully!
                </h1>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">Your Ticket ID</p>
                <p className="text-2xl font-mono font-bold text-blue-600">{ticketId}</p>
              </div>

              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                We've received your ticket and will review it shortly. You'll receive email updates when the status changes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => setLocation("/")}>
                  Go Home
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      type: "bug",
                      title: "",
                      description: "",
                      name: "",
                      email: "",
                      priority: "normal",
                    });
                  }}
                >
                  Submit Another Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <Tabs defaultValue="tuki-pollo" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="tuki-pollo" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Tuki Pöllö
              </TabsTrigger>
              <TabsTrigger value="ticket" className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Lähetä tiketti
              </TabsTrigger>
            </TabsList>

            {/* Tuki Pöllö Tab */}
            <TabsContent value="tuki-pollo">
              <div className="max-w-4xl mx-auto">
                <SmartSupportOwl />
              </div>
            </TabsContent>

            {/* Ticket Form Tab */}
            <TabsContent value="ticket">
              <Card className="w-full max-w-3xl mx-auto shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-3xl flex items-center gap-3">
                    <Ticket className="h-8 w-8 text-blue-600" />
                    Contact Support
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    Report bugs, request features, or get help with KSYK Maps
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">{/* ... rest of form ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  rows={6}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">What happens next?</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>You'll receive a confirmation email with your ticket ID</li>
                      <li>Our team will review your ticket within 24-48 hours</li>
                      <li>You'll get email updates when the status changes</li>
                    </ul>
                  </div>
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-semibold">Failed to submit ticket</p>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Please try again or contact us directly at support@ksykmaps.com
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
        </div>
      </div>
    </div>
  );
}
