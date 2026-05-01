import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Calendar, User, Pin, AlertCircle, Info, CheckCircle } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  date: string;
  category: 'general' | 'urgent' | 'event' | 'reminder' | 'info';
  isPinned: boolean;
  targetAudience: string[];
  expiresAt?: string;
  attachments?: string[];
}

export default function WilmaAnnouncements() {
  const [filter, setFilter] = useState<'all' | 'general' | 'urgent' | 'event' | 'reminder' | 'info'>('all');

  // Fetch announcements from API
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['/api/wilma/announcements'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/announcements');
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch announcements');
      }
      return response.json();
    },
    retry: false
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'urgent': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'event': return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'reminder': return <CheckCircle className="w-5 h-5 text-yellow-600" />;
      case 'info': return <Info className="w-5 h-5 text-green-600" />;
      default: return <Megaphone className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'urgent': return 'Tärkeä';
      case 'event': return 'Tapahtuma';
      case 'reminder': return 'Muistutus';
      case 'info': return 'Tiedote';
      default: return 'Yleinen';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return 'bg-red-50 text-red-700 border-red-200';
      case 'event': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'reminder': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'info': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const filteredAnnouncements = filter === 'all' 
    ? announcements 
    : announcements.filter(a => a.category === filter);

  // Sort: pinned first, then by date (newest first)
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const stats = {
    total: announcements.length,
    urgent: announcements.filter(a => a.category === 'urgent').length,
    events: announcements.filter(a => a.category === 'event').length,
    pinned: announcements.filter(a => a.isPinned).length,
  };

  if (isLoading) {
    return <div className="text-center py-8">Ladataan ilmoituksia...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#003d82]" />
              <div>
                <p className="text-xs text-gray-600">Ilmoituksia</p>
                <p className="text-xl font-bold text-[#003d82]">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">Tärkeitä</p>
                <p className="text-xl font-bold text-red-600">{stats.urgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Tapahtumia</p>
                <p className="text-xl font-bold text-blue-600">{stats.events}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pin className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Kiinnitettyjä</p>
                <p className="text-xl font-bold text-green-600">{stats.pinned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-[#dddddd]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-[#003d82] text-white' : ''}
            >
              Kaikki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('urgent')}
              className={filter === 'urgent' ? 'bg-red-600 text-white' : ''}
            >
              Tärkeät
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('event')}
              className={filter === 'event' ? 'bg-blue-600 text-white' : ''}
            >
              Tapahtumat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('reminder')}
              className={filter === 'reminder' ? 'bg-yellow-600 text-white' : ''}
            >
              Muistutukset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('info')}
              className={filter === 'info' ? 'bg-green-600 text-white' : ''}
            >
              Tiedotteet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <div className="space-y-3">
        {sortedAnnouncements.map((announcement) => (
          <Card 
            key={announcement.id} 
            className={`border-[#dddddd] hover:shadow-md transition-shadow ${
              announcement.isPinned ? 'border-l-4 border-l-[#003d82]' : ''
            } ${
              announcement.category === 'urgent' ? 'border-l-4 border-l-red-500' : ''
            }`}
          >
            <CardHeader className="p-4 bg-gray-50 border-b border-[#dddddd]">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getCategoryIcon(announcement.category)}
                  <div className="flex-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <CardTitle className="text-base font-semibold text-gray-900">
                        {announcement.title}
                      </CardTitle>
                      {announcement.isPinned && (
                        <Pin className="w-4 h-4 text-[#003d82] flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{announcement.author}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(announcement.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(announcement.category)}`}>
                  {getCategoryText(announcement.category)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {announcement.content}
              </p>
              
              {announcement.attachments && announcement.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Liitteet:</h5>
                  <div className="flex flex-wrap gap-2">
                    {announcement.attachments.map((attachment, idx) => (
                      <Button key={idx} variant="outline" size="sm">
                        {attachment}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {announcement.targetAudience.map((audience, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {audience === 'students' ? 'Oppilaat' : 
                       audience === 'parents' ? 'Vanhemmat' : 
                       audience === 'teachers' ? 'Opettajat' : 
                       audience === 'staff' ? 'Henkilökunta' : audience}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-gray-500">{announcement.authorRole}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedAnnouncements.length === 0 && (
        <Card className="border-[#dddddd]">
          <CardContent className="p-8 text-center">
            <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Ei ilmoituksia näytettäväksi</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
