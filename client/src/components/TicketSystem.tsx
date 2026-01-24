import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";

export default function TicketSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { darkMode } = useDarkMode();
  
  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
    email: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send to Discord webhook
      const webhookUrl = "https://discord.com/api/webhooks/1464731342699761746/aLvsx19F6u-DBrLlYlW0WKQrIO0bzCEeUZtkdoX6CGx7QnxxwJnEMgtMeW48fUiCiD6X";
      
      const embed = {
        embeds: [{
          title: `🎫 New ${formData.type === 'bug' ? 'Bug Report' : formData.type === 'feature' ? 'Feature Request' : 'Support Ticket'}`,
          description: formData.title,
          color: formData.type === 'bug' ? 15158332 : formData.type === 'feature' ? 3447003 : 15844367,
          fields: [
            {
              name: "Description",
              value: formData.description || "No description provided"
            },
            {
              name: "Contact Email",
              value: formData.email || "Not provided"
            },
            {
              name: "Type",
              value: formData.type.charAt(0).toUpperCase() + formData.type.slice(1),
              inline: true
            },
            {
              name: "Timestamp",
              value: new Date().toLocaleString(),
              inline: true
            }
          ],
          footer: {
            text: "KSYK Maps Ticket System"
          },
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
      });

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setFormData({ type: "bug", title: "", description: "", email: "" });
      }, 2000);
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
        className="fixed bottom-20 right-4 z-30 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
        title="Submit Ticket"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={`max-w-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-6 w-6 text-purple-600" />
              Submit a Ticket
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-600 mb-2">Ticket Submitted!</h3>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                We'll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Ticket Type
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

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your.email@example.com"
                  className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>

              <div className={`flex items-start gap-2 p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  Your ticket will be sent to our Discord server and we'll respond within 24 hours.
                </p>
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
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit
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
