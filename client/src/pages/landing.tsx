import { Button } from "@/components/ui/button";
import KSYKLogo from "@/components/KSYKLogo";
import { useTranslation } from "react-i18next";
import {
  MapPin, Users, Globe, ArrowRight, Navigation2, UtensilsCrossed,
  Bus, Layers, Search, Sun, Moon, ChevronRight, Map, Lock
} from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function Landing() {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const stats = [
    { value: "6+", label: "Buildings" },
    { value: "200+", label: "Rooms mapped" },
    { value: "2", label: "Languages" },
    { value: "3D", label: "Map view" },
  ];

  const features = [
    {
      icon: Map,
      color: "blue",
      title: "Interactive campus map",
      body: "Detailed 2D and 3D floor plans across every wing and building. Tap any room for instant details.",
    },
    {
      icon: Navigation2,
      color: "indigo",
      title: "Turn-by-turn navigation",
      body: "Get directions between any two rooms on campus with a clear, step-by-step route.",
    },
    {
      icon: Search,
      color: "violet",
      title: "Instant room search",
      body: "Find classrooms, offices, labs, and facilities instantly with ⌘K quick-access.",
    },
    {
      icon: UtensilsCrossed,
      color: "orange",
      title: "Daily lunch menu",
      body: "Today's cafeteria menu with English translation — updated every morning.",
    },
    {
      icon: Bus,
      color: "green",
      title: "HSL transport",
      body: "Live departure times for bus and metro stops nearest to the school.",
    },
    {
      icon: Users,
      color: "blue",
      title: "Staff directory",
      body: "Find and contact teachers and staff without having to ask around.",
    },
    {
      icon: Globe,
      color: "teal",
      title: "Bilingual",
      body: "Full Finnish and English support throughout the entire app.",
    },
    {
      icon: Lock,
      color: "gray",
      title: "School access only",
      body: "Secured with KSYK school accounts — only students and staff can log in.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Log in with your school account",
      body: "Use your @ksyk.fi account. No extra sign-up needed.",
    },
    {
      step: "02",
      title: "Search or tap the map",
      body: "Type a room number or use the interactive map to explore the campus.",
    },
    {
      step: "03",
      title: "Get directions or view details",
      body: "See schedules, capacity, and get turn-by-turn navigation to any room.",
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      icon: "text-blue-600 dark:text-blue-400",
      ring: "ring-blue-100 dark:ring-blue-900/40",
    },
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
      icon: "text-indigo-600 dark:text-indigo-400",
      ring: "ring-indigo-100 dark:ring-indigo-900/40",
    },
    violet: {
      bg: "bg-violet-50 dark:bg-violet-950/40",
      icon: "text-violet-600 dark:text-violet-400",
      ring: "ring-violet-100 dark:ring-violet-900/40",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-950/40",
      icon: "text-orange-600 dark:text-orange-400",
      ring: "ring-orange-100 dark:ring-orange-900/40",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-950/40",
      icon: "text-green-600 dark:text-green-400",
      ring: "ring-green-100 dark:ring-green-900/40",
    },
    teal: {
      bg: "bg-teal-50 dark:bg-teal-950/40",
      icon: "text-teal-600 dark:text-teal-400",
      ring: "ring-teal-100 dark:ring-teal-900/40",
    },
    gray: {
      bg: "bg-gray-100 dark:bg-gray-800/60",
      icon: "text-gray-600 dark:text-gray-400",
      ring: "ring-gray-200 dark:ring-gray-700/40",
    },
  };

  return (
    <div className={cn("min-h-screen flex flex-col", darkMode ? "dark bg-gray-950" : "bg-gray-50")}>
      {/* Header */}
      <div className="sticky top-0 z-50 px-2 sm:px-3 md:px-4 pt-2">
        <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/70 dark:border-gray-800/70 shadow-sm rounded-2xl overflow-hidden">
          <div className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center gap-2 sm:gap-3">
                <KSYKLogo size="sm" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-blue-600 tracking-tight leading-none">
                    KSYK Maps
                  </h1>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 font-medium leading-none mt-0.5">
                    Campus navigation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDarkMode}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    darkMode
                      ? "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <Button
                  onClick={handleLogin}
                  className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 active:scale-[0.98] transition-all"
                  data-testid="button-login"
                >
                  {t("login")}
                </Button>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-14 sm:pt-24 pb-12 sm:pb-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-full ring-1 ring-blue-100 dark:ring-blue-900/40">
            <MapPin className="h-3 w-3" />
            Kulosaaren yhteiskoulu
          </div>
          <h2 className="text-[38px] sm:text-[62px] font-bold tracking-[-0.035em] text-gray-900 dark:text-white leading-[1.03] mb-6">
            Find every room.
            <br />
            <span className="text-blue-600 dark:text-blue-400">Never get lost.</span>
          </h2>
          <p className="text-[16px] sm:text-[18px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-8">
            Interactive campus navigation for students, staff, and visitors at KSYK.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={handleLogin}
              className="h-12 px-7 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-[0.98] transition-all"
              data-testid="button-hero-login"
            >
              Open campus map
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-16">
        <div className={cn(
          "grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 rounded-2xl overflow-hidden ring-1",
          darkMode
            ? "bg-gray-900 ring-gray-800 divide-gray-800"
            : "bg-white ring-gray-200/70 divide-gray-100 shadow-sm"
        )}>
          {stats.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center justify-center py-5 px-4 text-center">
              <span className="text-[28px] sm:text-[32px] font-bold tracking-tight text-blue-600 dark:text-blue-400 leading-none">
                {value}
              </span>
              <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-20">
        <div className="text-center mb-10">
          <h3 className="text-[26px] sm:text-[34px] font-bold tracking-tight text-gray-900 dark:text-white">
            Everything you need on campus
          </h3>
          <p className="text-[14px] sm:text-base text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            One app for the map, lunch, transport, and more.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {features.map(({ icon: Icon, color, title, body }) => {
            const c = colorMap[color];
            return (
              <div
                key={title}
                className={cn(
                  "rounded-2xl ring-1 p-5 flex flex-col gap-3 transition-all duration-200",
                  darkMode
                    ? "bg-gray-900 ring-gray-800 hover:ring-gray-700"
                    : "bg-white ring-gray-200/70 shadow-sm hover:shadow-md hover:ring-gray-300/60"
                )}
              >
                <div className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center ring-1 shrink-0",
                  c.bg, c.ring,
                )}>
                  <Icon className={cn("h-4.5 w-4.5", c.icon)} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight mb-1">
                    {title}
                  </h4>
                  <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                    {body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className={cn(
        "w-full py-16 sm:py-20 border-t",
        darkMode ? "border-gray-800 bg-gray-900/50" : "border-gray-100 bg-white"
      )}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="text-[26px] sm:text-[34px] font-bold tracking-tight text-gray-900 dark:text-white">
              Up and running in seconds
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {steps.map(({ step, title, body }) => (
              <div key={step} className="flex flex-col gap-3">
                <div className="text-[11px] font-bold tracking-[0.18em] text-blue-600 dark:text-blue-400">
                  {step}
                </div>
                <h4 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight">
                  {title}
                </h4>
                <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <Button
              size="lg"
              onClick={handleLogin}
              className="h-12 px-7 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-[0.98] transition-all"
            >
              Get started
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={cn(
        "mt-auto border-t py-8 sm:py-10",
        darkMode ? "border-gray-800 bg-gray-950" : "border-gray-200 bg-gray-50"
      )}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <KSYKLogo size="sm" />
              <div>
                <p className="text-[13px] font-bold text-gray-900 dark:text-white">KSYK Maps</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500">
                  Campus navigation for Kulosaaren yhteiskoulu
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Footer links">
              {[
                { label: "Support", href: "/support" },
                { label: "Admin", href: "/admin" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-[12px] text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-gray-400 dark:text-gray-600">
              © {new Date().getFullYear()} KSYK Maps. Built for Kulosaaren yhteiskoulu.
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-600">
              For students and staff only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
