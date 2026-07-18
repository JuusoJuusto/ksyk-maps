import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Sparkles,
  ScrollText,
} from "lucide-react";
import CampusChangelog from "@/components/CampusChangelog";
import KSYKLogo from "@/components/KSYKLogo";
import MapSettingsPanel from "@/components/MapSettingsPanel";
import { KSYK_GITHUB_CHANGELOG } from "@/lib/branding";
import { APP_VERSION } from "@/lib/changelog";
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
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3.5 px-4 rounded-2xl transition-colors",
        darkMode ? "bg-gray-800/50 hover:bg-gray-800/70" : "bg-slate-50/90 hover:bg-white"
      )}
    >
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

            {tab === "map" && <MapSettingsPanel />}

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
                <CardContent className="space-y-2 pt-0">
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
              <Card className={cn(
                "border-0 shadow-lg rounded-2xl overflow-hidden",
                darkMode ? "bg-gray-800/80" : "bg-white/95",
              )}>
                <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" />
                <CardHeader className="text-center sm:text-left pb-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-1">
                    <KSYKLogo size="lg" className="drop-shadow-md" />
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">KSYK Maps</CardTitle>
                      <CardDescription className="text-sm sm:text-base mt-0.5">
                        {isFi ? "Kampuskartta" : "Campus navigation"} · v{APP_VERSION}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className={cn("text-sm leading-relaxed text-center sm:text-left", darkMode ? "text-gray-300" : "text-gray-600")}>
                    {isFi
                      ? "Interaktiivinen karttasovellus Kulosaaren yhteiskoululle. Löydä rakennukset A, U, K, M, R ja B – huonehaku, lukujärjestykset ja opasteet."
                      : "Interactive campus map for Kulosaaren yhteiskoulu. Find wings A, U, K, M, R, and B — with room search, timetables, and navigation."}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 text-center text-sm">
                    {[
                      { label: isFi ? "Versio" : "Version", value: APP_VERSION },
                      { label: isFi ? "Koulu" : "School", value: "KSYK" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={cn("p-3 rounded-xl border", darkMode ? "border-gray-700 bg-gray-900/50" : "border-gray-100 bg-slate-50")}
                      >
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-bold mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <CampusChangelog isFi={isFi} compact />

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => window.open(KSYK_GITHUB_CHANGELOG, "_blank")}
                    >
                      {isFi ? "Muutosloki GitHubissa" : "Changelog on GitHub"}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground pt-2">
                    © {new Date().getFullYear()} KSYK Maps
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
