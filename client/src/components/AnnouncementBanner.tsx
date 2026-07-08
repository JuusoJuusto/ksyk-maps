import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, Clock, X, ChevronLeft, ChevronRight, AlertTriangle, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
  const { i18n } = useTranslation();
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
    if (activeAnnouncements.length <= 1 || isPaused || isDialogOpen) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [activeAnnouncements.length, isPaused, isDialogOpen]);

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
    let content = '';
    if (i18n.language === 'fi' && announcement.contentFi) {
      content = announcement.contentFi;
    } else {
      content = announcement.contentEn || announcement.content;
    }

    // Fix bullet points for all languages
    return content.replace(/^[•-]\s*/gm, '• ');
  };

  const isUrgent = currentAnnouncement.priority === "urgent";
  const isHigh = currentAnnouncement.priority === "high";
  const isElevated = isUrgent || isHigh;

  const getPriorityIcon = (priority: string) => {
    if (priority === "urgent" || priority === "high") {
      return <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />;
    }
    return <Megaphone className="h-4 w-4" strokeWidth={2.25} />;
  };

  const getPriorityLabel = (priority: string) => {
    if (i18n.language === "fi") {
      if (priority === "urgent") return "Kiireellinen";
      if (priority === "high") return "Tärkeä";
      return "Tiedote";
    }
    if (priority === "urgent") return "Urgent";
    if (priority === "high") return "Important";
    return "Announcement";
  };

  const nextAnnouncement = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
  };

  const prevAnnouncement = () => {
    setCurrentIndex((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
  };

  return (
    <>
      <div
        role="region"
        aria-label="Site announcement"
        className={cn(
          "relative z-40 border-b transition-colors duration-300",
          isElevated
            ? "bg-white dark:bg-gray-950 border-black/5 dark:border-white/5"
            : "bg-white dark:bg-gray-950 border-black/5 dark:border-white/5",
        )}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="flex-1 min-w-0 flex items-center gap-2.5 sm:gap-3 py-2 sm:py-2.5 text-left active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-lg"
            aria-label={`${getPriorityLabel(currentAnnouncement.priority)}: ${getLocalizedTitle(currentAnnouncement)}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAnnouncement.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0"
              >
                <div
                  className={cn(
                    "flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ring-1",
                    isUrgent
                      ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-900/50"
                      : isHigh
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-900/50"
                      : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-blue-200 dark:ring-blue-900/50",
                  )}
                >
                  {getPriorityIcon(currentAnnouncement.priority)}
                </div>
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 dark:text-gray-500 mb-0.5">
                    {getPriorityLabel(currentAnnouncement.priority)}
                  </p>
                  <p className="text-[13px] sm:text-sm font-semibold tracking-tight text-gray-900 dark:text-white truncate">
                    {getLocalizedTitle(currentAnnouncement)}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </button>

          <div className="flex-shrink-0 flex items-center gap-0.5 sm:gap-1">
            {activeAnnouncements.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(!isPaused);
                  }}
                  className="h-9 w-9 p-0 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors hidden sm:inline-flex active:scale-[0.9]"
                  title={isPaused ? "Resume" : "Pause"}
                  aria-label={isPaused ? "Resume rotation" : "Pause rotation"}
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevAnnouncement();
                  }}
                  className="h-9 w-9 p-0 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors active:scale-[0.9]"
                  aria-label="Previous announcement"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="hidden sm:flex px-1.5 h-5 items-center text-[10px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 tabular-nums">
                  {currentIndex + 1}/{activeAnnouncements.length}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextAnnouncement();
                  }}
                  className="h-9 w-9 p-0 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors active:scale-[0.9]"
                  aria-label="Next announcement"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="h-9 w-9 p-0 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors active:scale-[0.9]"
              aria-label="Dismiss announcement"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Announcement Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl ring-1 ring-black/5 dark:ring-white/5">
          <DialogHeader className="space-y-3">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 dark:text-gray-500">
              {getPriorityLabel(currentAnnouncement.priority)}
            </p>
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ring-1",
                  isUrgent
                    ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-900/50"
                    : isHigh
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-900/50"
                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-blue-200 dark:ring-blue-900/50",
                )}
              >
                {getPriorityIcon(currentAnnouncement.priority)}
              </div>
              <DialogTitle className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] leading-tight text-gray-900 dark:text-white flex-1 pt-1">
                {getLocalizedTitle(currentAnnouncement)}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {(() => {
                try {
                  const timestamp = currentAnnouncement.createdAt;
                  let date: Date;

                  if (!timestamp) return 'Recently';

                  if (typeof timestamp === 'object' && (timestamp as any)._seconds) {
                    date = new Date((timestamp as any)._seconds * 1000);
                  } else {
                    date = new Date(timestamp);
                  }

                  if (isNaN(date.getTime())) return 'Recently';

                  return formatDistanceToNow(date, { addSuffix: true });
                } catch {
                  return 'Recently';
                }
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="prose max-w-none">
              <div className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {getLocalizedContent(currentAnnouncement).split('\n').map((line, index) => {
                  if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                    return (
                      <div key={index} className="flex items-start mb-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold mr-2 mt-1">•</span>
                        <span>{line.trim().replace(/^[•-]\s*/, '')}</span>
                      </div>
                    );
                  }

                  if (line.trim().endsWith(':') && line.trim().length < 60 && !line.includes('http')) {
                    return (
                      <div key={index} className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
                        {line.trim()}
                      </div>
                    );
                  }

                  if (line.trim().startsWith('---') || line.trim().startsWith('━━━')) {
                    return <hr key={index} className="my-4 border-gray-200 dark:border-white/10" />;
                  }

                  // Empty lines
                  if (line.trim() === '') {
                    return <div key={index} className="mb-2"></div>;
                  }

                  // Regular text
                  return (
                    <div key={index} className="mb-2">
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {isUrgent && (
              <div className="rounded-2xl ring-1 ring-red-200 dark:ring-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-[13px] text-red-700 dark:text-red-300 font-semibold">
                  {i18n.language === "fi" ? "Kiireellinen tiedote" : "Urgent announcement"}
                </p>
              </div>
            )}

            {isHigh && (
              <div className="rounded-2xl ring-1 ring-amber-200 dark:ring-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                <p className="text-[13px] text-amber-800 dark:text-amber-300 font-semibold">
                  {i18n.language === "fi" ? "Tärkeä tiedote" : "High priority"}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setIsDialogOpen(false)}
              className="h-11 px-5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white font-semibold text-sm active:scale-[0.97]"
            >
              {i18n.language === "fi" ? "Sulje" : "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
