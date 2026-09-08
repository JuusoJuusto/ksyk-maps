/**
 * KSYK Maps — Lunch menu page.
 *
 * Data comes from Amica's RSS feed via /api/lunch-menu. The presentation
 * follows the Nordic Editorial vocabulary used across the app:
 *   - Sticky editorial header (small tracked label + bold black title)
 *   - Single KSYK blue accent, muted neutrals, no rainbow tiles
 *   - rounded-2xl cards with ring-1 ring-black/5 dark:ring-white/5
 *   - Segmented iOS-style day picker instead of a 5-way grid
 *   - Dark-mode aware throughout
 */
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import LoadingSpinner from "@/components/LoadingSpinner";
import Header from "@/components/Header";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import { trackFeature } from "@/lib/analytics";
import {
  Calendar,
  UtensilsCrossed,
  Leaf,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  Cake,
  Info,
} from "lucide-react";

interface MenuItem {
  date: string;
  dayName: string;
  vegetarian: string;
  regular: string;
  dessert?: string;
}

const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (targetLang === "fi" || !text || text === "Ei saatavilla") return text;
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fi&tl=en&dt=t&q=${encodeURIComponent(text)}`,
    );
    const data = await response.json();
    return data[0][0][0] || text;
  } catch {
    return text;
  }
};

export default function Lunch() {
  const { i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { darkMode } = useDarkMode();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayIndex, setTodayIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isWeekend, setIsWeekend] = useState(false);

  const isFi = i18n.language === "fi";
  const NOT_AVAILABLE = isFi ? "Ei saatavilla" : "Not available";

  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/lunch-menu");
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");
      const parsedMenu: MenuItem[] = [];
      const today = new Date();
      const dayOfWeek = today.getDay();
      setIsWeekend(dayOfWeek === 0 || dayOfWeek === 6);
      let foundTodayIndex = 0;
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const title = item.querySelector("title")?.textContent || "";
        const description = item.querySelector("description")?.textContent || "";
        const dateMatch = title.match(/(\d{2})-(\d{2})-(\d{4})/);
        const rawDayFirst = (title.split(",")[0] || "").trim().split(/\s+/)[0];
        const rawDayKey = rawDayFirst.toLowerCase();
        const FI_TO_EN: Record<string, string> = {
          ma: "Monday", maanantai: "Monday",
          ti: "Tuesday", tiistai: "Tuesday",
          ke: "Wednesday", keskiviikko: "Wednesday",
          to: "Thursday", torstai: "Thursday",
          pe: "Friday", perjantai: "Friday",
        };
        const dayName = i18n.language === "en" ? (FI_TO_EN[rawDayKey] ?? rawDayFirst) : rawDayFirst;
        if (dateMatch) {
          const itemDate = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
          if (itemDate.toDateString() === today.toDateString()) {
            foundTodayIndex = index;
          }
        }
        const lines = description
          .split("<br>")
          .map((line) => line.replace(/<[^>]*>/g, "").trim())
          .filter((line) => line.length > 0);
        let vegetarian = "";
        let regular = "";
        let dessert = "";
        lines.forEach((line) => {
          if (line.includes("Kasvislounas:")) {
            vegetarian = line.replace("Kasvislounas:", "").trim();
          } else if (line.includes("Lounas:")) {
            regular = line.replace("Lounas:", "").trim();
          } else if (line.includes("Jälkiruoka:")) {
            dessert = line.replace("Jälkiruoka:", "").trim();
          }
        });
        if (i18n.language === "en") {
          vegetarian = await translateText(vegetarian, "en");
          regular = await translateText(regular, "en");
          if (dessert) dessert = await translateText(dessert, "en");
        }
        parsedMenu.push({
          date: title,
          dayName,
          vegetarian: vegetarian || "Ei saatavilla",
          regular: regular || "Ei saatavilla",
          dessert,
        });
      }
      setMenuItems(parsedMenu);
      setTodayIndex(foundTodayIndex);
      setSelectedIndex(foundTodayIndex);
    } catch (err) {
      console.error("Failed to fetch menu:", err);
      setError(isFi ? "Ruokalistan lataaminen epäonnistui." : "Failed to load the menu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prev = document.title;
    document.title = isFi ? "Ruokalista — KSYK Maps" : "Lunch menu — KSYK Maps";
    return () => { document.title = prev; };
  }, [isFi]);

  useEffect(() => {
    fetchMenu();
    trackFeature("lunch_page_viewed", { lang: i18n.language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const selected = menuItems[selectedIndex];
  const dateText = useMemo(() => {
    if (!selected) return "";
    const parts = selected.date.split(",");
    return (parts[1] || "").trim();
  }, [selected]);

  // Short two-letter labels for the segmented control keep the row from
  // wrapping on 320-375px viewports even when the RSS returns long day names.
  const shortDay = (name: string) => {
    if (!name) return "";
    return name.slice(0, 3);
  };

  return (
    <div
      className={cn(
        "min-h-screen",
        darkMode
          ? "bg-gradient-to-b from-gray-950 via-gray-900 to-slate-900 text-gray-100"
          : "bg-gradient-to-b from-slate-50 via-white to-blue-50/40 text-gray-900",
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <AnnouncementBanner />
      <Header />

      {/* Editorial header — sticky so the back button + wordmark stay reachable */}
      <div
        className={cn(
          "sticky top-0 z-20 backdrop-blur-xl border-b",
          darkMode ? "bg-gray-950/85 border-gray-800/70" : "bg-white/85 border-gray-200/70",
        )}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className={cn(
              "shrink-0 h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition-all",
              darkMode
                ? "text-gray-300 hover:text-white hover:bg-gray-800/70"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            )}
            aria-label={isFi ? "Takaisin" : "Back"}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
            <span
              className={cn(
                "text-[10px] font-bold tracking-[0.18em] uppercase hidden sm:inline shrink-0 pt-2",
                darkMode ? "text-gray-500" : "text-gray-400",
              )}
            >
              Amica · Kulis
            </span>
            <span
              className={cn(
                "hidden sm:inline w-px h-4 self-center shrink-0",
                darkMode ? "bg-gray-800" : "bg-gray-300",
              )}
            />
            <h1
              className={cn(
                "text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] leading-none truncate",
                darkMode ? "text-white" : "text-gray-900",
              )}
            >
              {isFi ? "Ruokalista" : "Lunch menu"}
            </h1>
          </div>
          <button
            type="button"
            onClick={fetchMenu}
            disabled={loading}
            className={cn(
              "shrink-0 h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-50",
              darkMode
                ? "text-gray-300 hover:text-white hover:bg-gray-800/70"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            )}
            aria-label={isFi ? "Päivitä" : "Refresh"}
          >
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 space-y-4">
        {/* Mobile-only subtitle — the sm+ header has the divider so this
            keeps the small-screen layout from feeling context-free. */}
        <p
          className={cn(
            "sm:hidden text-[11px] font-bold tracking-[0.18em] uppercase",
            darkMode ? "text-gray-500" : "text-gray-400",
          )}
        >
          Amica · Kulis
        </p>

        {loading && (
          <div className="py-16">
            <LoadingSpinner
              fullScreen={false}
              message={isFi ? "Ladataan ruokalistaa..." : "Loading menu..."}
            />
          </div>
        )}

        {error && !loading && (
          <div
            className={cn(
              "rounded-2xl ring-1 p-4 flex items-start gap-3",
              darkMode
                ? "bg-red-950/40 ring-red-900/60 text-red-200"
                : "bg-red-50 ring-red-100 text-red-800",
            )}
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={2.25} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{error}</p>
              <button
                type="button"
                onClick={fetchMenu}
                className={cn(
                  "mt-2 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors active:scale-95",
                  darkMode
                    ? "bg-red-900/50 hover:bg-red-900/70 text-red-100"
                    : "bg-white hover:bg-red-100 text-red-700 ring-1 ring-red-200",
                )}
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                {isFi ? "Yritä uudelleen" : "Try again"}
              </button>
            </div>
          </div>
        )}

        {isWeekend && !loading && !error && (
          <div
            className={cn(
              "rounded-2xl ring-1 p-5 sm:p-6 text-center",
              darkMode
                ? "bg-blue-950/40 ring-blue-900/60"
                : "bg-blue-50 ring-blue-100",
            )}
          >
            <div
              className={cn(
                "mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-3",
                darkMode ? "bg-blue-900/60 text-blue-200" : "bg-white text-blue-600 ring-1 ring-blue-100",
              )}
            >
              <Calendar className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <p
              className={cn(
                "text-base font-bold tracking-[-0.01em]",
                darkMode ? "text-blue-100" : "text-blue-900",
              )}
            >
              {isFi ? "Ravintola on suljettu viikonloppuisin" : "Closed on weekends"}
            </p>
            <p
              className={cn(
                "text-sm mt-1.5 leading-relaxed",
                darkMode ? "text-blue-200/80" : "text-blue-700/90",
              )}
            >
              {isFi ? "Ruokalista on saatavilla ma – pe." : "Menu available Monday – Friday."}
            </p>
          </div>
        )}

        {!loading && !error && !isWeekend && menuItems.length > 0 && selected && (
          <>
            {/* Segmented day picker — iOS-style white active pill. Scrollable
                on very narrow screens but usually fits 5 days at 375px. */}
            <div
              className={cn(
                "flex gap-1 p-1 rounded-2xl ring-1 backdrop-blur-xl",
                "sticky top-[3.75rem] sm:top-[4.5rem] z-10",
                darkMode
                  ? "bg-gray-900/70 ring-white/5"
                  : "bg-white/85 ring-black/5 shadow-sm shadow-black/[0.03]",
              )}
              role="tablist"
              aria-label={isFi ? "Viikonpäivät" : "Weekdays"}
            >
              {menuItems.map((item, index) => {
                const isSel = index === selectedIndex;
                const isToday = index === todayIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={isSel}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl transition-all active:scale-[0.97]",
                      isSel
                        ? darkMode
                          ? "bg-white text-gray-900 shadow-sm"
                          : "bg-gray-900 text-white shadow-md shadow-gray-900/10"
                        : darkMode
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-500 hover:text-gray-900",
                    )}
                  >
                    <span className="text-[11px] font-bold tracking-[0.14em] uppercase leading-none">
                      {shortDay(item.dayName)}
                    </span>
                    {isToday && (
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isSel
                            ? darkMode ? "bg-gray-900" : "bg-white"
                            : "bg-blue-600 dark:bg-blue-400",
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected-day card — one refined card, no rainbow borders. */}
            <div
              className={cn(
                "rounded-2xl ring-1 overflow-hidden",
                darkMode ? "bg-gray-900/70 ring-white/5" : "bg-white ring-black/5 shadow-sm shadow-black/[0.03]",
              )}
            >
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[10px] font-bold tracking-[0.18em] uppercase",
                      darkMode ? "text-gray-500" : "text-gray-400",
                    )}
                  >
                    {selectedIndex === todayIndex
                      ? isFi ? "Tänään" : "Today"
                      : dateText || (isFi ? "Ruokalista" : "Menu")}
                  </p>
                  <h2
                    className={cn(
                      "text-lg sm:text-xl font-bold tracking-[-0.01em] leading-tight mt-1 truncate",
                      darkMode ? "text-white" : "text-gray-900",
                    )}
                  >
                    {selected.dayName}
                  </h2>
                  {selectedIndex === todayIndex && dateText && (
                    <p className={cn("text-xs mt-0.5", darkMode ? "text-gray-400" : "text-gray-500")}>
                      {dateText}
                    </p>
                  )}
                </div>
                {selectedIndex === todayIndex && (
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.1em] uppercase",
                      darkMode
                        ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30"
                        : "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />
                    {isFi ? "Tänään" : "Today"}
                  </span>
                )}
              </div>

              <div className={cn("mx-5 h-px", darkMode ? "bg-white/5" : "bg-black/5")} />

              <div className="px-3 sm:px-4 py-2 sm:py-3 space-y-1">
                <DishRow
                  icon={<UtensilsCrossed className="h-4 w-4" strokeWidth={2.25} />}
                  label={isFi ? "Lounas" : "Main"}
                  value={selected.regular}
                  emptyLabel={NOT_AVAILABLE}
                  darkMode={darkMode}
                />
                <DishRow
                  icon={<Leaf className="h-4 w-4" strokeWidth={2.25} />}
                  label={isFi ? "Kasvislounas" : "Vegetarian"}
                  value={selected.vegetarian}
                  emptyLabel={NOT_AVAILABLE}
                  darkMode={darkMode}
                />
                {selected.dessert && (
                  <DishRow
                    icon={<Cake className="h-4 w-4" strokeWidth={2.25} />}
                    label={isFi ? "Jälkiruoka" : "Dessert"}
                    value={selected.dessert}
                    emptyLabel={NOT_AVAILABLE}
                    darkMode={darkMode}
                  />
                )}
              </div>
            </div>

            {/* Attribution footer — muted, editorial */}
            <div
              className={cn(
                "rounded-2xl ring-1 px-4 py-3.5 flex items-start gap-3",
                darkMode ? "bg-gray-900/50 ring-white/5" : "bg-slate-50/80 ring-black/5",
              )}
            >
              <Info
                className={cn("h-4 w-4 shrink-0 mt-0.5", darkMode ? "text-gray-500" : "text-gray-400")}
                strokeWidth={2.25}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[11px] leading-relaxed",
                    darkMode ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  {isFi
                    ? "Ruokalista Amica / Compass Group Finland."
                    : "Menu by Amica / Compass Group Finland."}
                  <span className={cn("mx-1.5", darkMode ? "text-gray-700" : "text-gray-300")}>·</span>
                  {isFi ? "Voi muuttua ilman ennakkoilmoitusta." : "Subject to change without notice."}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Empty state — RSS returned zero items and we're not weekend / errored. */}
        {!loading && !error && !isWeekend && menuItems.length === 0 && (
          <div
            className={cn(
              "rounded-2xl ring-1 p-6 sm:p-8 text-center",
              darkMode ? "bg-gray-900/50 ring-white/5" : "bg-white ring-black/5",
            )}
          >
            <div
              className={cn(
                "mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-3",
                darkMode ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-gray-500",
              )}
            >
              <UtensilsCrossed className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <p className={cn("text-base font-bold tracking-[-0.01em]", darkMode ? "text-gray-100" : "text-gray-900")}>
              {isFi ? "Ruokalistaa ei ole vielä julkaistu" : "No menu published yet"}
            </p>
            <p className={cn("text-sm mt-1.5", darkMode ? "text-gray-400" : "text-gray-500")}>
              {isFi ? "Kokeile päivittää hetken kuluttua." : "Try refreshing in a moment."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Icon-in-square + label + description row — matches the vocabulary of
// SettingRow but styled for menu content (multi-line, larger body copy).
function DishRow({
  icon,
  label,
  value,
  emptyLabel,
  darkMode,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emptyLabel: string;
  darkMode: boolean;
}) {
  const isEmpty = !value || value === "Ei saatavilla" || value === emptyLabel;
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3 px-3 rounded-xl transition-colors",
        darkMode ? "hover:bg-gray-800/40" : "hover:bg-slate-50/80",
      )}
    >
      <span
        className={cn(
          "shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5",
          darkMode ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-600",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[10px] font-bold tracking-[0.18em] uppercase",
            darkMode ? "text-gray-500" : "text-gray-400",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "text-[15px] leading-[1.45] mt-1",
            isEmpty
              ? darkMode ? "text-gray-500 italic" : "text-gray-400 italic"
              : darkMode ? "text-gray-100" : "text-gray-800",
          )}
        >
          {isEmpty ? emptyLabel : value}
        </p>
      </div>
    </div>
  );
}
