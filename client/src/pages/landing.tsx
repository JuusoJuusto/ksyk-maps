import { Button } from "@/components/ui/button";
import KSYKLogo from "@/components/KSYKLogo";
import { useTranslation } from "react-i18next";
import { MapPin, Users, Globe, ArrowRight } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

/**
 * Landing page — shown to unauthenticated users. Clean KSYK-blue
 * accent design matching the rest of the app (no purple gradients,
 * no unsplash stock hero, no font-awesome). Feature cards use the
 * ring-1 + rounded-2xl vocabulary.
 */
export default function Landing() {
  const { t } = useTranslation();
  const { darkMode } = useDarkMode();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className={cn("min-h-screen flex flex-col", darkMode ? "dark bg-gray-950" : "bg-gray-50")}>
      {/* Header — floating rounded card, matches the main app chrome. */}
      <div className="sticky top-0 z-50 px-2 sm:px-3 md:px-4 pt-2">
        <header className="bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800/70 shadow-sm rounded-2xl overflow-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center gap-2 sm:gap-3">
                <KSYKLogo size="sm" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-blue-600 tracking-tight leading-none">
                    KSYK Maps
                  </h1>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 font-semibold leading-none mt-0.5">
                    Campus navigation
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogin}
                className="h-10 px-4 sm:px-5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98] transition-all"
                data-testid="button-login"
              >
                {t("login")}
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-12 sm:pt-20 pb-16">
        <div className="text-center">
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-4">
            KSYK · Kulosaari
          </div>
          <h2 className="text-[36px] sm:text-[56px] font-bold tracking-[-0.03em] text-gray-900 dark:text-white leading-[1.05] mb-5">
            Find every room.
            <br />
            <span className="text-blue-600 dark:text-blue-400">Never get lost.</span>
          </h2>
          <p className="text-[16px] sm:text-lg leading-relaxed text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8">
            Interactive campus navigation for students, staff, and visitors at
            Kulosaaren yhteiskoulu.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button
              size="lg"
              onClick={handleLogin}
              className="h-12 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98] transition-all"
              data-testid="button-hero-login"
            >
              {t("login")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              icon: MapPin,
              title: "Interactive maps",
              body: "Detailed floor plans and building layouts across the whole KSYK campus.",
            },
            {
              icon: Users,
              title: "Staff directory",
              body: "Quickly find and contact staff and teachers.",
            },
            {
              icon: Globe,
              title: "Bilingual",
              body: "Full Finnish and English support to match KSYK's bilingual mission.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-black/5 dark:ring-white/5 p-5 sm:p-6"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/40 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-1.5">
                {title}
              </h3>
              <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-gray-500 dark:text-gray-500">
          <p>© {new Date().getFullYear()} KSYK Maps</p>
          <p>Campus navigation</p>
        </div>
      </footer>
    </div>
  );
}
