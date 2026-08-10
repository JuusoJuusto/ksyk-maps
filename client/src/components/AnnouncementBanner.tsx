import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, Clock, X, ChevronLeft, ChevronRight, AlertTriangle, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";

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
  const { darkMode } = useDarkMode();
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
          {/* v3.28.0 — reverted the 3.27.5 size bump per feedback.
           *  Back to the original compact strip that doesn't dominate
           *  the top of the screen. Dialog polish moved to the modal
           *  itself (see the AnnouncementDialog below). */}
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPaused(!isPaused);
                    }}
                    className="h-7 w-7 p-0 rounded text-white hover:bg-white/20 transition-colors hidden sm:inline-flex items-center justify-center"
                    title={isPaused ? "Resume" : "Pause"}
                    aria-label={isPaused ? "Resume rotation" : "Pause rotation"}
                  >
                    {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevAnnouncement();
                    }}
                    className="h-7 w-7 p-0 rounded inline-flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    aria-label="Previous announcement"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <div
                    className="hidden min-[360px]:block px-1.5 sm:px-2 py-0.5 bg-white/20 text-white text-[10px] sm:text-xs font-semibold rounded"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {currentIndex + 1}/{activeAnnouncements.length}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextAnnouncement();
                    }}
                    className="h-7 w-7 p-0 rounded inline-flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    aria-label="Next announcement"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="h-7 w-7 p-0 rounded inline-flex items-center justify-center text-white hover:bg-black/30 transition-colors"
                aria-label="Dismiss announcement"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Announcement Detail Dialog — premium Apple/MazeMap card style. */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className={cn(
            "p-0 gap-0 border-0 shadow-[0_32px_80px_-12px_rgba(15,23,42,0.45)]",
            // Mobile: full-width bottom sheet (overrides shadcn's default centering)
            "fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 rounded-t-[28px]",
            "max-h-[88dvh] w-full max-w-full",
            // Desktop: restore shadcn's default centered-fixed positioning with custom width
            "sm:left-[50%] sm:top-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:right-auto sm:bottom-auto",
            "sm:max-w-[min(90vw,34rem)] sm:w-full sm:max-h-[85dvh]",
            "[&>button:first-of-type]:hidden",
            "sm:rounded-3xl",
            "flex flex-col overflow-hidden",
            "bg-white dark:bg-gray-950",
          )}
        >
          {/* Priority accent gradient header */}
          <div
            className={cn("shrink-0 rounded-t-[28px] sm:rounded-t-3xl relative overflow-hidden", priorityBg)}
            style={{ paddingBottom: "2.5rem" }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="absolute top-3.5 right-3.5 h-8 w-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Mobile grab handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <span className="h-[5px] w-10 rounded-full bg-white/30" />
            </div>

            <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-1">
              {/* Priority chip + time */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full bg-white/20 text-white">
                  {getPriorityIcon(currentAnnouncement.priority)}
                  {i18n.language === "fi"
                    ? currentAnnouncement.priority === "urgent" ? "Kiireellinen"
                    : currentAnnouncement.priority === "high" ? "Tärkeä"
                    : "Tiedote"
                    : currentAnnouncement.priority === "urgent" ? "Urgent"
                    : currentAnnouncement.priority === "high" ? "Important"
                    : "Announcement"}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                  <Clock className="h-3 w-3" />
                  {(() => {
                    try {
                      const ts = currentAnnouncement.createdAt;
                      if (!ts) return i18n.language === "fi" ? "Äskettäin" : "Recently";
                      const d = typeof ts === "object" && (ts as { _seconds?: number })._seconds
                        ? new Date((ts as { _seconds: number })._seconds * 1000)
                        : new Date(ts);
                      if (isNaN(d.getTime())) return i18n.language === "fi" ? "Äskettäin" : "Recently";
                      return formatDistanceToNow(d, { addSuffix: true });
                    } catch { return i18n.language === "fi" ? "Äskettäin" : "Recently"; }
                  })()}
                </span>
              </div>

              <DialogTitle className="text-[22px] sm:text-[26px] font-bold text-white leading-tight tracking-tight line-clamp-3">
                {getLocalizedTitle(currentAnnouncement)}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {getLocalizedContent(currentAnnouncement).slice(0, 120)}
              </DialogDescription>
            </div>
          </div>

          {/* White body lifts over gradient via negative margin + border-radius */}
          <div
            className="flex-1 min-h-0 flex flex-col bg-white dark:bg-gray-950 rounded-t-3xl -mt-6 overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-5 pb-4">
              <div className={cn("text-[15px] leading-[1.65]", darkMode ? "text-gray-300" : "text-gray-700")}>
                {getLocalizedContent(currentAnnouncement).split("\n").map((line, idx) => {
                  if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
                    return (
                      <div key={idx} className="flex items-start mb-2.5">
                        <span
                          className={cn("font-bold mr-2.5 mt-0.5 shrink-0", priorityBg.replace(/\s+hover:[^\s]+/g, ""), "bg-clip-text")}
                          style={{ color: currentAnnouncement.priority === "urgent" ? "#dc2626" : currentAnnouncement.priority === "high" ? "#ea580c" : "#2563eb" }}
                        >•</span>
                        <span>{line.trim().replace(/^[•-]\s*/, "")}</span>
                      </div>
                    );
                  }
                  if (line.trim().endsWith(":") && line.trim().length < 60 && !line.includes("http")) {
                    return (
                      <div key={idx} className={cn("font-bold mt-5 mb-2 text-[13px] tracking-[0.06em] uppercase", darkMode ? "text-gray-200" : "text-gray-900")}>
                        {line.trim()}
                      </div>
                    );
                  }
                  if (line.trim().startsWith("---") || line.trim().startsWith("━━━")) {
                    return <hr key={idx} className="my-4 border-gray-100 dark:border-gray-800" />;
                  }
                  if (line.trim() === "") return <div key={idx} className="h-3" />;
                  return <p key={idx} className="mb-2">{line}</p>;
                })}
              </div>
            </div>

            {/* Footer — pagination only (no close button; header X handles closing) */}
            {activeAnnouncements.length > 1 && (
              <div
                className={cn(
                  "shrink-0 flex items-center justify-center gap-1 px-5 sm:px-6 py-3 border-t",
                  darkMode ? "border-gray-800/60" : "border-gray-100",
                )}
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); prevAnnouncement(); }}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className={cn("text-[11px] font-semibold tabular-nums px-2", darkMode ? "text-gray-500" : "text-gray-400")}>
                  {currentIndex + 1} / {activeAnnouncements.length}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); nextAnnouncement(); }}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
