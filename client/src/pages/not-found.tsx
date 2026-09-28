import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, LifeBuoy } from "lucide-react";
import Header from "@/components/Header";
import AnnouncementBanner from "@/components/AnnouncementBanner";

export default function NotFound() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Page not found — KSYK Maps";
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <AnnouncementBanner />
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* 404 card — clean KSYK vocabulary: rounded-2xl ring-1, no
           *  heavy shadows, no purple gradient. */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-black/5 dark:ring-white/5 shadow-sm overflow-hidden">
            {/* Thin blue accent bar */}
            <div className="h-1 w-full bg-blue-600" />

            <div className="px-6 sm:px-8 py-8 sm:py-10 text-center">
              {/* Editorial kicker */}
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-3">
                Error 404
              </div>

              {/* Big bold heading */}
              <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.02em] text-gray-900 dark:text-white leading-tight mb-3">
                Page not found
              </h1>

              <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
                The page you're looking for doesn't exist. It might have been moved or removed.
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-center">
                <Link href="/">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98] transition-all"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go to map
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold active:scale-[0.98] transition-all"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go back
                </Button>
              </div>
            </div>

            {/* Support link — subtle footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-[12px] text-gray-500 dark:text-gray-500">
                Something broken? Let us know.
              </p>
              <Link href="/support">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  <LifeBuoy className="h-3.5 w-3.5" />
                  Contact support
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
