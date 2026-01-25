import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, AlertCircle, CheckCircle2, Ticket } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";

export default function TicketSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const { darkMode } = useDarkMode();
  
  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
    email: "",
    name: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate unique ticket ID
      const newTicketId = `TICKET-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      setTicketId(newTicketId);

      // Tickets channel webhook
      const ticketsWebhook = import.meta.env.VITE_DISCORD_TICKETS_WEBHOOK;
      const ticketLogsWebhook = import.meta.env.VITE_DISCORD_TICKET_LOGS_WEBHOOK;
      
      const typeEmoji = formData.type === 'bug' ? '🐛' : formData.type === 'feature' ? '✨' : '💬';
      const typeColor = formData.type === 'bug' ? 15158332 : formData.type === 'feature' ? 3447003 : 15844367;
      
      const embed = {
        embeds: [{
          title: `${typeEmoji} New ${formData.type === 'bug' ? 'Bug Report' : formData.type === 'feature' ? 'Feature Request' : 'Support Ticket'}`,
          description: `**Ticket ID:** \`${newTicketId}\`\n**Title:** ${formData.title}`,
          color: typeColor,
          fields: [
            {
              name: "📝 Description",
              value: formData.description || "No description provided"
            },
            {
              name: "👤 Contact Information",
              value: `**Name:** ${formData.name || "Not provided"}\n**Email:** ${formData.email || "Not provided"}`
            },
            {
              name: "📊 Details",
              value: `**Type:** ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}\n**Status:** 🟡 Pending\n**Priority:** ${formData.type === 'bug' ? 'High' : 'Normal'}`,
              inline: true
            },
            {
              name: "⏰ Submitted",
              value: new Date().toLocaleString('en-US', { 
                dateStyle: 'medium', 
                timeStyle: 'short' 
              }),
              inline: true
            }
          ],
          footer: {
            text: "KSYK Maps Ticket System • Reply in #ticket-responses"
          },
          timestamp: new Date().toISOString()
        }]
      };

      // Send to tickets channel
      await fetch(ticketsWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
      });

      // Send to ticket logs channel
      await fetch(ticketLogsWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
      });

      // Save to Firebase
      try {
        await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: newTicketId,
            type: formData.type,
            title: formData.title,
            description: formData.description,
            name: formData.name,
            email: formData.email,
            status: 'pending',
            priority: formData.type === 'bug' ? 'high' : 'normal',
            createdAt: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to save to Firebase:', error);
      }

      // Send confirmation email if email provided
      if (formData.email) {
        try {
          await fetch('/api/send-ticket-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              ticketId: newTicketId,
              type: formData.type,
              title: formData.title
            })
          });
        } catch (emailError) {
          console.error('Email confirmation failed:', emailError);
          // Don't fail the whole ticket if email fails
        }
      }

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setFormData({ type: "bug", title: "", description: "", email: "", name: "" });
      }, 3000);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit ticket. Please try again or email juuso.kaikula@ksyk.fi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-30 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
        title="Submit Support Ticket"
      >
        <Ticket className="h-5 w-5" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={`max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Ticket className="h-6 w-6 text-blue-600" />
              Submit a Support Ticket
            </DialogTitle>
            <DialogDescription className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Fill out the form below to submit a ticket to our support team.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-600 mb-2">Ticket Submitted!</h3>
              <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Your ticket ID: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{ticketId}</code>
              </p>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                We'll respond within 24 hours via email and Discord.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Ticket Type *
                </label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">🐛 Bug Report</SelectItem>
                    <SelectItem value="feature">✨ Feature Request</SelectItem>
                    <SelectItem value="support">💬 Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Your Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Email *
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your.email@example.com"
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Title *
                </label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Brief description of the issue"
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Description *
                </label>
                <Textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Provide detailed information..."
                  rows={4}
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>

              <div className={`flex items-start gap-2 p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  <p className="font-semibold mb-1">How it works:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your ticket goes to our admin team in Discord</li>
                    <li>You'll receive a unique ticket ID</li>
                    <li>Responses sent to your email and #ticket-responses</li>
                    <li>Average response time: 24 hours</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
