import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Moon, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function CampusSettingsPanel() {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem("ksyk_language") || i18n.language;
  });
  const britishUnlocked = localStorage.getItem("ksyk_british_unlocked") === "true";
  const isFi = currentLang === "fi";

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem("ksyk_language", lang);
    setCurrentLang(lang);
    i18n.changeLanguage(lang).then(() => window.location.reload());
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4 pb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>🌐</span>
            {isFi ? "Kieli" : "Language"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant={currentLang === "en" ? "default" : "outline"}
            onClick={() => handleLanguageChange("en")}
            className="flex-1 min-w-[120px]"
          >
            🇬🇧 English
          </Button>
          <Button
            variant={currentLang === "fi" ? "default" : "outline"}
            onClick={() => handleLanguageChange("fi")}
            className="flex-1 min-w-[120px]"
          >
            🇫🇮 Suomi
          </Button>
          {britishUnlocked && (
            <Button
              variant={currentLang === "en-GB" ? "default" : "outline"}
              onClick={() => handleLanguageChange("en-GB")}
              className="w-full"
            >
              🇬🇧 British English
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>🎨</span>
            {isFi ? "Teema" : "Theme"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-3 rounded-lg border-2 text-center transition-all ${
              theme === "light" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <Sun className="h-6 w-6 mx-auto mb-1" />
            <div className="text-sm font-semibold">Light</div>
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-3 rounded-lg border-2 text-center transition-all ${
              theme === "dark" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <Moon className="h-6 w-6 mx-auto mb-1" />
            <div className="text-sm font-semibold">Dark</div>
          </button>
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-3 rounded-lg border-2 text-center transition-all ${
              theme === "system" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
            }`}
          >
            <span className="text-2xl block mb-1">💻</span>
            <div className="text-sm font-semibold">System</div>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isFi ? "Pikalinkit" : "Quick links"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/classic">
            <Button variant="outline" className="w-full justify-between">
              {isFi ? "Klassinen karttanäkymä" : "Classic map view"}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/lunch">
            <Button variant="outline" className="w-full justify-between">
              {isFi ? "Ruokalista" : "Lunch menu"}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/hsl">
            <Button variant="outline" className="w-full justify-between">
              HSL
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
