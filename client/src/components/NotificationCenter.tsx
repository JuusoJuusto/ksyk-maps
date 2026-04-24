import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, X, Check, AlertCircle, Info, Award, 
  FileText, UserCheck, MessageSquare, Calendar, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: 'grade' | 'homework' | 'attendance' | 'message' | 'general';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface NotificationCenterProps {
  userId: string;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadNotifications = async () => {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem(`notifications_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }

      // TODO: Fetch from backend
      // const response = await fetch(`/api/wilma/notifications/${userId}`);
      // if (response.ok) {
      //   const data = await response.json();
      //   setNotifications(data);
      //   localStorage.setItem(`notifications_${userId}`, JSON.stringify(data));
      // }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));

    // TODO: Update backend
    // await fetch(`/api/wilma/notifications/${notificationId}/read`, {
    //   method: 'PUT'
    // });
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));

    toast({
      title: "Kaikki merkitty luetuiksi",
      description: "Kaikki ilmoitukset on merkitty luetuiksi.",
    });

    // TODO: Update backend
    // await fetch(`/api/wilma/notifications/mark-all-read`, {
    //   method: 'PUT',
    //   body: JSON.stringify({ userId })
    // });
  };

  const deleteNotification = async (notificationId: string) => {
    const updated = notifications.filter(n => n.id !== notificationId);
    setNotifications(updated);
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));

    toast({
      title: "Ilmoitus poistettu",
      description: "Ilmoitus on poistettu.",
    });

    // TODO: Delete from backend
    // await fetch(`/api/wilma/notifications/${notificationId}`, {
    //   method: 'DELETE'
    // });
  };

  const clearAll = async () => {
    setNotifications([]);
    localStorage.removeItem(`notifications_${userId}`);

    toast({
      title: "Kaikki ilmoitukset poistettu",
      description: "Kaikki ilmoitukset on poistettu.",
    });

    // TODO: Delete from backend
    // await fetch(`/api/wilma/notifications/clear-all`, {
    //   method: 'DELETE',
    //   body: JSON.stringify({ userId })
    // });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'grade':
        return <Award className="w-5 h-5 text-yellow-600" />;
      case 'homework':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'attendance':
        return <UserCheck className="w-5 h-5 text-green-600" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <Card className="absolute right-0 top-12 w-96 max-h-[600px] overflow-hidden shadow-2xl z-50 border-2">
            <CardHeader className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Ilmoitukset
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="bg-white text-[#003d82]">
                      {unreadCount}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-white text-[#003d82]'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Kaikki ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === 'unread'
                      ? 'bg-white text-[#003d82]'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Lukemattomat ({unreadCount})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-[450px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Ei ilmoituksia</p>
                  <p className="text-sm mt-1">
                    {filter === 'unread' ? 'Kaikki ilmoitukset on luettu' : 'Sinulla ei ole ilmoituksia'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-gray-900">
                              {notification.title}
                            </h4>
                            {notification.priority !== 'low' && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPriorityColor(notification.priority)}`}
                              >
                                {notification.priority === 'high' ? 'Kiireellinen' : 'Tärkeä'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {notification.timestamp.toLocaleDateString('fi-FI')} {notification.timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex gap-1">
                              {!notification.read && (
                                <Button
                                  onClick={() => markAsRead(notification.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Merkitse luetuksi
                                </Button>
                              )}
                              <Button
                                onClick={() => deleteNotification(notification.id)}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Footer Actions */}
            {notifications.length > 0 && (
              <div className="border-t p-3 bg-gray-50 flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Merkitse kaikki luetuiksi
                  </Button>
                )}
                <Button
                  onClick={clearAll}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Tyhjennä kaikki
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
