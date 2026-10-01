import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, Clock, X, ChevronLeft, ChevronRight, AlertTriangle, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { trackFeatureUse } from "@/lib/analytics";

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

  // v4.7.10 — impression tracking. Fires once per announcement id
  // as it appears in the banner slot. `feature = 'announcement_view'`
  // with the announcement id in metadata; the CTR endpoint groups
  // by id and joins against 'announcement_click' events.
  const [seenIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const current = activeAnnouncements[currentIndex];
    if (!current) return;
    if (seenIds.has(current.id)) return;
    seenIds.add(current.id);
    try {
      trackFeatureUse('announcement_view', {
        announcementId: current.id,
        priority: current.priority,
      });
    } catch { /* non-fatal */ }
  }, [currentIndex, activeAnnouncements, seenIds]);

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
      return <AlertTriangle className="h-4 w-4 text-white shrink-0" strokeWidth={2.5} />;
    }
    return <Megaphone className="h-4 w-4 text-white shrink-0" strokeWidth={2.5} />;
  };

  const nextAnnouncement = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
  };

  const prevAnnouncement = () => {
    setCurrentIndex((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
  };

  // v4.7.43 — Wilma-style solid strip.  Navy on normal / high, red on
  // urgent, thin amber for medium.  Full-width edge-to-edge, no floating
  // chip, no card, no shadow.  32 px tall.
  const priorityBg =
    currentAnnouncement.priority === "urgent"
      ? "bg-red-700 hover:bg-red-800"
      : currentAnnouncement.priority === "high"
      ? "bg-amber-600 hover:bg-amber-700"
      : "bg-[#003d82] hover:bg-[#002d5f]";

  return (
    <>
      <div
        role="region"
        aria-label="Site announcement"
        className={cn(
          "relative z-40 w-full transition-colors cursor-pointer",
          priorityBg,
        )}
        onClick={() => {
          try {
            trackFeatureUse('announcement_click', {
              announcementId: currentAnnouncement.id,
              priority: currentAnnouncement.priority,
            });
          } catch { /* non-fatal */ }
          setIsDialogOpen(true);
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-2.5 px-3 sm:px-5 h-9 sm:h-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAnnouncement.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.28 }}
              className="flex items-center gap-2.5 flex-1 min-w-0"
            >
              {getPriorityIcon(currentAnnouncement.priority)}
              <p className="text-white text-[13px] sm:text-[14px] font-semibold truncate">
                {getLocalizedTitle(currentAnnouncement)}
                <span className="hidden sm:inline text-white/75 font-normal ml-2">
                  · {getLocalizedContent(currentAnnouncement)}
                </span>
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-0.5 shrink-0">
            {activeAnnouncements.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
                  className="h-7 w-7 rounded-[4px] hidden sm:inline-flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                  aria-label={isPaused ? "Resume rotation" : "Pause rotation"}
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); prevAnnouncement(); }}
                  className="h-7 w-7 rounded-[4px] inline-flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                  aria-label="Previous announcement"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span
                  className="hidden min-[360px]:inline-flex px-1.5 h-6 items-center text-[11px] font-bold tabular-nums text-white/85"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {currentIndex + 1}/{activeAnnouncements.length}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); nextAnnouncement(); }}
                  className="h-7 w-7 rounded-[4px] inline-flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                  aria-label="Next announcement"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
              className="h-7 w-7 rounded-[4px] inline-flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              aria-label="Dismiss announcement"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Announcement detail dialog — Wilma document style.
       *   v4.7.44: colored gradient header + negative-margin lift replaced
       *   with a solid Wilma surface + 3px navy top accent (or amber/red
       *   for high/urgent).  Priority chip becomes a Wilma-style tag with
       *   4 px radius.  Reads like a school notice, not a marketing card. */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className={cn(
            // v4.7.56 — same simplified sizing as AdminProfileDialog so
            // tablet + laptop + phone all work without height conflicts.
            "p-0 gap-0 overflow-hidden flex flex-col",
            "bg-white dark:bg-gray-950",
            "shadow-[0_24px_60px_-12px_rgba(15,23,42,0.4)]",
            "[&>button:first-of-type]:hidden",
            // Mobile phones: full-screen sheet
            "fixed inset-0 translate-x-0 translate-y-0 top-0 left-0 right-0 bottom-0",
            "w-screen h-[100dvh] max-w-none max-h-none rounded-none",
            "border-0",
            // Tablet + desktop: centred modal, content-driven height, 88 dvh cap
            "sm:fixed sm:top-[50%] sm:left-[50%] sm:bottom-auto sm:right-auto",
            "sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:inset-auto",
            "sm:h-auto sm:max-h-[88dvh] sm:w-[min(94vw,44rem)] sm:max-w-[44rem]",
            "sm:rounded-[8px] sm:border sm:border-[#d5dae0] sm:dark:border-[#2a3040]",
          )}
        >
          {/* Priority accent — explicit 3 px bar, color per priority */}
          <div
            className={cn(
              "shrink-0 h-[3px]",
              currentAnnouncement.priority === "urgent" ? "bg-red-700"
                : currentAnnouncement.priority === "high" ? "bg-amber-600"
                : "bg-[#003d82]",
            )}
          />

          {/* Document header — masthead + title + close */}
          <div
            className="shrink-0 border-b border-[#d5dae0] dark:border-[#2a3040] px-5 sm:px-6 py-4 sm:py-5"
            style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Masthead: priority tag + timestamp */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-1 rounded-[4px]",
                      currentAnnouncement.priority === "urgent" ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                        : currentAnnouncement.priority === "high" ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-[#e6ecf3] text-[#003d82] dark:bg-[#4a90d9]/15 dark:text-[#4a90d9]",
                    )}
                  >
                    {(() => {
                      const Icon = currentAnnouncement.priority === "urgent" || currentAnnouncement.priority === "high" ? AlertTriangle : Megaphone;
                      return <Icon className="h-3 w-3" strokeWidth={2.5} />;
                    })()}
                    {i18n.language === "fi"
                      ? currentAnnouncement.priority === "urgent" ? "Kiireellinen"
                      : currentAnnouncement.priority === "high" ? "Tärkeä"
                      : "Tiedote"
                      : currentAnnouncement.priority === "urgent" ? "Urgent"
                      : currentAnnouncement.priority === "high" ? "Important"
                      : "Announcement"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" strokeWidth={2.25} />
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

                <DialogTitle className="text-[20px] sm:text-[24px] font-bold text-gray-900 dark:text-white leading-[1.15] tracking-tight break-words">
                  {getLocalizedTitle(currentAnnouncement)}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {getLocalizedContent(currentAnnouncement).slice(0, 120)}
                </DialogDescription>
              </div>

              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="shrink-0 h-8 w-8 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          </div>

          {/* Body — scrollable prose column.  min-h-0 + overflow-y-auto is
           *  the reliable cross-browser pattern for scrollable flex kids;
           *  long announcements now scroll cleanly instead of clipping. */}
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 py-5 sm:py-6"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}
          >
            <div className={cn(
              "text-[15px] leading-[1.7]",
              darkMode ? "text-gray-300" : "text-gray-800",
            )}>
              {getLocalizedContent(currentAnnouncement).split("\n").map((line, idx) => {
                if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
                  return (
                    <div key={idx} className="flex items-start mb-3">
                      <span className="font-bold mr-3 mt-0.5 shrink-0 text-[#003d82] dark:text-[#4a90d9]">•</span>
                      <span>{line.trim().replace(/^[•-]\s*/, "")}</span>
                    </div>
                  );
                }
                if (line.trim().endsWith(":") && line.trim().length < 60 && !line.includes("http")) {
                  return (
                    <div key={idx} className={cn("font-bold mt-6 mb-2 text-[11px] tracking-[0.08em] uppercase", darkMode ? "text-gray-400" : "text-gray-600")}>
                      {line.trim().replace(/:$/, "")}
                    </div>
                  );
                }
                if (line.trim().startsWith("---") || line.trim().startsWith("━━━")) {
                  return <hr key={idx} className="my-5 border-[#d5dae0] dark:border-[#2a3040]" />;
                }
                if (line.trim() === "") return <div key={idx} className="h-3" />;
                return <p key={idx} className="mb-3">{line}</p>;
              })}
            </div>
          </div>

          {/* Footer — pagination */}
          {activeAnnouncements.length > 1 && (
            <div
              className="shrink-0 flex items-center justify-center gap-1 px-5 sm:px-6 py-3 border-t border-[#d5dae0] dark:border-[#2a3040]"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prevAnnouncement(); }}
                className="h-8 w-8 rounded-[6px] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <span className="text-[11px] font-bold tabular-nums px-3 text-gray-500 dark:text-gray-400">
                {currentIndex + 1} / {activeAnnouncements.length}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextAnnouncement(); }}
                className="h-8 w-8 rounded-[6px] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
