import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare, Send, Reply, Forward, Trash2, Archive, Star,
  Clock, Users, Eye, EyeOff, Paperclip, Calendar, Search,
  Filter, ChevronLeft, ChevronRight, MoreVertical, Check, CheckCheck
} from 'lucide-react';

interface Message {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  subject: string;
  content: string;
  isRead: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  parentMessageId?: string;
  scheduledFor?: string;
  recipientsVisible?: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  attachments?: string[];
  createdAt: string;
  readAt?: string;
}

interface Draft {
  id: string;
  toUserId: string;
  subject: string;
  content: string;
  scheduledFor?: string;
  recipientsVisible?: boolean;
  priority?: string;
  updatedAt: string;
}

export default function EnhancedMessageSystem() {
  const queryClient = useQueryClient();
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'archived' | 'starred'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  
  const [composeData, setComposeData] = useState({
    toUserId: '',
    subject: '',
    content: '',
    scheduledFor: '',
    recipientsVisible: true,
    priority: 'normal' as const,
    attachments: [] as string[],
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', activeFolder],
    queryFn: async () => {
      const response = await fetch('/api/wilma/messages');
      if (!response.ok) throw new Error('Failed to fetch messages');
      const allMessages = await response.json();
      
      // Filter based on folder
      const currentUser = JSON.parse(localStorage.getItem('wilma_user') || '{}');
      
      switch (activeFolder) {
        case 'inbox':
          return allMessages.filter((m: Message) => 
            m.toUserId === currentUser.id && !m.isArchived
          );
        case 'sent':
          return allMessages.filter((m: Message) => 
            m.fromUserId === currentUser.id && !m.isArchived
          );
        case 'archived':
          return allMessages.filter((m: Message) => 
            (m.toUserId === currentUser.id || m.fromUserId === currentUser.id) && m.isArchived
          );
        case 'starred':
          return allMessages.filter((m: Message) => 
            (m.toUserId === currentUser.id || m.fromUserId === currentUser.id) && m.isStarred
          );
        default:
          return allMessages;
      }
    }
  });

  // Fetch users for recipient dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['wilma-users'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/wilma/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      alert('✅ Viesti lähetetty!');
      resetCompose();
    },
    onError: () => {
      alert('❌ Viestin lähetys epäonnistui');
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/messages/${id}/read`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/messages/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete message');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setSelectedMessage(null);
      alert('✅ Viesti poistettu!');
    }
  });

  // Star message mutation
  const starMessageMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      const response = await fetch(`/api/wilma/messages/${id}/star`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred }),
      });
      if (!response.ok) throw new Error('Failed to star message');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  // Archive message mutation
  const archiveMessageMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const response = await fetch(`/api/wilma/messages/${id}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      });
      if (!response.ok) throw new Error('Failed to archive message');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setSelectedMessage(null);
    }
  });

  const resetCompose = () => {
    setComposeData({
      toUserId: '',
      subject: '',
      content: '',
      scheduledFor: '',
      recipientsVisible: true,
      priority: 'normal',
      attachments: [],
    });
    setShowCompose(false);
    setReplyingTo(null);
  };

  const handleSend = () => {
    if (!composeData.toUserId || !composeData.subject || !composeData.content) {
      alert('Täytä kaikki pakolliset kentät');
      return;
    }

    const messageData = {
      ...composeData,
      parentMessageId: replyingTo?.id,
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setComposeData({
      toUserId: message.fromUserId,
      subject: `Re: ${message.subject}`,
      content: `\n\n---\n${message.fromUserName} kirjoitti:\n${message.content}`,
      scheduledFor: '',
      recipientsVisible: true,
      priority: 'normal',
      attachments: [],
    });
    setShowCompose(true);
  };

  const handleForward = (message: Message) => {
    setComposeData({
      toUserId: '',
      subject: `Fwd: ${message.subject}`,
      content: `\n\n---\nVälitetty viesti:\nLähettäjä: ${message.fromUserName}\nAihe: ${message.subject}\n\n${message.content}`,
      scheduledFor: '',
      recipientsVisible: true,
      priority: 'normal',
      attachments: message.attachments || [],
    });
    setShowCompose(true);
  };

  const handleBulkDelete = () => {
    if (selectedMessages.size === 0) return;
    if (!confirm(`Poista ${selectedMessages.size} viestiä?`)) return;
    
    selectedMessages.forEach(id => {
      deleteMessageMutation.mutate(id);
    });
    setSelectedMessages(new Set());
  };

  const handleBulkArchive = () => {
    if (selectedMessages.size === 0) return;
    
    selectedMessages.forEach(id => {
      archiveMessageMutation.mutate({ id, archived: true });
    });
    setSelectedMessages(new Set());
  };

  const toggleMessageSelection = (id: string) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMessages(newSelection);
  };

  const filteredMessages = messages.filter((m: Message) =>
    `${m.fromUserName} ${m.toUserName} ${m.subject} ${m.content}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const unreadCount = messages.filter((m: Message) => !m.isRead).length;

  if (showCompose) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-600" />
            {replyingTo ? 'Vastaa viestiin' : 'Uusi viesti'}
          </h2>
          <Button variant="outline" onClick={resetCompose}>
            Peruuta
          </Button>
        </div>

        <Card className="border-2 border-teal-200">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Vastaanottaja *</Label>
              <select
                value={composeData.toUserId}
                onChange={(e) => setComposeData({ ...composeData, toUserId: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md"
                disabled={!!replyingTo}
              >
                <option value="">Valitse vastaanottaja...</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Aihe *</Label>
              <Input
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                placeholder="Viestin aihe"
              />
            </div>

            <div>
              <Label>Viesti *</Label>
              <textarea
                value={composeData.content}
                onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-md min-h-[200px]"
                placeholder="Kirjoita viestisi tähän..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Prioriteetti</Label>
                <select
                  value={composeData.priority}
                  onChange={(e) => setComposeData({ ...composeData, priority: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="normal">Normaali</option>
                  <option value="high">Tärkeä</option>
                  <option value="urgent">Kiireellinen</option>
                </select>
              </div>

              <div>
                <Label>Ajasta lähetys</Label>
                <Input
                  type="datetime-local"
                  value={composeData.scheduledFor}
                  onChange={(e) => setComposeData({ ...composeData, scheduledFor: e.target.value })}
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composeData.recipientsVisible}
                    onChange={(e) => setComposeData({ ...composeData, recipientsVisible: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Vastaanottajat näkyvät</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSend}
                disabled={sendMessageMutation.isPending}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {composeData.scheduledFor ? 'Ajasta lähetys' : 'Lähetä'}
              </Button>
              <Button variant="outline" onClick={resetCompose}>
                Peruuta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedMessage) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setSelectedMessage(null)}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Takaisin
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReply(selectedMessage)}
            >
              <Reply className="w-4 h-4 mr-2" />
              Vastaa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleForward(selectedMessage)}
            >
              <Forward className="w-4 h-4 mr-2" />
              Välitä
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => starMessageMutation.mutate({ 
                id: selectedMessage.id, 
                starred: !selectedMessage.isStarred 
              })}
            >
              <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => archiveMessageMutation.mutate({ 
                id: selectedMessage.id, 
                archived: true 
              })}
            >
              <Archive className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() => deleteMessageMutation.mutate(selectedMessage.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="border-2 border-teal-200">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{selectedMessage.subject}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold">Lähettäjä: {selectedMessage.fromUserName}</span>
                  <span>Vastaanottaja: {selectedMessage.toUserName}</span>
                  <span>{new Date(selectedMessage.createdAt).toLocaleString('fi-FI')}</span>
                </div>
                {selectedMessage.priority !== 'normal' && (
                  <Badge className={
                    selectedMessage.priority === 'urgent' ? 'bg-red-600' : 'bg-orange-600'
                  }>
                    {selectedMessage.priority === 'urgent' ? 'Kiireellinen' : 'Tärkeä'}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
            </div>
            
            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Liitteet ({selectedMessage.attachments.length})
                </h3>
                <div className="space-y-2">
                  {selectedMessage.attachments.map((attachment, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Paperclip className="w-4 h-4" />
                      <span className="text-sm">{attachment}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-teal-600" />
          Viestit
          {unreadCount > 0 && (
            <Badge className="bg-red-600">{unreadCount} lukematonta</Badge>
          )}
        </h2>
        <Button onClick={() => setShowCompose(true)} className="bg-teal-600 hover:bg-teal-700">
          <Send className="w-4 h-4 mr-2" />
          Uusi viesti
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Folders Sidebar */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <div className="space-y-2">
              <Button
                variant={activeFolder === 'inbox' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveFolder('inbox')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Saapuneet
                {unreadCount > 0 && activeFolder === 'inbox' && (
                  <Badge className="ml-auto bg-red-600">{unreadCount}</Badge>
                )}
              </Button>
              <Button
                variant={activeFolder === 'sent' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveFolder('sent')}
              >
                <Send className="w-4 h-4 mr-2" />
                Lähetetyt
              </Button>
              <Button
                variant={activeFolder === 'starred' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveFolder('starred')}
              >
                <Star className="w-4 h-4 mr-2" />
                Tähdelliset
              </Button>
              <Button
                variant={activeFolder === 'archived' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveFolder('archived')}
              >
                <Archive className="w-4 h-4 mr-2" />
                Arkisto
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Bulk Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Hae viestejä..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedMessages.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                      <Archive className="w-4 h-4 mr-2" />
                      Arkistoi ({selectedMessages.size})
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={handleBulkDelete}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Poista ({selectedMessages.size})
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Ladataan viestejä...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Ei viestejä</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message: Message) => (
                <Card
                  key={message.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !message.isRead ? 'bg-blue-50 border-2 border-blue-200' : 'border-gray-200'
                  } ${selectedMessages.has(message.id) ? 'ring-2 ring-teal-500' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMessages.has(message.id)}
                        onChange={() => toggleMessageSelection(message.id)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => {
                          setSelectedMessage(message);
                          if (!message.isRead) {
                            markAsReadMutation.mutate(message.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold ${!message.isRead ? 'text-blue-600' : ''}`}>
                            {activeFolder === 'sent' ? message.toUserName : message.fromUserName}
                          </span>
                          {!message.isRead && <Badge className="bg-blue-600">Uusi</Badge>}
                          {message.isStarred && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                          {message.priority !== 'normal' && (
                            <Badge className={message.priority === 'urgent' ? 'bg-red-600' : 'bg-orange-600'}>
                              {message.priority === 'urgent' ? '!' : '↑'}
                            </Badge>
                          )}
                          {message.scheduledFor && (
                            <Badge className="bg-purple-600">
                              <Clock className="w-3 h-3 mr-1" />
                              Ajastettu
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-gray-900 truncate">{message.subject}</p>
                        <p className="text-sm text-gray-600 truncate">{message.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.createdAt).toLocaleString('fi-FI')}
                        </p>
                      </div>
                      {message.isRead && (
                        <CheckCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
