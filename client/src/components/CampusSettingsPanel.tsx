/**
 * KSYK Maps — settings panel.  v4.7.44 full rewrite.
 *
 * Wilma-style settings surface: document masthead + hairline-divided
 * section stacks + row-based controls.  No card-in-card, no colored
 * icon pills, no drop shadow.
 *
 * Tab bar on desktop is a compact left rail; on mobile it becomes a
 * horizontal scrolling strip with Wilma-navy active pill.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Switch } from "@/components/ui/switch";
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
  { id: "appearance",    icon: Palette,       labelEn: "Appearance",    labelFi: "Ulkoasu" },
  { id: "map",           icon: Map,           labelEn: "Map",           labelFi: "Kartta" },
  { id: "accessibility", icon: Accessibility, labelEn: "Accessibility", labelFi: "Saavutettavuus" },
  { id: "changelog",     icon: ScrollText,    labelEn: "Changelog",     labelFi: "Muutosloki" },
  { id: "about",         icon: Info,          labelEn: "About",         labelFi: "Tietoja" },
];

type CampusSettingsPanelProps = {
  onBack?: () => void;
};

export default function CampusSettingsPanel({ onBack }: CampusSettingsPanelProps) {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { darkMode } = useDarkMode();
  const { settings, update } = useAppSettings();
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

  const activeTabMeta = TABS.find((t) => t.id === tab)!;

  return (
    <div
      className={cn(
        "min-h-full pb-[max(6rem,calc(4rem+env(safe-area-inset-bottom)))]",
        darkMode ? "bg-gray-950" : "bg-gray-50",
      )}
    >
      {/* ── Document header — same shell as FAQ / Privacy / Support ─ */}
      <div
        className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-[#d5dae0] dark:border-[#2a3040]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0.5rem))" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 h-9 w-9 -ml-2 rounded-[6px] flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              aria-label={isFi ? "Takaisin" : "Back"}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9] leading-none">
              {isFi ? "Sovellus" : "App"}
            </p>
            <h1 className="text-[16px] sm:text-[17px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight mt-1">
              {isFi ? "Asetukset" : "Settings"}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* ── Tab bar ─────────────────────────────────────────────
           *   Mobile: horizontal scrolling strip, sticky under the header.
           *   Desktop (lg+): compact vertical rail on the left. */}
          <nav
            role="tablist"
            aria-label={isFi ? "Asetusten välilehdet" : "Settings tabs"}
            className={cn(
              "lg:w-56 shrink-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-0.5 lg:pb-0",
              "lg:sticky lg:top-16 lg:self-start scrollbar-none",
              "-mx-3 sm:-mx-0 px-3 sm:px-0",
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
                  "flex items-center gap-2 h-9 lg:h-10 px-3 rounded-[6px] text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors",
                  tab === id
                    ? "bg-[#003d82] text-white"
                    : darkMode
                      ? "text-gray-400 hover:text-white hover:bg-gray-900"
                      : "text-gray-700 hover:text-[#003d82] hover:bg-gray-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>{isFi ? labelFi : labelEn}</span>
              </button>
            ))}
          </nav>

          {/* ── Content panel ─────────────────────────────────────── */}
          <div
            className="flex-1 min-w-0"
            role="tabpanel"
            id={`tabpanel-${tab}`}
            aria-labelledby={`tab-${tab}`}
          >
            {/* Panel masthead — shows which section is active */}
            <div className="hidden lg:block mb-6 pb-3 border-b border-[#d5dae0] dark:border-[#2a3040]">
              <div className="flex items-center gap-2">
                <activeTabMeta.icon className="h-4 w-4 text-[#003d82] dark:text-[#4a90d9]" strokeWidth={2} />
                <h2 className="text-[16px] font-bold tracking-tight text-gray-900 dark:text-white">
                  {isFi ? activeTabMeta.labelFi : activeTabMeta.labelEn}
                </h2>
              </div>
            </div>

            {tab === "appearance" && (
              <div className="space-y-6">
                {/* Theme picker */}
                <Section
                  label={isFi ? "Teema" : "Theme"}
                  description={isFi ? "Vaalea, tumma tai järjestelmän mukaan" : "Light, dark, or system"}
                >
                  <div className="grid grid-cols-3 border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] overflow-hidden">
                    {[
                      { id: "light" as const, icon: Sun,     label: isFi ? "Vaalea" : "Light" },
                      { id: "dark" as const,  icon: Moon,    label: isFi ? "Tumma" : "Dark" },
                      { id: "system" as const, icon: Monitor, label: isFi ? "Auto" : "System" },
                    ].map(({ id, icon: Icon, label }, idx) => {
                      const selected = theme === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setTheme(id)}
                          aria-pressed={selected}
                          className={cn(
                            "h-11 inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors",
                            idx > 0 && "border-l border-[#d5dae0] dark:border-[#2a3040]",
                            selected
                              ? "bg-[#003d82] text-white"
                              : darkMode
                                ? "bg-gray-950 text-gray-300 hover:bg-gray-900"
                                : "bg-white text-gray-700 hover:bg-gray-50",
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.25} />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                {/* Language picker */}
                <Section
                  label={isFi ? "Kieli" : "Language"}
                  description={isFi ? "Sovelluksen käyttökieli" : "App display language"}
                >
                  <div className="flex border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] overflow-hidden">
                    {[
                      { id: "fi", label: "Suomi",   abbr: "FI" },
                      { id: "en", label: "English", abbr: "EN" },
                      ...(britishUnlocked ? [{ id: "en-GB", label: "British", abbr: "EN-GB" }] : []),
                    ].map((lang, idx) => {
                      const selected = currentLang === lang.id;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => handleLanguageChange(lang.id)}
                          aria-pressed={selected}
                          className={cn(
                            "flex-1 h-11 inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors",
                            idx > 0 && "border-l border-[#d5dae0] dark:border-[#2a3040]",
                            selected
                              ? "bg-[#003d82] text-white"
                              : darkMode
                                ? "bg-gray-950 text-gray-300 hover:bg-gray-900"
                                : "bg-white text-gray-700 hover:bg-gray-50",
                          )}
                        >
                          <span className={cn(
                            "text-[10px] font-bold tracking-widest",
                            selected ? "text-white/80" : darkMode ? "text-gray-500" : "text-gray-400",
                          )}>{lang.abbr}</span>
                          <span>{lang.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </Section>

              </div>
            )}

            {tab === "map" && (
              <Section label={isFi ? "Karttavalinnat" : "Map preferences"}>
                <MapSettingsPanel />
              </Section>
            )}

            {tab === "accessibility" && (
              <Section
                label={isFi ? "Saavutettavuus" : "Accessibility"}
                description={isFi ? "Tee sovelluksesta helppolukuisempi" : "Make the app easier to read"}
              >
                <RowList>
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
                </RowList>
              </Section>
            )}

            {tab === "changelog" && (
              <Section
                label={isFi ? "Versiohistoria" : "Version history"}
                description={isFi ? "Sovelluksen päivitykset" : "App updates"}
              >
                <CampusChangelog isFi={isFi} />
              </Section>
            )}

            {tab === "about" && (
              <div className="space-y-6">
                <Section label={isFi ? "Sovellus" : "Application"}>
                  <RowList>
                    <MetaRow
                      icon={Globe}
                      label={isFi ? "Verkkoversio" : "Web version"}
                      value={`v${APP_VERSION} · BETA`}
                    />
                    <MetaRow
                      icon={Smartphone}
                      label={isFi ? "Android-versio" : "Android version"}
                      value={`v${ANDROID_APP_VERSION}`}
                    />
                    <MetaRow
                      icon={School}
                      label={isFi ? "Koulu" : "School"}
                      value="Kulosaaren yhteiskoulu"
                    />
                  </RowList>
                </Section>

                <Section label={isFi ? "Kuvaus" : "About"}>
                  <p className={cn("text-[14px] leading-[1.65]", darkMode ? "text-gray-300" : "text-gray-700")}>
                    {isFi
                      ? "KSYK Maps on interaktiivinen karttasovellus Kulosaaren yhteiskoululle. Sovellus tarjoaa reaaliaikaisen pohjapiirroksen, huonehaun, lukujärjestysnäkymän sekä opastuksen koulun siipien A, U, K, M, R ja B välillä."
                      : "KSYK Maps is an interactive campus navigation app for Kulosaaren yhteiskoulu. It provides a real-time floor plan, room search, timetable view, and navigation between wings A, U, K, M, R, and B."}
                  </p>
                </Section>

                <Section label={isFi ? "Linkit" : "Links"}>
                  <RowList>
                    <LinkRow
                      icon={LifeBuoy}
                      label={isFi ? "Tuki ja palaute" : "Support & feedback"}
                      onClick={() => (window.location.href = "/support")}
                    />
                    <LinkRow
                      icon={ScrollText}
                      label={isFi ? "Versiohistoria" : "Version history"}
                      onClick={() => setTab("changelog")}
                    />
                    <LinkRow
                      icon={ExternalLink}
                      label={isFi ? "Lähdekoodi GitHubissa" : "Source on GitHub"}
                      onClick={() => window.open(KSYK_GITHUB_CHANGELOG, "_blank")}
                    />
                  </RowList>
                </Section>

                <Section label={isFi ? "Tekninen" : "Under the hood"}>
                  <RowList>
                    <MetaRow icon={Code2}    label={isFi ? "Kartta" : "Map engine"}   value="MapLibre GL · OSM" />
                    <MetaRow icon={Sparkles} label={isFi ? "Käyttöliittymä" : "Interface"} value="React · Tailwind · shadcn" />
                  </RowList>
                </Section>

                <p className="text-[11px] text-center text-gray-400 dark:text-gray-600 pb-2 pt-2">
                  © {new Date().getFullYear()} KSYK Maps · v{APP_VERSION} · BETA
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** ── Reusable Wilma-style building blocks ────────────────────────── */

function Section({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 sm:mb-2.5 px-1">
        <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {description && (
          <p className="text-[12px] mt-0.5 text-gray-500 dark:text-gray-500">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function RowList({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950 divide-y divide-[#d5dae0] dark:divide-[#2a3040]">
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">{label}</p>
        {description && (
          <p className="text-[12px] mt-0.5 text-gray-500 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" strokeWidth={2} />
      <span className="flex-1 text-[14px] font-semibold text-gray-900 dark:text-gray-100">
        {label}
      </span>
      <span className="text-[13px] tabular-nums text-gray-600 dark:text-gray-400 font-medium">
        {value}
      </span>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Globe;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#003d82]/30"
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" strokeWidth={2} />
      <span className="flex-1 text-[14px] font-semibold text-gray-900 dark:text-gray-100">
        {label}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
    </button>
  );
}
