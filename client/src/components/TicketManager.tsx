import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Ticket,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { cn } from '@/lib/utils';
import { getAdminHeaders } from '@/lib/adminAuth';
import { useToast } from '@/hooks/use-toast';

const RESPONSE_TEMPLATES = {
  resolved: `Thank you for reporting this issue. We've investigated and resolved the problem.

The fix has been deployed and should be live now. Please let us know if you continue to experience any issues.

Best regards,
KSYK Maps Support Team`,

  investigating: `Thank you for your report. We're currently investigating this issue and will update you as soon as we have more information.

Best regards,
KSYK Maps Support Team`,

  needsInfo: `Thank you for contacting us. To help resolve your issue, we need some additional information:

- [Please specify what information you need]

Please reply with these details and we'll continue investigating.

Best regards,
KSYK Maps Support Team`,

  notABug: `Thank you for your report. After investigation, we've determined this is working as intended.

[Explain why this is expected behavior]

If you have any questions, please don't hesitate to ask.

Best regards,
KSYK Maps Support Team`,

  featureAdded: `Great news! We've added the feature you requested.

The new feature is now live and available for use. Here's how to access it:

[Provide instructions]

Thank you for your suggestion!

Best regards,
KSYK Maps Support Team`,

  featureConsidering: `Thank you for your feature request! We think this is a great idea.

We've added it to our roadmap and will consider it for a future update. We'll keep you posted on the progress.

Best regards,
KSYK Maps Support Team`,

  cannotReproduce: `Thank you for your report. We've attempted to reproduce this issue but haven't been able to.

Could you please provide:
- Steps to reproduce the issue
- What browser/device you're using
- Any error messages you see

This will help us investigate further.

Best regards,
KSYK Maps Support Team`,

  duplicate: `Thank you for your report. This issue has already been reported and we're working on it.

We'll update you once it's resolved. You can track the progress in our system.

Best regards,
KSYK Maps Support Team`,

  workaround: `Thank you for reporting this issue. While we work on a permanent fix, here's a workaround:

[Provide workaround steps]

We'll notify you once the permanent fix is deployed.

Best regards,
KSYK Maps Support Team`,

  thankYou: `Thank you for your feedback! We really appreciate you taking the time to share your thoughts.

Your input helps us improve KSYK Maps for everyone.

Best regards,
KSYK Maps Support Team`,
};

export default function TicketManager({ defaultOpenId }: { defaultOpenId?: string } = {}) {
  const queryClient = useQueryClient();
  const { darkMode } = useDarkMode();
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const res = await fetch('/api/tickets', { credentials: 'include', headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return res.json();
    },
  });

  // Auto-open a specific ticket when arriving from a deep-link email CTA.
  useEffect(() => {
    if (!defaultOpenId || tickets.length === 0 || selectedTicket) return;
    const target = (tickets as any[]).find(
      (t) => t.ticketId === defaultOpenId || t.id === defaultOpenId,
    );
    if (target) setSelectedTicket(target);
  }, [defaultOpenId, tickets]);

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setSelectedTicket(null);
      setResponse('');
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setSelectedTicket(null);
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Failed to delete ticket. Please try again.", variant: "destructive" });
    }
  });

  const filteredTickets = tickets.filter((ticket: any) => {
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
    if (filterType !== 'all' && ticket.type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.title?.toLowerCase().includes(query) ||
        ticket.ticketId?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.errorReferenceId?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <Ticket className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'in_progress': return 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'resolved': return 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'closed': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'high': return 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700';
      case 'normal': return 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'low': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !response.trim()) return;
    try {
      await updateTicketMutation.mutateAsync({
        id: selectedTicket.id,
        data: {
          status: 'resolved',
          response: response.trim(),
          resolvedAt: new Date().toISOString(),
        },
      });
    } catch {
      toast({ title: "Failed to send", description: "Failed to send response. Please try again.", variant: "destructive" });
    }
  };

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    updateTicketMutation.mutate({
      id: ticketId,
      data: { status: newStatus },
    });
  };

  if (isLoading) {
    return (
      <Card className={cn(darkMode && "bg-gray-900 border-gray-700")}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tickets...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={cn(darkMode && "bg-gray-900 border-gray-700")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Ticket className="h-6 w-6" />
            Support Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setFilterStatus('all');
              setFilterType('all');
              setSearchQuery('');
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Tickets List */}
          <div className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tickets found</p>
              </div>
            ) : (
              filteredTickets.map((ticket: any) => (
                <Card key={ticket.id} className={cn(
                  "hover:shadow-md transition-shadow",
                  darkMode && "bg-gray-800 border-gray-700"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-sm font-mono px-3 py-1">
                            Ticket ID: {ticket.ticketId || ticket.id || 'NO-ID'}
                          </Badge>
                          <Badge className={`${getStatusColor(ticket.status)} border`}>
                            {getStatusIcon(ticket.status)}
                            <span className="ml-1">{ticket.status}</span>
                          </Badge>
                          <Badge className={`${getPriorityColor(ticket.priority)} border`}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline">{ticket.type}</Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-1 truncate text-gray-900 dark:text-white">
                          {ticket.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {ticket.description}
                        </p>
                        {ticket.errorReferenceId && (
                          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded px-2 py-1 inline-block">
                            <span className="text-xs font-mono text-red-800 dark:text-red-300">
                              Error Ref: {ticket.errorReferenceId}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>From: {ticket.name || 'Anonymous'}</span>
                          {ticket.email && <span>Email: {ticket.email}</span>}
                          <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {ticket.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTicket(null);
          }}
        >
          <Card
            className={cn(
              "w-full max-w-4xl max-h-[90vh] overflow-y-auto",
              darkMode && "bg-gray-900 border-gray-700"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3">
                    <Badge variant="outline" className="text-lg font-mono px-4 py-2">
                      Ticket ID: {selectedTicket.ticketId || selectedTicket.id || 'NO-ID'}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl mb-2 text-gray-900 dark:text-white">
                    {selectedTicket.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(selectedTicket.status)} border`}>
                      {selectedTicket.status}
                    </Badge>
                    <Badge className={`${getPriorityColor(selectedTicket.priority)} border`}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedTicket.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Priority</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedTicket.priority}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Submitted By</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedTicket.name || 'Anonymous'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedTicket.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedTicket.errorReferenceId && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Error Reference</p>
                    <p className="font-mono text-sm text-red-600 dark:text-red-400">
                      {selectedTicket.errorReferenceId}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Description</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Error Details */}
              {selectedTicket.errorStack && (
                <div>
                  <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Error Stack Trace</h4>
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <pre className="text-xs overflow-x-auto text-red-900 dark:text-red-200">
                      {selectedTicket.errorStack}
                    </pre>
                  </div>
                </div>
              )}

              {/* Response Section */}
              <div>
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Response</h4>
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Quick Templates:</span>
                    {Object.entries(RESPONSE_TEMPLATES).map(([key, template]) => (
                      <Button
                        key={key}
                        size="sm"
                        variant="outline"
                        onClick={() => setResponse(template)}
                      >
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your response here..."
                    rows={8}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSendResponse}
                      disabled={!response.trim() || updateTicketMutation.isPending}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {updateTicketMutation.isPending ? 'Sending...' : 'Send Response & Resolve'}
                    </Button>
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteConfirm(selectedTicket.id)}
                      disabled={deleteTicketMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirm(null);
          }}
        >
          <Card
            className={cn(
              "w-full max-w-md",
              darkMode && "bg-gray-900 border-gray-700"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-xl text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                Confirm Delete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete this ticket? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={() => deleteTicketMutation.mutate(deleteConfirm)}
                  disabled={deleteTicketMutation.isPending}
                  className="flex-1"
                >
                  {deleteTicketMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteTicketMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
