import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Sparkles } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { KSYK_CHANGELOG, APP_VERSION, type ChangelogEntry } from "@/lib/changelog";
import { KSYK_GITHUB_CHANGELOG } from "@/lib/branding";
import { cn } from "@/lib/utils";

type CampusChangelogProps = {
  isFi: boolean;
  compact?: boolean;
};

export default function CampusChangelog({ isFi, compact = false }: CampusChangelogProps) {
  const { darkMode } = useDarkMode();

  const renderEntry = (entry: ChangelogEntry) => (
    <div
      key={entry.version}
      className={cn(
        "rounded-xl border-l-4 pl-4 py-3 transition-colors",
        entry.latest ? "border-blue-500" : "border-gray-300 dark:border-gray-600",
        darkMode ? "bg-gray-900/40" : "bg-slate-50/80"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-bold text-sm">v{entry.version}</span>
        {entry.latest && (
          <Badge className="text-[10px] h-5 bg-blue-600">{isFi ? "Uusin" : "Latest"}</Badge>
        )}
        <span className="text-xs text-muted-foreground">{entry.date}</span>
      </div>
      <p className="font-semibold text-sm mb-2">{isFi && entry.titleFi ? entry.titleFi : entry.title}</p>
      <ul className={cn("text-xs space-y-1", darkMode ? "text-gray-400" : "text-gray-600")}>
        {(isFi && entry.highlightsFi ? entry.highlightsFi : entry.highlights).map((h) => (
          <li key={h} className="flex gap-2">
            <span className="text-blue-500 shrink-0">•</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="font-bold text-base">{isFi ? "Muutosloki" : "Changelog"}</h3>
        </div>
        <Badge variant="outline" className="rounded-lg font-mono">
          v{APP_VERSION}
        </Badge>
      </div>

      <div className={cn("space-y-3", compact ? "max-h-64 overflow-y-auto pr-1" : "")}>
        {KSYK_CHANGELOG.map(renderEntry)}
      </div>

      <Button
        variant="outline"
        className="w-full rounded-xl gap-2"
        onClick={() => window.open(KSYK_GITHUB_CHANGELOG, "_blank")}
      >
        <FileText className="h-4 w-4" />
        {isFi ? "Koko muutosloki GitHubissa" : "Full changelog on GitHub"}
        <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
      </Button>
    </div>
  );
}
