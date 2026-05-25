import { useQuery } from "@tanstack/react-query";
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

/** Optional Firebase release notes merged with static changelog */
export default function CampusChangelog({ isFi, compact = false }: CampusChangelogProps) {
  const { darkMode } = useDarkMode();

  const { data: releaseNotes = [] } = useQuery({
    queryKey: ["changelog-announcements"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/announcements?limit=10");
        if (!r.ok) return [];
        const items = await r.json();
        return (Array.isArray(items) ? items : [])
          .filter((a: { title?: string }) =>
            /release|update|version|päivitys/i.test(a.title || "")
          )
          .slice(0, 3);
      } catch {
        return [];
      }
    },
    staleTime: 120000,
  });

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

      {!compact && releaseNotes.length > 0 && (
        <div
          className={cn(
            "rounded-xl border p-3 text-xs space-y-2",
            darkMode ? "border-amber-800/50 bg-amber-950/20" : "border-amber-200 bg-amber-50"
          )}
        >
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            {isFi ? "Julkaisutiedotteet (Firebase)" : "Release notes (Firebase)"}
          </p>
          {releaseNotes.map((note: { id: string; title: string; content?: string }) => (
            <p key={note.id} className={darkMode ? "text-gray-300" : "text-gray-700"}>
              <strong>{note.title}</strong>
              {note.content ? ` — ${note.content.slice(0, 120)}…` : null}
            </p>
          ))}
        </div>
      )}

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
