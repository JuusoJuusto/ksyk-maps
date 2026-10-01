/**
 * KSYK Maps — Lunch menu page.
 *
 * Data: Amica RSS feed via /api/lunch-menu.
 * Design: warm editorial — amber accent, clean typography, no icon boxes.
 */
import { useState, useEffect, useMemo, useRef } from "react";
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

const MENU_TIMEOUT_MS = 10_000;
const TRANSLATE_TIMEOUT_MS = 5_000;

const translateText = async (text: string): Promise<string> => {
  if (!text || text === "Ei saatavilla") return text;
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fi&tl=en&dt=t&q=${encodeURIComponent(text)}`,
      { signal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS) },
    );
    const data = await response.json();
    return data[0][0][0] || text;
  } catch {
    return text;
  }
};

/** Translates every dish at once and returns a Finnish → English lookup. */
const translateDishes = async (items: MenuItem[]): Promise<Map<string, string>> => {
  const unique = Array.from(new Set(items.flatMap((m) => [m.regular, m.vegetarian, m.dessert ?? ""])));
  const translated = await Promise.all(unique.map(translateText));
  return new Map(unique.map((fi, i) => [fi, translated[i]]));
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
  const requestIdRef = useRef(0);

  const isFi = i18n.language === "fi";
  const NOT_AVAILABLE = isFi ? "Ei saatavilla" : "Not available";

  const fetchMenu = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/lunch-menu", { signal: AbortSignal.timeout(MENU_TIMEOUT_MS) });
      if (!response.ok) throw new Error(`Lunch menu responded ${response.status}`);
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
        parsedMenu.push({
          date: title,
          dayName,
          vegetarian: vegetarian || "Ei saatavilla",
          regular: regular || "Ei saatavilla",
          dessert,
        });
      }
      if (requestId !== requestIdRef.current) return;
      setMenuItems(parsedMenu);
      setTodayIndex(foundTodayIndex);
      setSelectedIndex(foundTodayIndex);
      setLoading(false);

      // Show the Finnish menu right away, then swap in the translation.
      if (i18n.language === "en") {
        const lookup = await translateDishes(parsedMenu);
        if (requestId !== requestIdRef.current) return;
        const tr = (fi: string) => lookup.get(fi) ?? fi;
        setMenuItems(parsedMenu.map((m) => ({
          ...m,
          regular: tr(m.regular),
          vegetarian: tr(m.vegetarian),
          dessert: m.dessert ? tr(m.dessert) : m.dessert,
        })));
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to fetch menu:", err);
      setError(isFi ? "Ruokalistan lataaminen epäonnistui." : "Failed to load the menu.");
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
      className={cn("min-h-screen", darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900")}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <AnnouncementBanner />
      <Header />

      {/* Document header — Wilma masthead, matches FAQ / Privacy / Support */}
      <header className="border-b border-[#d5dae0] dark:border-[#2a3040] shrink-0 bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="shrink-0 h-9 w-9 -ml-2 rounded-[6px] flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            aria-label={isFi ? "Takaisin" : "Back"}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <span className="flex-1 text-[13px] font-semibold text-gray-700 dark:text-gray-300">
            {isFi ? "Kartta" : "Map"}
          </span>
          <button
            type="button"
            onClick={fetchMenu}
            disabled={loading}
            className="shrink-0 h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-40"
            aria-label={isFi ? "Päivitä" : "Refresh"}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-5 pt-5 sm:pt-6 pb-24"
        style={{ paddingBottom: "max(6rem, env(safe-area-inset-bottom, 6rem))" }}
      >
        {/* Title block */}
        <div className="mb-5 pb-4 border-b border-[#d5dae0] dark:border-[#2a3040]">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-amber-600 dark:text-amber-400 mb-1">
            Amica · Kulis
          </p>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-[1.15] text-gray-900 dark:text-white">
            {isFi ? "Ruokalista" : "Lunch menu"}
          </h1>
          <p className="text-[13px] mt-1 text-gray-500 dark:text-gray-400">
            {isFi ? "Kulosaaren yhteiskoulun päivittäinen lounas" : "Daily lunch at Kulosaaren yhteiskoulu"}
          </p>
        </div>

        {loading && (
          <div className="py-16">
            <LoadingSpinner fullScreen={false} message={isFi ? "Ladataan ruokalistaa..." : "Loading menu..."} />
          </div>
        )}

        {error && !loading && (
          <div
            className="rounded-[6px] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" strokeWidth={2.25} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-red-800 dark:text-red-200">{error}</p>
              <button
                type="button"
                onClick={fetchMenu}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-[6px] px-2.5 py-1.5 bg-white dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/70 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                {isFi ? "Yritä uudelleen" : "Try again"}
              </button>
            </div>
          </div>
        )}

        {isWeekend && !loading && !error && (
          <div className="rounded-[6px] border border-[#d5dae0] dark:border-[#2a3040] bg-white dark:bg-gray-950 p-6 sm:p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-amber-500 mb-3" strokeWidth={2} />
            <p className="text-[15px] font-bold tracking-tight">
              {isFi ? "Ravintola on suljettu viikonloppuisin" : "Closed on weekends"}
            </p>
            <p className="text-[13px] mt-1.5 text-gray-500 dark:text-gray-400">
              {isFi ? "Ruokalista on saatavilla ma – pe." : "Menu available Monday – Friday."}
            </p>
          </div>
        )}

        {!loading && !error && !isWeekend && menuItems.length === 0 && (
          <div className="rounded-[6px] border border-[#d5dae0] dark:border-[#2a3040] bg-white dark:bg-gray-950 p-6 sm:p-8 text-center">
            <UtensilsCrossed className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-3" strokeWidth={2} />
            <p className="text-[15px] font-bold tracking-tight">
              {isFi ? "Ruokalistaa ei ole vielä julkaistu" : "No menu published yet"}
            </p>
            <p className="text-[13px] mt-1.5 text-gray-500 dark:text-gray-400">
              {isFi ? "Kokeile päivittää hetken kuluttua." : "Try refreshing in a moment."}
            </p>
          </div>
        )}

        {!loading && !error && !isWeekend && menuItems.length > 0 && selected && (
          <>
            {/* Day strip — Wilma-style segmented control, evenly divided */}
            <div
              className="grid gap-0 border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] overflow-hidden mb-4 bg-white dark:bg-gray-950"
              style={{ gridTemplateColumns: `repeat(${menuItems.length}, minmax(0, 1fr))` }}
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
                      "relative flex flex-col items-center justify-center gap-0.5 h-16 sm:h-[68px] transition-colors",
                      index > 0 && "border-l border-[#d5dae0] dark:border-[#2a3040]",
                      isSel
                        ? "bg-[#003d82] text-white"
                        : darkMode
                          ? "bg-gray-950 text-gray-400 hover:text-white hover:bg-gray-900"
                          : "bg-white text-gray-700 hover:text-[#003d82] hover:bg-gray-50",
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold tracking-[0.08em] uppercase leading-none",
                      isSel ? "text-white/85" : "text-gray-500 dark:text-gray-400",
                    )}>
                      {shortDay(item.dayName)}
                    </span>
                    {dayNum != null && (
                      <span className="text-[19px] font-bold leading-none tabular-nums mt-1">{dayNum}</span>
                    )}
                    {isToday && (
                      <span
                        className="absolute bottom-1.5 h-1 w-1 rounded-full"
                        style={{ background: isSel ? "rgba(255,255,255,0.75)" : "#F59E0B" }}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Menu container */}
            <div
              key={selectedIndex}
              className="rounded-[6px] border border-[#d5dae0] dark:border-[#2a3040] bg-white dark:bg-gray-950 overflow-hidden"
            >
              {/* Menu header — masthead style */}
              <div className="px-5 pt-4 pb-3 border-b border-[#d5dae0] dark:border-[#2a3040]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-amber-600 dark:text-amber-400 leading-none">
                      {selectedIndex === todayIndex
                        ? isFi ? "Tänään" : "Today"
                        : (isFi ? "Ruokalista" : "Menu")}
                    </p>
                    <h2 className="text-[19px] sm:text-[21px] font-bold tracking-tight leading-tight mt-1 capitalize">
                      {selected.dayName}
                      {dateText && (
                        <span className="ml-2 text-[13px] font-medium text-gray-500 dark:text-gray-400">
                          {dateText}
                        </span>
                      )}
                    </h2>
                  </div>
                  {selectedIndex === todayIndex && (
                    <span className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 dark:bg-amber-500 text-white text-[10px] font-bold tracking-[0.06em] uppercase px-2 py-1 rounded-[4px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/85" aria-hidden />
                      {isFi ? "Tänään" : "Today"}
                    </span>
                  )}
                </div>
              </div>

              {/* Dish rows */}
              <div className="divide-y divide-[#d5dae0] dark:divide-[#2a3040]">
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
            <p className="mt-5 pt-4 border-t border-[#d5dae0] dark:border-[#2a3040] text-[11px] text-center text-gray-500 dark:text-gray-500">
              Amica / Compass Group Finland
              <span className="mx-2 text-gray-300 dark:text-gray-700">·</span>
              {isFi ? "Voi muuttua ilman ennakkoilmoitusta" : "Subject to change without notice"}
            </p>
          </>
        )}
      </main>
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
    <div className="px-5 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/60">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-2 w-2 rounded-[2px] shrink-0" style={{ background: accentColor }} />
        <span className={cn(
          "text-[10px] font-bold tracking-[0.08em] uppercase",
          darkMode ? "text-gray-500" : "text-gray-500",
        )}>
          {label}
        </span>
      </div>
      <p className={cn(
        "text-[15px] sm:text-[16px] leading-snug pl-4",
        isEmpty
          ? "text-gray-400 dark:text-gray-600 italic"
          : darkMode ? "text-gray-100 font-medium" : "text-gray-900 font-medium",
      )}>
        {isEmpty ? emptyLabel : value}
      </p>
    </div>
  );
}
