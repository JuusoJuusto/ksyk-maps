import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, Clock, X, ChevronLeft, ChevronRight, AlertTriangle, Info } from "lucide-react";
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

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const response = await fetch("/api/announcements?limit=5");
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
  });

  const activeAnnouncements = announcements.filter((a: Announcement) => a.isActive);

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
      className="absolute top-14 md:top-4 left-2 right-2 md:left-auto md:right-4 z-10 max-w-md"
    >
      <Card className="shadow-2xl border-blue-200 bg-white overflow-hidden">
        <div className={`h-1 ${
          currentAnnouncement.priority === "urgent"
            ? "bg-gradient-to-r from-red-500 to-red-600"
            : currentAnnouncement.priority === "high"
            ? "bg-gradient-to-r from-orange-500 to-orange-600"
            : "bg-gradient-to-r from-blue-500 to-blue-600"
        }`} />
        
        <CardContent className="p-2 md:p-4">
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div 
              className="flex items-center space-x-1.5 md:space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setIsDialogOpen(true)}
            >
              <div className="scale-75 md:scale-100">
                {getPriorityIcon(currentAnnouncement.priority)}
              </div>
              <h3 className="font-bold text-blue-900 text-xs md:text-base">{t('announcements.title')}</h3>
              {activeAnnouncements.length > 1 && (
                <Badge variant="outline" className="text-[10px] md:text-xs px-1 md:px-2 py-0 md:py-0.5">
                  {currentIndex + 1} / {activeAnnouncements.length}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-5 w-5 md:h-6 md:w-6 p-0 hover:bg-red-100"
            >
              <X className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentAnnouncement.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div 
                className="p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-100 mb-2 md:mb-3 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setIsDialogOpen(true)}
              >
                <div className="flex items-start justify-between mb-1 md:mb-2">
                  <h4 className="font-semibold text-[11px] md:text-sm text-blue-900 flex-1 leading-tight">
                    {getLocalizedTitle(currentAnnouncement)}
                  </h4>
                  <Badge className={`text-[9px] md:text-xs ml-1 md:ml-2 px-1 md:px-2 py-0 md:py-0.5 ${getPriorityColor(currentAnnouncement.priority)}`}>
                    {currentAnnouncement.priority}
                  </Badge>
                </div>
                <p className="text-[10px] md:text-xs text-blue-700 mb-1 md:mb-2 leading-snug md:leading-relaxed line-clamp-2 md:line-clamp-none">
                  {getLocalizedContent(currentAnnouncement)}
                </p>
                <div className="flex items-center text-[9px] md:text-xs text-blue-600">
                  <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                  {(() => {
                    try {
                      const timestamp = currentAnnouncement.createdAt;
                      let date: Date;
                      
                      if (!timestamp) {
                        return t('announcements.recently');
                      }
                      
                      if (typeof timestamp === 'object' && timestamp._seconds) {
                        date = new Date(timestamp._seconds * 1000);
                      } 
                      else {
                        date = new Date(timestamp);
                      }
                      
                      if (isNaN(date.getTime())) {
                        return t('announcements.recently');
                      }
                      
                      return formatDistanceToNow(date, { addSuffix: true });
                    } catch {
                      return 'Recently';
                    }
                  })()}
                </div>
                <div 
                  className="flex items-center justify-center mt-1 md:mt-2 text-[9px] md:text-xs text-blue-600 cursor-pointer hover:text-blue-800 transition-colors"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Info className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                  <span>{t('announcements.clickDetails')}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
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

          {activeAnnouncements.length > 1 && (
            <div className="flex items-center justify-between mt-2 md:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={prevAnnouncement}
                className="h-6 md:h-8 px-1.5 md:px-2"
              >
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <div className="flex space-x-0.5 md:space-x-1">
                {activeAnnouncements.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${
                      idx === currentIndex ? "bg-blue-600 w-3 md:w-4" : "bg-blue-200"
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={nextAnnouncement}
                className="h-6 md:h-8 px-1.5 md:px-2"
              >
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
