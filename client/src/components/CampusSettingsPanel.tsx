import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sun,
  Moon,
  Monitor,
  ExternalLink,
  Palette,
  Map,
  Box,
  Gauge,
  Accessibility,
  Code2,
  Info,
  ChevronLeft,
  Sparkles,
  ScrollText,
} from "lucide-react";
import CampusChangelog from "@/components/CampusChangelog";
import KSYKLogo from "@/components/KSYKLogo";
import { KSYK_GITHUB_CHANGELOG } from "@/lib/branding";
import { APP_VERSION } from "@/lib/changelog";
import { cn } from "@/lib/utils";

type SettingsTab =
  | "appearance"
  | "map"
  | "3d"
  | "performance"
  | "accessibility"
  | "changelog"
  | "developer"
  | "about";

const TABS: { id: SettingsTab; icon: typeof Palette; labelEn: string; labelFi: string }[] = [
  { id: "appearance", icon: Palette, labelEn: "Appearance", labelFi: "Ulkoasu" },
  { id: "map", icon: Map, labelEn: "Map", labelFi: "Kartta" },
  { id: "3d", icon: Box, labelEn: "3D", labelFi: "3D" },
  { id: "accessibility", icon: Accessibility, labelEn: "Accessibility", labelFi: "Saavutettavuus" },
  { id: "performance", icon: Gauge, labelEn: "Performance", labelFi: "Suorituskyky" },
  { id: "changelog", icon: ScrollText, labelEn: "Changelog", labelFi: "Muutosloki" },
  { id: "about", icon: Info, labelEn: "About", labelFi: "Tietoja" },
  { id: "developer", icon: Code2, labelEn: "Developer", labelFi: "Dev" },
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
        "min-h-full pb-24 animate-in fade-in duration-300",
        darkMode ? "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950" : "bg-gradient-to-b from-slate-50 via-white to-blue-50/30"
      )}
    >
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-xl shrink-0 hover:scale-105 transition-transform"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-4 min-w-0">
            <KSYKLogo size="xl" className="drop-shadow-lg" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {isFi ? "Asetukset" : "Settings"}
              </h1>
              <p className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                KSYK Maps · Nordbyte Studio
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <nav
            className={cn(
              "lg:w-56 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0",
              "sticky top-0 lg:top-4 z-10 lg:self-start",
              "scrollbar-none -mx-1 px-1 p-1.5 rounded-2xl backdrop-blur-xl",
              darkMode ? "bg-gray-800/60 lg:bg-gray-800/40" : "bg-white/70 lg:bg-white/50 shadow-sm"
            )}
          >
            {TABS.map(({ id, icon: Icon, labelEn, labelFi }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                  tab === id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : darkMode
                    ? "text-gray-300 hover:bg-gray-800"
                    : "text-gray-700 hover:bg-white hover:shadow-sm"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {isFi ? labelFi : labelEn}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {tab === "appearance" && (
              <Card className={cn("border-0 shadow-xl", darkMode ? "bg-gray-800/80" : "bg-white/90")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    {isFi ? "Ulkoasu ja kieli" : "Appearance & language"}
                  </CardTitle>
                  <CardDescription>
                    {isFi ? "Teema, kieli ja visuaalinen tyyli" : "Theme, language, and visual style"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="mb-3 block">{isFi ? "Kieli" : "Language"}</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "en", label: "English" },
                        { id: "fi", label: "Suomi" },
                        ...(britishUnlocked ? [{ id: "en-GB", label: "British English" }] : []),
                      ].map((lang) => (
                        <Button
                          key={lang.id}
                          variant={currentLang === lang.id ? "default" : "outline"}
                          onClick={() => handleLanguageChange(lang.id)}
                          className="rounded-xl transition-all hover:scale-[1.02]"
                        >
                          {lang.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="mb-3 block">{isFi ? "Teema" : "Theme"}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "light" as const, icon: Sun, label: "Light" },
                        { id: "dark" as const, icon: Moon, label: "Dark" },
                        { id: "system" as const, icon: Monitor, label: "System" },
                      ].map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setTheme(id)}
                          className={cn(
                            "p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
                            theme === id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-md"
                              : darkMode
                              ? "border-gray-700 hover:border-gray-600"
                              : "border-gray-200 hover:border-blue-300"
                          )}
                        >
                          <Icon className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                          <span className="text-sm font-semibold">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {tab === "map" && (
              <Card className={cn("border-0 shadow-xl", darkMode ? "bg-gray-800/80" : "bg-white/90")}>
                <CardHeader>
                  <CardTitle>{isFi ? "Kartta-asetukset" : "Map controls"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <SettingRow label={isFi ? "Ruudukko" : "Show grid"} description={isFi ? "Taustaruudukko kartalla" : "Background grid on map"}>
                    <Switch checked={settings.showGrid} onCheckedChange={(v) => update("showGrid", v)} />
                  </SettingRow>
                  <SettingRow label={isFi ? "Siipikirjaimet" : "Wing labels"} description={isFi ? "A, U, K, M, R, B" : "Building letter labels"}>
                    <Switch checked={settings.showWingLabels} onCheckedChange={(v) => update("showWingLabels", v)} />
                  </SettingRow>
                  <SettingRow label={isFi ? "Pehmeä panorointi" : "Smooth panning"}>
                    <Switch checked={settings.smoothPan} onCheckedChange={(v) => update("smoothPan", v)} />
                  </SettingRow>
                  <div className="py-4">
                    <Label className="mb-3 block">{isFi ? "Zoom-nopeus" : "Zoom speed"}</Label>
                    <Slider
                      value={[settings.mapZoomSpeed === 2 ? 2 : settings.mapZoomSpeed === 0.5 ? 0 : 1]}
                      min={0}
                      max={2}
                      step={1}
                      onValueChange={([v]) =>
                        update("mapZoomSpeed", v === 2 ? 2 : v === 0 ? 0.5 : 1)
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>{isFi ? "Hidas" : "Slow"}</span>
                      <span>{isFi ? "Normaali" : "Normal"}</span>
                      <span>{isFi ? "Nopea" : "Fast"}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground px-1">
                    {isFi
                      ? "Siivet: A, U, K, M, R, B — napauta kartalla rakennusta tai käytä hakua."
                      : "Wings: A, U, K, M, R, B — tap a building on the map or use search."}
                  </p>
                </CardContent>
              </Card>
            )}

            {tab === "3d" && (
              <Card className={cn("border-0 shadow-xl", darkMode ? "bg-gray-800/80" : "bg-white/90")}>
                <CardHeader>
                  <CardTitle>{isFi ? "3D-kartta" : "3D map settings"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-gray-900/50">
                    <Label className="mb-3 block">{isFi ? "Renderöintilaatu" : "Render quality"}</Label>
                    <div className="flex gap-2">
                      {(["low", "medium", "high"] as const).map((q) => (
                        <Button
                          key={q}
                          variant={settings.threeDQuality === q ? "default" : "outline"}
                          size="sm"
                          className="rounded-xl capitalize flex-1"
                          onClick={() => update("threeDQuality", q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <SettingRow label={isFi ? "Varjot" : "Shadows"}>
                    <Switch checked={settings.threeDShadows} onCheckedChange={(v) => update("threeDShadows", v)} />
                  </SettingRow>
                  <SettingRow label={isFi ? "Automaattinen pyörintä" : "Auto-rotate preview"}>
                    <Switch checked={settings.threeDAutoRotate} onCheckedChange={(v) => update("threeDAutoRotate", v)} />
                  </SettingRow>
                </CardContent>
              </Card>
            )}

            {tab === "performance" && (
              <Card className={cn("border-0 shadow-xl", darkMode ? "bg-gray-800/80" : "bg-white/90")}>
                <CardHeader>
                  <CardTitle>{isFi ? "Suorituskyky" : "Performance"}</CardTitle>
                  <CardDescription>
                    {isFi ? "Optimoi lataus ja animaatiot" : "Optimize loading and animations"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SettingRow
                    label={isFi ? "Vähennä animaatioita" : "Reduce motion"}
                    description={isFi ? "Poistaa turhat siirtymät" : "Minimizes transitions"}
                  >
                    <Switch checked={settings.reduceMotion} onCheckedChange={(v) => update("reduceMotion", v)} />
                  </SettingRow>
                  <Button variant="outline" className="mt-4 rounded-xl w-full" onClick={reset}>
                    {isFi ? "Palauta oletukset" : "Reset all settings"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {tab === "accessibility" && (
              <Card className={cn("border-0 shadow-xl", darkMode ? "bg-gray-800/80" : "bg-white/90")}>
                <CardHeader>
                  <CardTitle>{isFi ? "Saavutettavuus" : "Accessibility"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <SettingRow label={isFi ? "Korkea kontrasti" : "High contrast map"}>
                    <Switch checked={settings.highContrast} onCheckedChange={(v) => update("highContrast", v)} />
                  </SettingRow>
                  <SettingRow label={isFi ? "Suurempi teksti" : "Larger UI text"}>
                    <Switch checked={settings.largeText} onCheckedChange={(v) => update("largeText", v)} />
                  </SettingRow>
                </CardContent>
              </Card>
            )}

            {tab === "developer" && (
              <Card className={cn("border-0 shadow-xl", darkMode ? "bg-gray-800/80" : "bg-white/90")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isFi ? "Kehittäjäasetukset" : "Developer options"}
                    <Badge variant="secondary">Dev</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-gray-200 dark:divide-gray-700">
                  <SettingRow label="Debug overlay">
                    <Switch checked={settings.devShowDebug} onCheckedChange={(v) => update("devShowDebug", v)} />
                  </SettingRow>
                  <SettingRow label={isFi ? "Näytä koordinaatit" : "Show coordinates"}>
                    <Switch checked={settings.devShowCoords} onCheckedChange={(v) => update("devShowCoords", v)} />
                  </SettingRow>
                </CardContent>
              </Card>
            )}

            {tab === "changelog" && (
              <Card className={cn("border-0 shadow-xl", darkMode ? "bg-gray-800/90" : "bg-white")}>
                <CardHeader>
                  <CardTitle>{isFi ? "Versiohistoria" : "Version history"}</CardTitle>
                  <CardDescription>
                    {isFi
                      ? "Sovelluksen päivitykset — myös GitHubissa ja Firebase-tiedotteissa"
                      : "App updates — also on GitHub and in Firebase announcements"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CampusChangelog isFi={isFi} />
                </CardContent>
              </Card>
            )}

            {tab === "about" && (
              <Card className={cn("border-0 shadow-xl overflow-hidden", darkMode ? "bg-gray-800/90" : "bg-white")}>
                <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" />
                <CardHeader className="text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-4 mb-2">
                    <KSYKLogo size="xl" className="drop-shadow-lg" />
                    <div>
                      <CardTitle className="text-2xl">KSYK Maps</CardTitle>
                      <CardDescription className="text-base mt-1">
                        {isFi ? "Kampuskartta" : "Campus navigation"} · v{APP_VERSION}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className={cn("text-sm leading-relaxed text-center sm:text-left", darkMode ? "text-gray-300" : "text-gray-600")}>
                    {isFi
                      ? "Interaktiivinen karttasovellus Kulosaaren yhteiskoululle. Löydä siivet A, U, K, M, R ja B nopeasti 2D- tai 3D-näkymässä."
                      : "Interactive map for Kulosaaren yhteiskoulu. Find wings A, U, K, M, R, and B quickly in 2D or 3D."}
                  </p>

                  <div className="grid sm:grid-cols-3 gap-3 text-center text-sm">
                    {[
                      { label: isFi ? "Versio" : "Version", value: APP_VERSION },
                      { label: isFi ? "Kehittäjä" : "Built by", value: "Nordbyte Studio" },
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
                      className="w-full rounded-xl"
                      onClick={() => window.open("https://nordbyte-studio.vercel.app", "_blank")}
                    >
                      Nordbyte Studio
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
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
                    © {new Date().getFullYear()} Nordbyte Studio · KSYK Maps
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
