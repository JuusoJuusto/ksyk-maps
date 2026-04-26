import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, BellOff, Check, CheckCheck, Trash2, Filter, 
  MessageSquare, Calendar, FileText, AlertCircle, Info,
  BookOpen, ClipboardCheck, Users, Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'grade' | 'homework' | 'attendance' | 'announcement' | 'exam' | 'general';
  title: string;
  content: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
}

const notificationIcons = {
  message: MessageSquare,
  grade: BookOpen,
  homework: FileText,
  attendance: ClipboardCheck,
  announcement: Bell,
  exam: Calendar,
  general: Info
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  urgent: 'bg-red-100 text-red-700 border-red-300'
};

export default function WilmaNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['wilma-notifications'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/notifications', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      return data.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined
      }));
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/wilma/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wilma-notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/wilma/notifications/mark-all-read', {
        method: 'PUT',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wilma-notifications'] });
      toast({
        title: 'Kaikki merkitty luetuiksi',
        description: 'Kaikki ilmoitukset on merkitty luetuiksi',
      });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/wilma/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wilma-notifications'] });
      toast({
        title: 'Ilmoitus poistettu',
        description: 'Ilmoitus on poistettu onnistuneesti',
      });
    }
  });

  // Filter notifications
  const filteredNotifications = notifications.filter((n: Notification) => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'read' && !n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#003d82] border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Ladataan ilmoituksia...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#003d82]">Ilmoitukset</h2>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} lukematonta ilmoitusta` : 'Ei lukemattomia ilmoituksia'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              variant="outline"
              size="sm"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Merkitse kaikki luetuiksi
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Suodattimet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-[#003d82]' : ''}
              >
                Kaikki ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
                className={filter === 'unread' ? 'bg-[#003d82]' : ''}
              >
                Lukemattomat ({unreadCount})
              </Button>
              <Button
                variant={filter === 'read' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('read')}
                className={filter === 'read' ? 'bg-[#003d82]' : ''}
              >
                Luetut ({notifications.length - unreadCount})
              </Button>
            </div>

            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">Kaikki tyypit</option>
                <option value="message">Viestit</option>
                <option value="grade">Arvosanat</option>
                <option value="homework">Tehtävät</option>
                <option value="attendance">Poissaolot</option>
                <option value="announcement">Tiedotteet</option>
                <option value="exam">Kokeet</option>
                <option value="general">Yleiset</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Ilmoitukset
          </CardTitle>
          <CardDescription>
            {filteredNotifications.length} ilmoitusta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Ei ilmoituksia</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredNotifications.map((notification: Notification) => {
                  const Icon = notificationIcons[notification.type];
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        !notification.read ? 'bg-[#e6f2ff] border-[#003d82]' : 'bg-white border-gray-200'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${!notification.read ? 'bg-[#003d82]' : 'bg-gray-200'}`}>
                          <Icon className={`h-5 w-5 ${!notification.read ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className={`font-semibold ${!notification.read ? 'text-[#003d82]' : 'text-gray-900'}`}>
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.content}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Badge className={priorityColors[notification.priority]}>
                                {notification.priority === 'urgent' && 'Kiireellinen'}
                                {notification.priority === 'high' && 'Tärkeä'}
                                {notification.priority === 'medium' && 'Normaali'}
                                {notification.priority === 'low' && 'Matala'}
                              </Badge>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(notification.id);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{new Date(notification.createdAt).toLocaleString('fi-FI')}</span>
                            {!notification.read && (
                              <Badge variant="outline" className="bg-[#003d82] text-white border-[#003d82]">
                                Uusi
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
