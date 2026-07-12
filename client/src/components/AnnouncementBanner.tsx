import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, Clock, X, ChevronLeft, ChevronRight, AlertTriangle, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
    if (activeAnnouncements.length <= 1 || isPaused || isDialogOpen) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 10000); // 10 seconds
    
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

  const priorityBg =
    currentAnnouncement.priority === "urgent"
      ? "bg-red-600 hover:bg-red-700"
      : currentAnnouncement.priority === "high"
      ? "bg-orange-500 hover:bg-orange-600"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <>
      {/* Outer strip — solid colored strip runs edge to edge but the
       *  inner card floats with side margin + all-corner rounding so the
       *  banner looks like a chip at every screen size (mobile → desktop). */}
      <div className="relative z-40 pt-2 px-2 sm:px-3 md:px-4">
        <div
          role="region"
          aria-label="Site announcement"
          className={cn(
            "relative rounded-2xl shadow-lg transition-colors duration-300 cursor-pointer overflow-hidden",
            priorityBg,
          )}
          onClick={() => setIsDialogOpen(true)}
        >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex items-center justify-between gap-2 py-1.5 sm:py-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAnnouncement.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"
              >
                <div className="flex-shrink-0 bg-white/20 p-1 sm:p-1.5 rounded-full">
                  {getPriorityIcon(currentAnnouncement.priority)}
                </div>
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-white font-bold text-xs sm:text-sm truncate">
                    {getLocalizedTitle(currentAnnouncement)}
                  </p>
                  <p className="text-white/85 text-[10px] sm:text-xs truncate hidden sm:block">
                    {getLocalizedContent(currentAnnouncement)}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-1 flex-shrink-0">
              {activeAnnouncements.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPaused(!isPaused);
                    }}
                    className="h-7 w-7 p-0 text-white hover:bg-white/20 transition-colors hidden sm:inline-flex"
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
                    className="h-7 w-7 p-0 text-white hover:bg-white/20 transition-colors"
                    aria-label="Previous announcement"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <div
                    // Hidden below 360px so the 5 controls don't crush the
                    // announcement title on iPhone SE 1st gen and other
                    // 320-360px phones. Screen readers still announce via
                    // aria-live on parent.
                    className="hidden min-[360px]:block px-1.5 sm:px-2 py-0.5 bg-white/20 text-white text-[10px] sm:text-xs font-semibold rounded"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-label={`Announcement ${currentIndex + 1} of ${activeAnnouncements.length}`}
                  >
                    {currentIndex + 1}/{activeAnnouncements.length}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextAnnouncement();
                    }}
                    className="h-7 w-7 p-0 text-white hover:bg-white/20 transition-colors"
                    aria-label="Next announcement"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
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
                className="h-7 w-7 p-0 text-white hover:bg-black/30 transition-colors"
                aria-label="Dismiss announcement"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Announcement Detail Dialog — rebuilt to match the app chrome:
       *  colored banner strip up top (matches the banner + hamburger),
       *  clean prose body, rounded card feel. */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className={cn(
            "max-w-2xl w-[calc(100vw-1.5rem)] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl",
            "max-h-[calc(100dvh-4rem)]",
          )}
        >
          {/* Colored strip — mirrors the banner's priority color so the
           *  dialog reads as an expansion of the same object. */}
          <div className={cn(
            "flex items-start gap-3 px-5 py-4 text-white",
            priorityBg,
          )}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-white/15 ring-1 ring-white/20">
              {getPriorityIcon(currentAnnouncement.priority)}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight leading-tight text-white">
                {getLocalizedTitle(currentAnnouncement)}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-white/80">
                  <span className="uppercase tracking-[0.16em] font-semibold">
                    {currentAnnouncement.priority}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(() => {
                      try {
                        const timestamp = currentAnnouncement.createdAt;
                        let date: Date;
                        if (!timestamp) return "Recently";
                        if (typeof timestamp === "object" && timestamp._seconds) {
                          date = new Date(timestamp._seconds * 1000);
                        } else {
                          date = new Date(timestamp);
                        }
                        if (isNaN(date.getTime())) return "Recently";
                        return formatDistanceToNow(date, { addSuffix: true });
                      } catch {
                        return "Recently";
                      }
                    })()}
                  </span>
                </div>
              </DialogDescription>
            </div>
          </div>

          {/* Body — scrollable prose */}
          <div className="px-5 sm:px-6 py-5 overflow-y-auto max-h-[calc(100dvh-16rem)]">
            <div className={cn(
              "text-[15px] leading-relaxed",
              "text-gray-700 dark:text-gray-300",
            )}>
              {getLocalizedContent(currentAnnouncement).split("\n").map((line, index) => {
                if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
                  return (
                    <div key={index} className="flex items-start mb-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold mr-2 mt-1">•</span>
                      <span>{line.trim().replace(/^[•-]\s*/, "")}</span>
                    </div>
                  );
                }
                if (line.trim().endsWith(":") && line.trim().length < 60 && !line.includes("http")) {
                  return (
                    <div key={index} className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
                      {line.trim()}
                    </div>
                  );
                }
                if (line.trim().startsWith("---") || line.trim().startsWith("━━━")) {
                  return <hr key={index} className="my-4 border-gray-200 dark:border-gray-800" />;
                }
                if (line.trim() === "") {
                  return <div key={index} className="mb-2" />;
                }
                return (
                  <div key={index} className="mb-2">
                    {line}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer — sticky close button */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40">
            <div className="text-[11px] text-gray-500 dark:text-gray-500">
              KSYK Maps
            </div>
            <Button
              onClick={() => setIsDialogOpen(false)}
              className={cn(
                "h-10 px-5 rounded-xl font-semibold text-white",
                priorityBg,
              )}
            >
              {i18n.language === "fi" ? "Sulje" : "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
