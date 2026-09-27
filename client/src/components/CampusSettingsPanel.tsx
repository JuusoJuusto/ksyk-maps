import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sun,
  Moon,
  Monitor,
  ExternalLink,
  Palette,
  Map,
  Accessibility,
  Info,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  Sparkles,
  ScrollText,
  Smartphone,
  Globe,
  School,
  Code2,
  Plus,
  Trash2,
  MapPin,
  Pencil,
} from "lucide-react";
import CampusChangelog from "@/components/CampusChangelog";
import KSYKLogo from "@/components/KSYKLogo";
import MapSettingsPanel from "@/components/MapSettingsPanel";
import { KSYK_GITHUB_CHANGELOG } from "@/lib/branding";
import { APP_VERSION, ANDROID_APP_VERSION } from "@/lib/changelog";
import { cn } from "@/lib/utils";
import { useMaps, type CampusMap } from "@/hooks/useMaps";

type SettingsTab =
  | "appearance"
  | "map"
  | "accessibility"
  | "changelog"
  | "about";

const TABS: { id: SettingsTab; icon: typeof Palette; labelEn: string; labelFi: string }[] = [
  { id: "appearance", icon: Palette, labelEn: "Appearance", labelFi: "Ulkoasu" },
  { id: "map", icon: Map, labelEn: "Map", labelFi: "Kartta" },
  { id: "accessibility", icon: Accessibility, labelEn: "Accessibility", labelFi: "Saavutettavuus" },
  { id: "changelog", icon: ScrollText, labelEn: "Changelog", labelFi: "Muutosloki" },
  { id: "about", icon: Info, labelEn: "About", labelFi: "Tietoja" },
];

type CampusSettingsPanelProps = {
  onBack?: () => void;
};

export default function CampusSettingsPanel({ onBack }: CampusSettingsPanelProps) {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { darkMode } = useDarkMode();
  const { settings, update, reset } = useAppSettings();
  const [tab, setTab] = useState<SettingsTab>("appearance");
  const [currentLang, setCurrentLang] = useState(
    () => localStorage.getItem("ksyk_language") || i18n.language
  );
  const britishUnlocked = localStorage.getItem("ksyk_british_unlocked") === "true";
  const isFi = currentLang === "fi";

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem("ksyk_language", lang);
    setCurrentLang(lang);
    i18n.changeLanguage(lang).then(() => window.location.reload());
  };

  const SettingRow = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3.5 px-4">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-semibold">{label}</Label>
        {description && (
          <p className={cn("text-xs mt-0.5 leading-relaxed", darkMode ? "text-gray-400" : "text-gray-500")}>
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  return (
    <div
      className={cn(
        "min-h-full pb-[max(6rem,calc(4rem+env(safe-area-inset-bottom)))] animate-in fade-in duration-300",
        darkMode ? "bg-gray-950" : "bg-gray-50",
      )}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
        {/* Editorial header — bold black type, no gradient text.
         *  Sticky so back button + wordmark stay reachable while
         *  the panel body scrolls. */}
        <div
          className={cn(
            "sticky top-0 -mx-3 sm:-mx-4 px-4 sm:px-6 py-3 sm:py-5 mb-4 sm:mb-6 z-20 backdrop-blur-xl border-b",
            darkMode ? "bg-gray-950/85 border-gray-800/70" : "bg-white/85 border-gray-200/70",
          )}
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
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
            )}
            <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
              {/* Editorial label */}
              <span className={cn(
                "text-[10px] font-bold tracking-[0.18em] uppercase hidden sm:inline shrink-0 pt-2",
                darkMode ? "text-gray-500" : "text-gray-400",
              )}>
                KSYK Maps
              </span>
              <span className={cn(
                "hidden sm:inline w-px h-4 self-center shrink-0",
                darkMode ? "bg-gray-800" : "bg-gray-300",
              )} />
              <h1 className={cn(
                "text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] leading-none truncate",
                darkMode ? "text-white" : "text-gray-900",
              )}>
                {isFi ? "Asetukset" : "Settings"}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:gap-6">
          {/* Tab bar — KSYK-blue active pill, sticky under header.
           *  On mobile: horizontal scrolling row.
           *  On desktop (lg+): vertical sidebar with big rows. */}
          <nav
            role="tablist"
            aria-label={isFi ? "Asetusten välilehdet" : "Settings tabs"}
            className={cn(
              "lg:w-64 shrink-0 flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto pb-0.5 lg:pb-0",
              "sticky top-[3.75rem] sm:top-[5.75rem] lg:top-28 z-10 lg:self-start",
              "scrollbar-none -mx-3 sm:-mx-1 px-3 sm:px-1 p-1.5 rounded-none lg:rounded-2xl backdrop-blur-xl",
              darkMode ? "bg-gray-950/85 lg:bg-gray-900/60 lg:ring-1 lg:ring-gray-800/70" : "bg-gray-50/85 lg:bg-white lg:ring-1 lg:ring-gray-200/70 lg:shadow-sm",
            )}
          >
            {TABS.map(({ id, icon: Icon, labelEn, labelFi }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-controls={`tabpanel-${id}`}
                aria-selected={tab === id}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2.5 lg:py-3 rounded-xl text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 active:scale-[0.97] min-h-10",
                  tab === id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : darkMode
                    ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800/60"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                <span>{isFi ? labelFi : labelEn}</span>
              </button>
            ))}
          </nav>

          {/* Content — each tab panel is its own aria-labelled region so
           *  screen readers pair the right panel with the active tab. */}
          <div
            className="flex-1 min-w-0 space-y-4"
            role="tabpanel"
            id={`tabpanel-${tab}`}
            aria-labelledby={`tab-${tab}`}
          >
            {tab === "appearance" && (
              <div className="space-y-4">
                {/* Theme card — big, tap-friendly cards with icons */}
                <Card className={cn(
                  "border-0 shadow-lg rounded-2xl overflow-hidden",
                  darkMode ? "bg-gray-800/80" : "bg-white/95",
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <span className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        darkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-50 text-blue-600",
                      )}>
                        <Sparkles className="h-4 w-4" />
                      </span>
                      {isFi ? "Teema" : "Theme"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isFi ? "Vaalea, tumma tai järjestelmän mukaan" : "Light, dark, or follow system"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {[
                        { id: "light" as const, icon: Sun, label: isFi ? "Vaalea" : "Light" },
                        { id: "dark" as const, icon: Moon, label: isFi ? "Tumma" : "Dark" },
                        { id: "system" as const, icon: Monitor, label: isFi ? "Auto" : "Auto" },
                      ].map(({ id, icon: Icon, label }) => {
                        const selected = theme === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setTheme(id)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-[0.97]",
                              selected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-sm text-blue-700 dark:text-blue-300"
                                : darkMode
                                ? "border-gray-700 hover:border-gray-600 text-gray-300"
                                : "border-gray-200 hover:border-gray-300 text-gray-700",
                            )}
                            aria-pressed={selected}
                          >
                            <Icon className={cn(
                              "h-5 w-5 sm:h-6 sm:w-6",
                              selected && "text-blue-600 dark:text-blue-400",
                            )} />
                            <span className="text-xs sm:text-sm font-semibold">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Language card — pills laid out horizontally */}
                <Card className={cn(
                  "border-0 shadow-lg rounded-2xl overflow-hidden",
                  darkMode ? "bg-gray-800/80" : "bg-white/95",
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">
                      {isFi ? "Kieli" : "Language"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isFi ? "Sovelluksen käyttökieli" : "App display language"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: "en", label: "English", flag: "🇬🇧" },
                        { id: "fi", label: "Suomi", flag: "🇫🇮" },
                        ...(britishUnlocked ? [{ id: "en-GB", label: "British", flag: "🇬🇧" }] : []),
                      ].map((lang) => {
                        const selected = currentLang === lang.id;
                        return (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => handleLanguageChange(lang.id)}
                            className={cn(
                              "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all active:scale-[0.97]",
                              selected
                                ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                                : darkMode
                                ? "border-gray-700 hover:border-gray-600 text-gray-300"
                                : "border-gray-200 hover:border-gray-300 text-gray-700",
                            )}
                            aria-pressed={selected}
                          >
                            <span className="text-base">{lang.flag}</span>
                            <span className="text-sm font-semibold">{lang.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "map" && (
              <div className="space-y-4">
                <MapSettingsPanel />
                <MapsManagerPanel isFi={isFi} />
              </div>
            )}

            {tab === "accessibility" && (
              <Card className={cn(
                "border-0 shadow-lg rounded-2xl overflow-hidden",
                darkMode ? "bg-gray-800/80" : "bg-white/95",
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <span className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      darkMode ? "bg-purple-950/60 text-purple-300" : "bg-purple-50 text-purple-600",
                    )}>
                      <Accessibility className="h-4 w-4" />
                    </span>
                    {isFi ? "Saavutettavuus" : "Accessibility"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isFi ? "Tee sovelluksesta helppolukuisempi" : "Make the app easier to read"}
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn("p-0 divide-y", darkMode ? "divide-gray-700/60" : "divide-gray-100")}>
                  <SettingRow
                    label={isFi ? "Korkea kontrasti" : "High contrast map"}
                    description={isFi ? "Kirkkaammat värit ja terävämmät ääriviivat" : "Brighter colors and sharper edges"}
                  >
                    <Switch checked={settings.highContrast} onCheckedChange={(v) => update("highContrast", v)} />
                  </SettingRow>
                  <SettingRow
                    label={isFi ? "Suurempi teksti" : "Larger UI text"}
                    description={isFi ? "Kasvattaa käyttöliittymän tekstin kokoa" : "Bumps up interface text size"}
                  >
                    <Switch checked={settings.largeText} onCheckedChange={(v) => update("largeText", v)} />
                  </SettingRow>
                </CardContent>
              </Card>
            )}

            {tab === "changelog" && (
              <Card className={cn(
                "border-0 shadow-lg rounded-2xl overflow-hidden",
                darkMode ? "bg-gray-800/80" : "bg-white/95",
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <span className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      darkMode ? "bg-emerald-950/60 text-emerald-300" : "bg-emerald-50 text-emerald-600",
                    )}>
                      <ScrollText className="h-4 w-4" />
                    </span>
                    {isFi ? "Versiohistoria" : "Version history"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isFi
                      ? "Sovelluksen päivitykset — myös GitHubissa"
                      : "App updates — also on GitHub"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CampusChangelog isFi={isFi} />
                </CardContent>
              </Card>
            )}

            {tab === "about" && (
              <div className="space-y-4">
                {/* Identity card */}
                <Card className={cn(
                  "border-0 shadow-lg rounded-2xl overflow-hidden",
                  darkMode ? "bg-gray-800/80" : "bg-white/95",
                )}>
                  <CardContent className="pt-6 pb-5">
                    <div className="flex flex-col items-center text-center gap-3">
                      <KSYKLogo size="xl" className="drop-shadow-lg" />
                      <div>
                        <h2 className={cn("text-2xl font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                          KSYK Maps
                        </h2>
                        <p className={cn("text-sm mt-1", darkMode ? "text-gray-400" : "text-gray-500")}>
                          {isFi ? "Kampuskartta ja navigointi" : "Campus map & navigation"}
                        </p>
                      </div>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                        darkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-50 text-blue-700"
                      )}>
                        v{APP_VERSION}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* App info rows */}
                <Card className={cn(
                  "border-0 shadow-lg rounded-2xl overflow-hidden",
                  darkMode ? "bg-gray-800/80" : "bg-white/95",
                )}>
                  <CardContent className={cn("p-0 divide-y", darkMode ? "divide-gray-700/60" : "divide-gray-100")}>
                    {[
                      {
                        icon: Globe,
                        iconBg: "bg-blue-500",
                        label: isFi ? "Verkkoversio" : "Web version",
                        value: `v${APP_VERSION}`,
                      },
                      {
                        icon: Smartphone,
                        iconBg: "bg-green-500",
                        label: isFi ? "Android-versio" : "Android version",
                        value: `v${ANDROID_APP_VERSION}`,
                      },
                      {
                        icon: School,
                        iconBg: "bg-orange-500",
                        label: isFi ? "Koulu" : "School",
                        value: "Kulosaaren yhteiskoulu",
                      },
                    ].map(({ icon: Icon, iconBg, label, value }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                        <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white", iconBg)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={cn("flex-1 text-sm font-semibold", darkMode ? "text-gray-100" : "text-gray-900")}>
                          {label}
                        </span>
                        <span className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-500")}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Description */}
                <Card className={cn(
                  "border-0 shadow-lg rounded-2xl overflow-hidden",
                  darkMode ? "bg-gray-800/80" : "bg-white/95",
                )}>
                  <CardContent className="p-4">
                    <p className={cn("text-sm leading-relaxed", darkMode ? "text-gray-300" : "text-gray-600")}>
                      {isFi
                        ? "KSYK Maps on interaktiivinen karttasovellus Kulosaaren yhteiskoululle. Sovellus tarjoaa reaaliaikaisen pohjapiirroksen, huonehaun, lukujärjestysnäkymän sekä opastuksen koulun siipien A, U, K, M, R ja B välillä."
                        : "KSYK Maps is an interactive campus navigation app for Kulosaaren yhteiskoulu. It provides a real-time floor plan, room search, timetable view, and navigation between wings A, U, K, M, R, and B."}
                    </p>
                  </CardContent>
                </Card>

                {/* Links */}
                <Card className={cn(
                  "border-0 shadow-lg rounded-2xl overflow-hidden",
                  darkMode ? "bg-gray-800/80" : "bg-white/95",
                )}>
                  <CardContent className={cn("p-0 divide-y", darkMode ? "divide-gray-700/60" : "divide-gray-100")}>
                    <button
                      type="button"
                      onClick={() => window.location.href = "/support"}
                      className={cn("w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:scale-[0.98]",
                        darkMode ? "hover:bg-gray-700/30" : "hover:bg-black/[0.03]"
                      )}
                    >
                      <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-purple-500 text-white">
                        <LifeBuoy className="h-4 w-4" />
                      </span>
                      <span className={cn("flex-1 text-sm font-semibold", darkMode ? "text-gray-100" : "text-gray-900")}>
                        {isFi ? "Tuki ja palaute" : "Support & feedback"}
                      </span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0", darkMode ? "text-gray-500" : "text-gray-400")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("changelog")}
                      className={cn("w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:scale-[0.98]",
                        darkMode ? "hover:bg-gray-700/30" : "hover:bg-black/[0.03]"
                      )}
                    >
                      <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500 text-white">
                        <ScrollText className="h-4 w-4" />
                      </span>
                      <span className={cn("flex-1 text-sm font-semibold", darkMode ? "text-gray-100" : "text-gray-900")}>
                        {isFi ? "Versiohistoria" : "Version history"}
                      </span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0", darkMode ? "text-gray-500" : "text-gray-400")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(KSYK_GITHUB_CHANGELOG, "_blank")}
                      className={cn("w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:scale-[0.98]",
                        darkMode ? "hover:bg-gray-700/30" : "hover:bg-black/[0.03]"
                      )}
                    >
                      <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-800 text-white")}>
                        <ExternalLink className="h-4 w-4" />
                      </span>
                      <span className={cn("flex-1 text-sm font-semibold", darkMode ? "text-gray-100" : "text-gray-900")}>
                        {isFi ? "Lähdekoodi GitHubissa" : "Source code on GitHub"}
                      </span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0", darkMode ? "text-gray-500" : "text-gray-400")} />
                    </button>
                  </CardContent>
                </Card>

                {/* Credits */}
                <Card className={cn(
                  "border-0 shadow-lg rounded-2xl overflow-hidden",
                  darkMode ? "bg-gray-800/80" : "bg-white/95",
                )}>
                  <CardContent className={cn("p-0 divide-y", darkMode ? "divide-gray-700/60" : "divide-gray-100")}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-indigo-500 text-white">
                        <Code2 className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold", darkMode ? "text-gray-100" : "text-gray-900")}>
                          {isFi ? "Kartta" : "Map engine"}
                        </p>
                        <p className={cn("text-xs mt-0.5", darkMode ? "text-gray-500" : "text-gray-400")}>
                          MapLibre GL · OpenStreetMap
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-sky-500 text-white">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold", darkMode ? "text-gray-100" : "text-gray-900")}>
                          {isFi ? "Käyttöliittymä" : "Interface"}
                        </p>
                        <p className={cn("text-xs mt-0.5", darkMode ? "text-gray-500" : "text-gray-400")}>
                          React · Tailwind CSS · shadcn/ui
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-xs text-center text-muted-foreground pb-2">
                  © {new Date().getFullYear()} KSYK Maps
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Multi-map manager — appears in the "Map" settings tab ─────────────────

interface MapFormState {
  name: string;
  description: string;
  color: string;
  centerLat: string;
  centerLng: string;
  defaultZoom: string;
  bearing: string;
  pitch: string;
}

const EMPTY_FORM: MapFormState = {
  name: "", description: "", color: "#3b82f6",
  centerLat: "", centerLng: "", defaultZoom: "17",
  bearing: "0", pitch: "0",
};

function MapsManagerPanel({ isFi }: { isFi: boolean }) {
  const { darkMode } = useDarkMode();
  const { maps, loading, createMap, updateMap, deleteMap } = useMaps();
  const [editing, setEditing] = useState<CampusMap | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MapFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (k: keyof MapFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setCreating(true); setError(null); };
  const openEdit = (m: CampusMap) => {
    setForm({
      name: m.name, description: m.description ?? "", color: m.color ?? "#3b82f6",
      centerLat: String(m.centerLat), centerLng: String(m.centerLng),
      defaultZoom: String(m.defaultZoom), bearing: String(m.bearing ?? 0), pitch: String(m.pitch ?? 0),
    });
    setEditing(m);
    setCreating(false);
    setError(null);
  };
  const closeForm = () => { setCreating(false); setEditing(null); setError(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError(isFi ? "Nimi vaaditaan." : "Name is required."); return; }
    const lat = parseFloat(form.centerLat);
    const lng = parseFloat(form.centerLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError(isFi ? "Koordinaatit eivät kelpaa." : "Invalid coordinates.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        centerLat: lat,
        centerLng: lng,
        defaultZoom: parseFloat(form.defaultZoom) || 17,
        bearing: parseFloat(form.bearing) || 0,
        pitch: parseFloat(form.pitch) || 0,
      };
      if (editing) await updateMap(editing.id, payload);
      else await createMap(payload);
      closeForm();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isFi ? "Poistetaanko kartta?" : "Delete this map?")) return;
    try { await deleteMap(id); } catch { /* ignore */ }
  };

  const inputCls = cn(
    "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors",
    darkMode ? "bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-600" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400",
  );

  return (
    <Card className={cn("border-0 shadow-lg rounded-2xl overflow-hidden", darkMode ? "bg-gray-800/80" : "bg-white/95")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", darkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-50 text-blue-600")}>
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">{isFi ? "Karttanäkymät" : "Saved Maps"}</CardTitle>
              <CardDescription className="text-xs">{isFi ? "Lisää useita karttanäkymiä — käyttäjät voivat vaihtaa niiden välillä." : "Add multiple map views — users can switch between them."}</CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className={cn("shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors", darkMode ? "bg-blue-900/40 text-blue-300 hover:bg-blue-900/60" : "bg-blue-50 text-blue-700 hover:bg-blue-100")}
          >
            <Plus className="h-3.5 w-3.5" />
            {isFi ? "Lisää" : "Add"}
          </button>
        </div>
      </CardHeader>

      {(creating || editing) && (
        <CardContent className={cn("border-t px-4 py-4 space-y-3", darkMode ? "border-gray-700/60" : "border-gray-100")}>
          <p className={cn("text-xs font-semibold uppercase tracking-wider", darkMode ? "text-gray-500" : "text-gray-400")}>
            {editing ? (isFi ? "Muokkaa karttaa" : "Edit map") : (isFi ? "Uusi kartta" : "New map")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <input className={inputCls} placeholder={isFi ? "Nimi *" : "Name *"} value={form.name} onChange={field("name")} />
            </div>
            <div className="col-span-2">
              <input className={inputCls} placeholder={isFi ? "Kuvaus (vapaaehtoinen)" : "Description (optional)"} value={form.description} onChange={field("description")} />
            </div>
            <input className={inputCls} placeholder="Center lat *" value={form.centerLat} onChange={field("centerLat")} type="number" step="any" />
            <input className={inputCls} placeholder="Center lng *" value={form.centerLng} onChange={field("centerLng")} type="number" step="any" />
            <input className={inputCls} placeholder="Zoom" value={form.defaultZoom} onChange={field("defaultZoom")} type="number" min="0" max="24" step="0.1" />
            <div className="flex items-center gap-2">
              <input className={inputCls} type="color" value={form.color} onChange={field("color")} style={{ width: 40, height: 38, padding: 2, flex: "none" }} />
              <span className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-500")}>Color</span>
            </div>
            <input className={inputCls} placeholder={isFi ? "Suunta (°)" : "Bearing (°)"} value={form.bearing} onChange={field("bearing")} type="number" />
            <input className={inputCls} placeholder={isFi ? "Kaltevuus (°)" : "Pitch (°)"} value={form.pitch} onChange={field("pitch")} type="number" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? "…" : (isFi ? "Tallenna" : "Save")}
            </button>
            <button type="button" onClick={closeForm} className={cn("flex-1 h-9 rounded-xl text-sm font-semibold transition-colors border", darkMode ? "border-gray-700 text-gray-300 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
              {isFi ? "Peruuta" : "Cancel"}
            </button>
          </div>
        </CardContent>
      )}

      <CardContent className="p-0">
        {loading && (
          <div className={cn("px-4 py-4 text-sm", darkMode ? "text-gray-500" : "text-gray-400")}>
            {isFi ? "Ladataan…" : "Loading…"}
          </div>
        )}
        {!loading && maps.length === 0 && !creating && (
          <div className={cn("px-4 py-6 text-sm text-center", darkMode ? "text-gray-500" : "text-gray-400")}>
            {isFi ? "Ei tallennettuja karttoja. Lisää ensimmäinen yllä." : "No saved maps. Add the first one above."}
          </div>
        )}
        {maps.map((m, i) => (
          <div
            key={m.id}
            className={cn("flex items-center gap-3 px-4 py-3 transition-colors", i > 0 && (darkMode ? "border-t border-gray-700/60" : "border-t border-gray-100"))}
          >
            <span className="shrink-0 w-3 h-3 rounded-full" style={{ background: m.color ?? "#3b82f6" }} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold truncate", darkMode ? "text-gray-100" : "text-gray-900")}>{m.name}</p>
              {m.description && (
                <p className={cn("text-xs truncate mt-0.5", darkMode ? "text-gray-500" : "text-gray-400")}>{m.description}</p>
              )}
              <p className={cn("text-[10px] font-mono mt-0.5", darkMode ? "text-gray-600" : "text-gray-300")}>
                {m.centerLat.toFixed(5)}, {m.centerLng.toFixed(5)} · z{m.defaultZoom}
              </p>
            </div>
            <button type="button" onClick={() => openEdit(m)} className={cn("shrink-0 p-1.5 rounded-lg transition-colors", darkMode ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100")}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => handleDelete(m.id)} className={cn("shrink-0 p-1.5 rounded-lg transition-colors", darkMode ? "text-gray-500 hover:text-red-400 hover:bg-red-950/30" : "text-gray-400 hover:text-red-500 hover:bg-red-50")}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
