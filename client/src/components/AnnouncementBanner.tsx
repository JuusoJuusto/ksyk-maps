import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, Clock, X, ChevronLeft, ChevronRight, AlertTriangle, Info, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Helper function to convert Firebase Timestamp to Date
const convertFirebaseDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000);
  }
  return new Date(timestamp);
};

interface Announcement {
  id: string;
  title: string;
  titleEn?: string;
  titleFi?: string;
  content: string;
  contentEn?: string;
  contentFi?: string;
  priority: string;
  createdAt: string;
  isActive: boolean;
}

export default function AnnouncementBanner() {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const response = await fetch("/api/announcements?limit=5");
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
  });

  const activeAnnouncements = announcements.filter((a: Announcement) => a.isActive);

  // Auto-scroll every 10 seconds
  useEffect(() => {
    if (activeAnnouncements.length <= 1 || isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [activeAnnouncements.length, isPaused]);

  if (!isVisible || activeAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = activeAnnouncements[currentIndex];
  
  // Get localized content
  const getLocalizedTitle = (announcement: Announcement) => {
    if (i18n.language === 'fi' && announcement.titleFi) {
      return announcement.titleFi;
    }
    return announcement.titleEn || announcement.title;
  };
  
  const getLocalizedContent = (announcement: Announcement) => {
    if (i18n.language === 'fi' && announcement.contentFi) {
      return announcement.contentFi;
    }
    return announcement.contentEn || announcement.content;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "urgent" || priority === "high") {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <Megaphone className="h-5 w-5" />;
  };

  const nextAnnouncement = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
  };

  const prevAnnouncement = () => {
    setCurrentIndex((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-2 md:px-4">
        <div className="flex items-center justify-between py-2 md:py-2.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAnnouncement.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0"
              onClick={() => setIsDialogOpen(true)}
            >
              <div className="flex-shrink-0">
                {getPriorityIcon(currentAnnouncement.priority)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-xs md:text-sm truncate">
                  {getLocalizedTitle(currentAnnouncement)}
                </p>
                <p className="text-blue-100 text-[10px] md:text-xs truncate">
                  {getLocalizedContent(currentAnnouncement)}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
            {activeAnnouncements.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                  className="h-7 w-7 md:h-8 md:w-8 p-0 text-white hover:bg-white/20"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? (
                    <Play className="h-3 w-3 md:h-4 md:w-4" />
                  ) : (
                    <Pause className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevAnnouncement}
                  className="h-7 w-7 md:h-8 md:w-8 p-0 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 bg-white/20 text-white border-white/30">
                  {currentIndex + 1}/{activeAnnouncements.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextAnnouncement}
                  className="h-7 w-7 md:h-8 md:w-8 p-0 text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-7 w-7 md:h-8 md:w-8 p-0 text-white hover:bg-red-500/50"
            >
              <X className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Announcement Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <DialogTitle className="text-2xl flex items-center">
                    {getPriorityIcon(currentAnnouncement.priority)}
                    <span className="ml-2">{getLocalizedTitle(currentAnnouncement)}</span>
                  </DialogTitle>
                  <Badge className={`${getPriorityColor(currentAnnouncement.priority)}`}>
                    {currentAnnouncement.priority}
                  </Badge>
                </div>
                <DialogDescription className="text-sm text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {(() => {
                    try {
                      const timestamp = currentAnnouncement.createdAt;
                      let date: Date;
                      
                      if (!timestamp) return t('announcements.recently');
                      
                      if (typeof timestamp === 'object' && timestamp._seconds) {
                        date = new Date(timestamp._seconds * 1000);
                      } else {
                        date = new Date(timestamp);
                      }
                      
                      if (isNaN(date.getTime())) return t('announcements.recently');
                      
                      return formatDistanceToNow(date, { addSuffix: true });
                    } catch {
                      return 'Recently';
                    }
                  })()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4 space-y-4">
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {getLocalizedContent(currentAnnouncement)}
                  </p>
                </div>
                
                {currentAnnouncement.priority === 'urgent' && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      <p className="text-sm text-red-700 font-semibold">
                        {t('announcements.urgent')}
                      </p>
                    </div>
                  </div>
                )}
                
                {currentAnnouncement.priority === 'high' && (
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                      <p className="text-sm text-orange-700 font-semibold">
                        {t('announcements.high')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setIsDialogOpen(false)}>
                  {t('close')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
    </motion.div>
  );
}
