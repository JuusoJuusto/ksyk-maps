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
} from "lucide-react";
import CampusChangelog from "@/components/CampusChangelog";
import KSYKLogo from "@/components/KSYKLogo";
import MapSettingsPanel from "@/components/MapSettingsPanel";
import { KSYK_GITHUB_CHANGELOG } from "@/lib/branding";
import { APP_VERSION, ANDROID_APP_VERSION } from "@/lib/changelog";
import { cn } from "@/lib/utils";

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
  // Per-user opt-out for the "Get the app" popup. Missing key = default on.
  const [getAppEnabled, setGetAppEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("ksyk_get_app_enabled_v1") !== "0"; }
    catch { return true; }
  });
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
            "sticky top-0 -mx-3 sm:-mx-4 px-4 sm:px-6 py-3 mb-4 sm:mb-6 z-20 backdrop-blur-xl border-b",
            darkMode ? "bg-gray-950/85 border-gray-800/70" : "bg-white/85 border-gray-200/70",
          )}
          style={{ paddingTop: 'max(0.75rem, calc(0.5rem + env(safe-area-inset-top)))' }}
        >
          <div className="max-w-5xl mx-auto flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className={cn(
                  "shrink-0 h-10 w-10 -ml-2 rounded-full flex items-center justify-center active:scale-90 transition-colors",
                  darkMode
                    ? "text-gray-300 hover:text-white hover:bg-white/[0.06]"
                    : "text-gray-600 hover:text-gray-900 hover:bg-black/[0.05]",
                )}
                aria-label={isFi ? "Takaisin" : "Back"}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
              </button>
            )}
            <h1 className={cn(
              "text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] leading-none truncate",
              darkMode ? "text-white" : "text-gray-900",
            )}>
              {isFi ? "Asetukset" : "Settings"}
            </h1>
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
                  "flex items-center gap-2.5 px-3.5 py-2.5 lg:py-3 rounded-xl text-[13px] sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0 active:scale-[0.97] min-h-10",
                  tab === id
                    ? "bg-blue-600 text-white"
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
                  "rounded-2xl overflow-hidden shadow-none border",
                  darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[15px] font-semibold">
                      {isFi ? "Teema" : "Theme"}
                    </CardTitle>
                    <CardDescription className="text-[13px]">
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
                              "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border transition-colors active:scale-[0.97]",
                              selected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                : darkMode
                                ? "border-gray-800 hover:border-gray-700 text-gray-300"
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
                  "rounded-2xl overflow-hidden shadow-none border",
                  darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[15px] font-semibold">
                      {isFi ? "Kieli" : "Language"}
                    </CardTitle>
                    <CardDescription className="text-[13px]">
                      {isFi ? "Sovelluksen käyttökieli" : "App display language"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: "en", label: "English", abbr: "EN" },
                        { id: "fi", label: "Suomi", abbr: "FI" },
                        ...(britishUnlocked ? [{ id: "en-GB", label: "British English", abbr: "EN-GB" }] : []),
                      ].map((lang) => {
                        const selected = currentLang === lang.id;
                        return (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => handleLanguageChange(lang.id)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border transition-colors active:scale-[0.97]",
                              selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : darkMode
                                ? "border-gray-800 hover:border-gray-700 text-gray-300"
                                : "border-gray-200 hover:border-gray-300 text-gray-700",
                            )}
                            aria-pressed={selected}
                          >
                            <span className={cn(
                              "text-[11px] font-bold tracking-widest uppercase",
                              selected
                                ? "text-blue-200"
                                : darkMode ? "text-gray-500" : "text-gray-400",
                            )}>{lang.abbr}</span>
                            <span className="text-sm font-semibold leading-tight">{lang.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "map" && <MapSettingsPanel />}

            {tab === "accessibility" && (
              <Card className={cn(
                "rounded-2xl overflow-hidden shadow-none border",
                darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px] font-semibold">
                    {isFi ? "Saavutettavuus" : "Accessibility"}
                  </CardTitle>
                  <CardDescription className="text-[13px]">
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

            {tab === "appearance" && (
              <Card className={cn(
                "rounded-2xl overflow-hidden shadow-none border mt-4",
                darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px] font-semibold">
                    {isFi ? "Ilmoitukset" : "Notifications"}
                  </CardTitle>
                  <CardDescription className="text-[13px]">
                    {isFi ? "Ohjaa mitä sovellus näyttää sinulle" : "Control what the app shows you"}
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn("p-0 divide-y", darkMode ? "divide-gray-800" : "divide-gray-100")}>
                  <SettingRow
                    label={isFi ? '"Lataa sovellus" -popup' : '"Get the app" popup'}
                    description={isFi ? "Näytä muistutus ladata Android-sovellus" : "Show the reminder to install the Android app"}
                  >
                    <Switch
                      checked={getAppEnabled}
                      onCheckedChange={(v) => {
                        try { localStorage.setItem("ksyk_get_app_enabled_v1", v ? "1" : "0"); } catch { /* ignore */ }
                        setGetAppEnabled(v);
                      }}
                    />
                  </SettingRow>
                </CardContent>
              </Card>
            )}

            {tab === "changelog" && (
              <Card className={cn(
                "rounded-2xl overflow-hidden shadow-none border",
                darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px] font-semibold">
                    {isFi ? "Versiohistoria" : "Version history"}
                  </CardTitle>
                  <CardDescription className="text-[13px]">
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
                  "rounded-2xl overflow-hidden shadow-none border",
                  darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
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
                  "rounded-2xl overflow-hidden shadow-none border",
                  darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
                )}>
                  <CardContent className={cn("p-0 divide-y", darkMode ? "divide-gray-800" : "divide-gray-100")}>
                    {[
                      { icon: Globe,      label: isFi ? "Verkkoversio" : "Web version",    value: `v${APP_VERSION}` },
                      { icon: Smartphone, label: isFi ? "Android-versio" : "Android version", value: `v${ANDROID_APP_VERSION}` },
                      { icon: School,     label: isFi ? "Koulu" : "School",                value: "Kulosaaren yhteiskoulu" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3.5 px-4 py-3.5">
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", darkMode ? "text-gray-500" : "text-gray-400")} strokeWidth={1.75} />
                        <span className={cn("flex-1 text-[14px] font-medium", darkMode ? "text-gray-100" : "text-gray-900")}>
                          {label}
                        </span>
                        <span className={cn("text-[14px] tabular-nums", darkMode ? "text-gray-400" : "text-gray-500")}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Description */}
                <Card className={cn(
                  "rounded-2xl overflow-hidden shadow-none border",
                  darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
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
                  "rounded-2xl overflow-hidden shadow-none border",
                  darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
                )}>
                  <CardContent className={cn("p-0 divide-y", darkMode ? "divide-gray-800" : "divide-gray-100")}>
                    {[
                      { icon: LifeBuoy,     label: isFi ? "Tuki ja palaute" : "Support & feedback",   onClick: () => window.location.href = "/support" },
                      { icon: ScrollText,   label: isFi ? "Versiohistoria" : "Version history",       onClick: () => setTab("changelog") },
                      { icon: ExternalLink, label: isFi ? "Lähdekoodi GitHubissa" : "Source on GitHub", onClick: () => window.open(KSYK_GITHUB_CHANGELOG, "_blank") },
                    ].map(({ icon: Icon, label, onClick }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={onClick}
                        className={cn(
                          "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:scale-[0.99]",
                          darkMode ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]",
                        )}
                      >
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", darkMode ? "text-gray-500" : "text-gray-400")} strokeWidth={1.75} />
                        <span className={cn("flex-1 text-[14px] font-medium", darkMode ? "text-gray-100" : "text-gray-900")}>
                          {label}
                        </span>
                        <ChevronRight className={cn("h-4 w-4 shrink-0", darkMode ? "text-gray-600" : "text-gray-300")} />
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Credits */}
                <Card className={cn(
                  "rounded-2xl overflow-hidden shadow-none border",
                  darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
                )}>
                  <CardContent className={cn("p-0 divide-y", darkMode ? "divide-gray-800" : "divide-gray-100")}>
                    {[
                      { icon: Code2,    title: isFi ? "Kartta" : "Map engine",   sub: "MapLibre GL · OpenStreetMap" },
                      { icon: Sparkles, title: isFi ? "Käyttöliittymä" : "Interface", sub: "React · Tailwind CSS · shadcn/ui" },
                    ].map(({ icon: Icon, title, sub }) => (
                      <div key={title} className="flex items-center gap-3.5 px-4 py-3.5">
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", darkMode ? "text-gray-500" : "text-gray-400")} strokeWidth={1.75} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-[14px] font-medium", darkMode ? "text-gray-100" : "text-gray-900")}>
                            {title}
                          </p>
                          <p className={cn("text-[12px] mt-0.5", darkMode ? "text-gray-500" : "text-gray-400")}>
                            {sub}
                          </p>
                        </div>
                      </div>
                    ))}
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


