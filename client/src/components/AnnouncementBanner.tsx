import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, Clock, X, ChevronLeft, ChevronRight, AlertTriangle, Pause, Play, Sparkles } from "lucide-react";
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
  // Same-family gradient used on the outer strip so the banner reads
  // as a single "priority object" instead of a flat block. Matches
  // the popup hero for continuity when the user taps to expand.
  const priorityGradient =
    currentAnnouncement.priority === "urgent"
      ? "bg-gradient-to-r from-red-600 via-rose-500 to-red-600"
      : currentAnnouncement.priority === "high"
      ? "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
      : "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500";

  return (
    <>
      {/* Outer strip — gradient chip that runs edge to edge but the
       *  inner card floats with side margin + all-corner rounding so the
       *  banner looks like a chip at every screen size (mobile → desktop).
       *  Subtle inner highlight + ring so it reads as glassy rather than
       *  flat. */}
      <div className="relative z-40 pt-2 px-2 sm:px-3 md:px-4">
        <div
          role="region"
          aria-label="Site announcement"
          className={cn(
            "relative rounded-2xl shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ring-1 ring-white/10 hover:shadow-xl",
            priorityGradient,
          )}
          onClick={() => setIsDialogOpen(true)}
        >
          {/* Glass shine that follows the chip's top edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
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
                    // announcement title. Screen readers get the "N of M"
                    // via the aria-live region + the current text
                    // ("1/5") — no aria-label to avoid double-announcing.
                    className="hidden min-[360px]:block px-1.5 sm:px-2 py-0.5 bg-white/20 text-white text-[10px] sm:text-xs font-semibold rounded"
                    aria-live="polite"
                    aria-atomic="true"
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

      {/* Announcement Detail Dialog — v3.22 overhaul. Full-bleed
       *  gradient hero at the top carries the priority color, an
       *  animated "pulse" ring around the icon draws the eye, and the
       *  title sits on a solid background for max legibility. */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className={cn(
            "max-w-lg w-[calc(100vw-1.5rem)] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl",
            "max-h-[calc(100dvh-3rem)]",
            "bg-white dark:bg-gray-950",
          )}
        >
          {/* Full-bleed gradient hero — priority-tinted with a subtle
           *  radial highlight in the top-right so it never reads as a
           *  flat solid band. Icon is inside a glass circle with an
           *  animated ping so the whole thing feels alive. */}
          <div
            className={cn(
              "relative px-5 sm:px-6 pt-6 pb-5 overflow-hidden",
              currentAnnouncement.priority === "urgent"
                ? "bg-gradient-to-br from-red-600 via-red-500 to-rose-600"
                : currentAnnouncement.priority === "high"
                ? "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500"
                : "bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500",
            )}
          >
            {/* Radial highlight */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
            {/* Sparkle decoration */}
            <Sparkles className="pointer-events-none absolute top-4 right-6 h-5 w-5 text-white/30 rotate-12" />

            <div className="relative flex items-start gap-3.5">
              {/* Icon in a glass circle + animated ping */}
              <div className="relative shrink-0">
                <span className="absolute inset-0 rounded-2xl bg-white/60 animate-ping opacity-40" />
                <div className="relative h-12 w-12 rounded-2xl bg-white/25 backdrop-blur-md ring-1 ring-white/40 flex items-center justify-center text-white shadow-lg">
                  {getPriorityIcon(currentAnnouncement.priority)}
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/95 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/20">
                    {i18n.language === "fi"
                      ? currentAnnouncement.priority === "urgent"
                        ? "Kiireellinen"
                        : currentAnnouncement.priority === "high"
                        ? "Korkea prioriteetti"
                        : "Tiedote"
                      : currentAnnouncement.priority === "urgent"
                      ? "Urgent"
                      : currentAnnouncement.priority === "high"
                      ? "High priority"
                      : "Announcement"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/85">
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
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight leading-tight text-white">
                  {getLocalizedTitle(currentAnnouncement)}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {getLocalizedContent(currentAnnouncement).slice(0, 120)}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Body — scrollable prose with richer typography and
           *  distinctly-styled bullet points. Bullet dot is now a
           *  priority-tinted rounded pill so the list has visual
           *  rhythm even without any structure in the source text. */}
          <div className="px-5 sm:px-6 py-5 overflow-y-auto max-h-[calc(100dvh-20rem)]">
            <div className={cn(
              "text-[15px] leading-relaxed",
              darkMode ? "text-gray-300" : "text-gray-700",
            )}>
              {getLocalizedContent(currentAnnouncement).split("\n").map((line, index) => {
                if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
                  const dotColor =
                    currentAnnouncement.priority === "urgent"
                      ? "bg-red-500"
                      : currentAnnouncement.priority === "high"
                      ? "bg-orange-500"
                      : "bg-blue-500";
                  return (
                    <div key={index} className="flex items-start gap-2.5 mb-2 group">
                      <span className={cn(
                        "shrink-0 mt-2 h-1.5 w-1.5 rounded-full transition-all group-hover:scale-125",
                        dotColor,
                      )} />
                      <span>{line.trim().replace(/^[•-]\s*/, "")}</span>
                    </div>
                  );
                }
                if (line.trim().endsWith(":") && line.trim().length < 60 && !line.includes("http")) {
                  return (
                    <div key={index} className={cn(
                      "font-bold text-[13px] uppercase tracking-wider mt-4 mb-2",
                      currentAnnouncement.priority === "urgent"
                        ? "text-red-600 dark:text-red-400"
                        : currentAnnouncement.priority === "high"
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-blue-600 dark:text-blue-400",
                    )}>
                      {line.trim().replace(/:$/, "")}
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

          {/* Footer — matches the priority tint on the primary CTA so
           *  the eye lands on it. Includes a small dot pager on the
           *  left when there are multiple announcements to indicate
           *  which one is showing. */}
          <div className={cn(
            "flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t",
            darkMode ? "border-gray-800 bg-gray-950" : "border-gray-100 bg-gray-50/60",
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "text-[11px] font-semibold",
                darkMode ? "text-gray-500" : "text-gray-500",
              )}>
                KSYK Maps
              </div>
              {activeAnnouncements.length > 1 && (
                <div className="flex items-center gap-0.5 ml-1">
                  {activeAnnouncements.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 rounded-full transition-all",
                        i === currentIndex ? "w-4" : "w-1",
                        i === currentIndex
                          ? currentAnnouncement.priority === "urgent"
                            ? "bg-red-500"
                            : currentAnnouncement.priority === "high"
                            ? "bg-orange-500"
                            : "bg-blue-500"
                          : "bg-gray-300 dark:bg-gray-700",
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={() => setIsDialogOpen(false)}
              className={cn(
                "h-10 px-5 rounded-xl font-semibold text-white shadow-md active:scale-[0.98] transition-all",
                currentAnnouncement.priority === "urgent"
                  ? "bg-red-600 hover:bg-red-700 shadow-red-600/25"
                  : currentAnnouncement.priority === "high"
                  ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/25"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25",
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
