import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Send, X } from 'lucide-react';

interface TicketSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickTemplates = [
  { type: 'bug', title: 'Language switch issue', description: 'The British English mode shows up as regular English when selected.' },
  { type: 'bug', title: 'Map not loading', description: 'The campus map is not displaying buildings or rooms correctly.' },
  { type: 'bug', title: 'Navigation not working', description: 'The navigation feature is not showing routes between rooms.' },
  { type: 'feature', title: 'Add new building', description: 'Request to add a new building to the campus map.' },
  { type: 'feature', title: 'Room booking system', description: 'Would like to be able to book rooms through the app.' },
  { type: 'support', title: 'How to use navigation', description: 'Need help understanding how to navigate between rooms.' },
  { type: 'support', title: 'Account access issue', description: 'Having trouble accessing my account or admin panel.' },
  { type: 'feedback', title: 'General feedback', description: 'I have some suggestions for improving the app.' },
];

export default function TicketSystemNew({ isOpen, onClose }: TicketSystemProps) {
  const [formData, setFormData] = useState({
    type: 'support',
    title: '',
    description: '',
    name: '',
    email: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create ticket');
      return response.json();
    },
    onSuccess: (data) => {
      setTicketId(data.ticketId);
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTicketMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      type: 'support',
      title: '',
      description: '',
      name: '',
      email: '',
    });
    setSubmitted(false);
    setTicketId('');
  };

  const applyTemplate = (template: typeof quickTemplates[0]) => {
    setFormData({
      ...formData,
      type: template.type,
      title: template.title,
      description: template.description,
    });
    setShowTemplates(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">
            {submitted ? '✓ Ticket Submitted' : '📝 Submit Support Ticket'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-900 mb-2">
                  Ticket Created Successfully!
                </h3>
                <p className="text-green-800 mb-4">
                  Your ticket ID is:
                </p>
                <p className="text-2xl font-mono font-bold text-green-900 bg-white px-4 py-2 rounded border border-green-300 inline-block">
                  {ticketId}
                </p>
                <p className="text-sm text-green-700 mt-4">
                  We've sent a confirmation email to {formData.email}. Our team will review your request and respond soon.
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleReset} className="flex-1">
                  Submit Another Ticket
                </Button>
                <Button onClick={onClose} variant="outline" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick Templates */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">⚡ Quick Templates</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs"
                  >
                    {showTemplates ? 'Hide' : 'Show'}
                  </Button>
                </div>
                {showTemplates && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                    {quickTemplates.map((template, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                      >
                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                          {template.type === 'bug' && '🐛 Bug'}
                          {template.type === 'feature' && '✨ Feature'}
                          {template.type === 'support' && '❓ Support'}
                          {template.type === 'feedback' && '💬 Feedback'}
                        </div>
                        <div className="text-sm font-medium">{template.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="type">Ticket Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">🐛 Bug Report</SelectItem>
                    <SelectItem value="feature">✨ Feature Request</SelectItem>
                    <SelectItem value="support">❓ Support Question</SelectItem>
                    <SelectItem value="feedback">💬 General Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Please provide as much detail as possible..."
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="For updates on your ticket"
                  />
                </div>
              </div>

              {createTicketMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-900">Failed to submit ticket</p>
                    <p className="text-sm text-red-700">Please try again or contact support directly.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {createTicketMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Ticket
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
