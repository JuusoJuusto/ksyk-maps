/**
 * KSYK Maps — Lunch menu page.
 *
 * Data: Amica RSS feed via /api/lunch-menu.
 * Design: warm editorial — amber accent, clean typography, no icon boxes.
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
  AlertCircle,
  RefreshCw,
  ChevronLeft,
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

  const shortDay = (name: string) => {
    if (!name) return "";
    return name.slice(0, 3);
  };

  return (
    <div
      className={cn("min-h-screen", darkMode ? "bg-[#151310] text-gray-100" : "bg-[#FEFBF3] text-gray-900")}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <AnnouncementBanner />
      <Header />

      {/* Sticky header */}
      <div
        className={cn(
          "sticky top-0 z-20 backdrop-blur-xl border-b",
          darkMode ? "bg-[#151310]/92 border-white/6" : "bg-[#FEFBF3]/92 border-black/8",
        )}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-3 sm:px-5 py-2.5">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className={cn(
              "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90",
              darkMode ? "text-gray-300 hover:text-white hover:bg-white/8" : "text-gray-600 hover:text-gray-900 hover:bg-black/6",
            )}
            aria-label={isFi ? "Takaisin" : "Back"}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black tracking-[0.22em] uppercase text-amber-500 dark:text-amber-400 leading-none">
              Amica · Kulis
            </p>
            <h1 className="text-[21px] font-bold tracking-[-0.02em] leading-tight mt-0.5">
              {isFi ? "Ruokalista" : "Lunch menu"}
            </h1>
          </div>
          <button
            type="button"
            onClick={fetchMenu}
            disabled={loading}
            className={cn(
              "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40",
              darkMode ? "text-gray-400 hover:text-gray-100 hover:bg-white/8" : "text-gray-500 hover:text-gray-800 hover:bg-black/6",
            )}
            aria-label={isFi ? "Päivitä" : "Refresh"}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 pb-24 space-y-4">

        {loading && (
          <div className="py-20">
            <LoadingSpinner fullScreen={false} message={isFi ? "Ladataan ruokalistaa..." : "Loading menu..."} />
          </div>
        )}

        {error && !loading && (
          <div
            className={cn(
              "rounded-2xl p-4 flex items-start gap-3",
              darkMode ? "bg-red-950/40 border border-red-900/40 text-red-200" : "bg-red-50 border border-red-100 text-red-800",
            )}
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={2.25} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{error}</p>
              <button
                type="button"
                onClick={fetchMenu}
                className={cn(
                  "mt-2 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors active:scale-95",
                  darkMode ? "bg-red-900/50 hover:bg-red-900/70 text-red-100" : "bg-white hover:bg-red-50 text-red-700 border border-red-200",
                )}
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                {isFi ? "Yritä uudelleen" : "Try again"}
              </button>
            </div>
          </div>
        )}

        {isWeekend && !loading && !error && (
          <div className={cn(
            "rounded-2xl p-8 text-center",
            darkMode ? "bg-white/4 border border-white/6" : "bg-white border border-black/6 shadow-sm",
          )}>
            <div className={cn(
              "mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-4",
              darkMode ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-600",
            )}>
              <Calendar className="h-7 w-7" strokeWidth={2} />
            </div>
            <p className="text-base font-bold tracking-tight">
              {isFi ? "Ravintola on suljettu viikonloppuisin" : "Closed on weekends"}
            </p>
            <p className={cn("text-sm mt-2", darkMode ? "text-gray-400" : "text-gray-500")}>
              {isFi ? "Ruokalista on saatavilla ma – pe." : "Menu available Monday – Friday."}
            </p>
          </div>
        )}

        {!loading && !error && !isWeekend && menuItems.length === 0 && (
          <div className={cn(
            "rounded-2xl p-8 text-center",
            darkMode ? "bg-white/4 border border-white/6" : "bg-white border border-black/6 shadow-sm",
          )}>
            <div className={cn(
              "mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-4",
              darkMode ? "bg-white/8 text-gray-400" : "bg-slate-100 text-gray-500",
            )}>
              <UtensilsCrossed className="h-7 w-7" strokeWidth={2} />
            </div>
            <p className="text-base font-bold tracking-tight">
              {isFi ? "Ruokalistaa ei ole vielä julkaistu" : "No menu published yet"}
            </p>
            <p className={cn("text-sm mt-2", darkMode ? "text-gray-400" : "text-gray-500")}>
              {isFi ? "Kokeile päivittää hetken kuluttua." : "Try refreshing in a moment."}
            </p>
          </div>
        )}

        {!loading && !error && !isWeekend && menuItems.length > 0 && selected && (
          <>
            {/* Day strip — pill buttons with date number + today dot */}
            <div
              className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:-mx-5 sm:px-5 pb-0.5"
              role="tablist"
              aria-label={isFi ? "Viikonpäivät" : "Weekdays"}
            >
              {menuItems.map((item, index) => {
                const isSel = index === selectedIndex;
                const isToday = index === todayIndex;
                const dateMatch = item.date.match(/(\d{2})-(\d{2})-(\d{4})/);
                const dayNum = dateMatch ? parseInt(dateMatch[1], 10) : null;
                return (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={isSel}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center gap-0.5 px-5 py-2.5 rounded-2xl transition-all active:scale-[0.96]",
                      isSel
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                        : darkMode
                          ? "bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/8"
                          : "bg-black/5 text-gray-500 hover:text-gray-800 hover:bg-black/8",
                    )}
                  >
                    <span className="text-[9px] font-black tracking-[0.16em] uppercase leading-none">
                      {shortDay(item.dayName)}
                    </span>
                    {dayNum != null && (
                      <span className="text-[22px] font-bold leading-none tabular-nums">{dayNum}</span>
                    )}
                    {isToday && (
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ background: isSel ? "rgba(255,255,255,0.65)" : "#F59E0B" }}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Menu card */}
            <div className={cn(
              "rounded-3xl overflow-hidden",
              darkMode
                ? "bg-[#1C1915] border border-white/6"
                : "bg-white border border-black/6 shadow-[0_2px_24px_rgba(0,0,0,0.07)]",
            )}>
              {/* Card header */}
              <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black tracking-[0.22em] uppercase text-amber-500 dark:text-amber-400 leading-none">
                    {selectedIndex === todayIndex
                      ? isFi ? "Tänään" : "Today"
                      : dateText || (isFi ? "Ruokalista" : "Menu")}
                  </p>
                  <h2 className="text-[26px] font-bold tracking-[-0.02em] leading-tight mt-1 capitalize">
                    {selected.dayName}
                  </h2>
                  {selectedIndex === todayIndex && dateText && (
                    <p className={cn("text-xs mt-0.5", darkMode ? "text-gray-500" : "text-gray-400")}>{dateText}</p>
                  )}
                </div>
                {selectedIndex === todayIndex && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 bg-amber-500 text-white text-[10px] font-black tracking-[0.12em] uppercase px-3 py-1.5 rounded-full shadow-sm shadow-amber-500/25 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden />
                    {isFi ? "Tänään" : "Today"}
                  </span>
                )}
              </div>

              {/* Dish rows */}
              <div className={cn("border-t", darkMode ? "border-white/6" : "border-black/6")}>
                <DishRow
                  label={isFi ? "Lounas" : "Main"}
                  value={selected.regular}
                  emptyLabel={NOT_AVAILABLE}
                  darkMode={darkMode}
                  accentColor="#F59E0B"
                />
                <DishRow
                  label={isFi ? "Kasvislounas" : "Vegetarian"}
                  value={selected.vegetarian}
                  emptyLabel={NOT_AVAILABLE}
                  darkMode={darkMode}
                  accentColor="#10B981"
                />
                {selected.dessert && (
                  <DishRow
                    label={isFi ? "Jälkiruoka" : "Dessert"}
                    value={selected.dessert}
                    emptyLabel={NOT_AVAILABLE}
                    darkMode={darkMode}
                    accentColor="#F43F5E"
                  />
                )}
              </div>
            </div>

            {/* Attribution */}
            <p className={cn("text-[11px] text-center", darkMode ? "text-gray-600" : "text-gray-400")}>
              Amica / Compass Group Finland
              <span className="mx-2">·</span>
              {isFi ? "Voi muuttua ilman ennakkoilmoitusta" : "Subject to change without notice"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function DishRow({
  label,
  value,
  emptyLabel,
  darkMode,
  accentColor,
}: {
  label: string;
  value: string;
  emptyLabel: string;
  darkMode: boolean;
  accentColor: string;
}) {
  const isEmpty = !value || value === "Ei saatavilla" || value === emptyLabel;
  return (
    <div className={cn(
      "px-5 py-4 border-b last:border-0 transition-colors",
      darkMode ? "border-white/5 hover:bg-white/[0.02]" : "border-black/5 hover:bg-black/[0.015]",
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full shrink-0 opacity-90" style={{ background: accentColor }} />
        <span className={cn(
          "text-[9px] font-black tracking-[0.2em] uppercase",
          darkMode ? "text-gray-500" : "text-gray-400",
        )}>
          {label}
        </span>
      </div>
      <p className={cn(
        "text-[16px] leading-snug pl-4",
        isEmpty
          ? darkMode ? "text-gray-600 italic" : "text-gray-400 italic"
          : darkMode ? "text-gray-100 font-medium" : "text-gray-800 font-medium",
      )}>
        {isEmpty ? emptyLabel : value}
      </p>
    </div>
  );
}
