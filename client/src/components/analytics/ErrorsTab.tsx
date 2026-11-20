/**
 * Errors — identical errors collapsed into one issue with a count, first/last
 * seen, platforms and a trend, so 400 copies of the same failure read as one
 * row instead of 400. Click an issue for the stack and a copy-for-bug-report.
 */
import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import ErrorRetry from "@/components/ErrorRetry";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmptyState, PANEL, fmtNum, timeAgo, useAdminQuery, type Range } from "./shared";

export interface ErrorGroup {
  id: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  sources: Record<string, number>;
  versions: [string, number][];
  sampleStack: string | null;
  sampleUrl: string | null;
  trend: number[];
  isNew: boolean;
}
export interface ErrorReport { range: Range; totalEvents: number; groups: ErrorGroup[]; truncated: boolean }

type Sort = "count" | "recent" | "new";
const SORTS: { key: Sort; label: string }[] = [
  { key: "count", label: "Most events" },
  { key: "recent", label: "Most recent" },
  { key: "new", label: "New" },
];
const SOURCES = ["all", "web", "android", "server"] as const;

function Spark({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-px h-5 w-[60px]" aria-hidden>
      {data.map((n, i) => (
        <span key={i} className="flex-1 rounded-[1px] bg-red-500/70" style={{ height: `${n === 0 ? 8 : Math.max(14, (n / max) * 100)}%`, opacity: n === 0 ? 0.2 : 1 }} />
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 px-2.5 rounded-md text-[12px] font-semibold border transition-colors",
        active
          ? "bg-[#003d82] border-[#003d82] text-white"
          : "border-[#d5dae0] dark:border-[#2a3040] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900",
      )}
    >
      {children}
    </button>
  );
}

function IssueDialog({ group, onClose }: { group: ErrorGroup | null; onClose: () => void }) {
  const { toast } = useToast();
  if (!group) return null;
  const report = [
    group.message,
    `Events: ${group.count} (first ${group.firstSeen}, last ${group.lastSeen})`,
    `Platforms: ${Object.entries(group.sources).map(([k, v]) => `${k} ${v}`).join(", ")}`,
    group.versions.length ? `Versions: ${group.versions.map(([v, n]) => `${v} (${n})`).join(", ")}` : "",
    group.sampleUrl ? `Where: ${group.sampleUrl}` : "",
    group.sampleStack ? `\n${group.sampleStack}` : "",
  ].filter(Boolean).join("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast({ title: "Copied", description: "Error details are on your clipboard." });
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text and copy it manually.", variant: "destructive" });
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px] leading-snug break-words pr-6">{group.message}</DialogTitle>
          <DialogDescription className="text-[12px]">
            {group.count} events · first {timeAgo(group.firstSeen)} · last {timeAgo(group.lastSeen)}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">Platforms</dt>
            <dd className="mt-1">{Object.entries(group.sources).map(([k, v]) => `${k} (${v})`).join(", ")}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">Versions</dt>
            <dd className="mt-1">{group.versions.map(([v, n]) => `${v} (${n})`).join(", ") || "—"}</dd>
          </div>
          {group.sampleUrl && (
            <div className="col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">Where</dt>
              <dd className="mt-1 font-mono break-all">{group.sampleUrl}</dd>
            </div>
          )}
        </dl>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">Stack trace</p>
          {group.sampleStack ? (
            <pre className="text-[11px] leading-relaxed font-mono p-3 rounded-md bg-gray-50 dark:bg-gray-900 border border-[#d5dae0] dark:border-[#2a3040] overflow-x-auto max-h-64">{group.sampleStack}</pre>
          ) : (
            <p className="text-[12px] text-gray-500">No stack trace was sent with this error.</p>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          className="h-9 px-4 rounded-md bg-[#003d82] text-white text-[13px] font-semibold hover:bg-[#002f66] justify-self-start"
        >
          Copy for bug report
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function ErrorsTab({ range }: { range: Range }) {
  const q = useAdminQuery<ErrorReport>(["insights-errors", range], `/api/admin/insights/errors?range=${range}`, 60_000);
  const [sort, setSort] = useState<Sort>("count");
  const [source, setSource] = useState<(typeof SOURCES)[number]>("all");
  const [text, setText] = useState("");
  const [open, setOpen] = useState<ErrorGroup | null>(null);

  const groups = useMemo(() => {
    const needle = text.trim().toLowerCase();
    const list = (q.data?.groups ?? []).filter((g) =>
      (source === "all" || g.sources[source]) && (!needle || g.message.toLowerCase().includes(needle)));
    const by: Record<Sort, (a: ErrorGroup, b: ErrorGroup) => number> = {
      count: (a, b) => b.count - a.count,
      recent: (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
      new: (a, b) => Number(b.isNew) - Number(a.isNew) || b.count - a.count,
    };
    return [...list].sort(by[sort]);
  }, [q.data, sort, source, text]);

  const newCount = q.data?.groups.filter((g) => g.isNew).length ?? 0;

  return (
    <div className="space-y-4">
      <ErrorRetry query={q} label="errors" />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-gray-600 dark:text-gray-300">
        <span><b className="text-gray-900 dark:text-white tabular-nums">{fmtNum(q.data?.totalEvents ?? 0)}</b> events</span>
        <span><b className="text-gray-900 dark:text-white tabular-nums">{q.data?.groups.length ?? 0}</b> issues</span>
        <span><b className="text-gray-900 dark:text-white tabular-nums">{newCount}</b> new in this range</span>
        <a
          href="https://ksyk.sentry.io/issues/?project=ksyk-maps&statsPeriod=24h"
          target="_blank" rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 font-semibold text-[#003d82] dark:text-blue-300 hover:underline"
        >
          Sentry <ExternalLink className="h-3 w-3" strokeWidth={2} />
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">{SORTS.map((s) => <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</Chip>)}</div>
        <div className="flex gap-1.5">{SOURCES.map((s) => <Chip key={s} active={source === s} onClick={() => setSource(s)}>{s === "all" ? "All platforms" : s}</Chip>)}</div>
        <label className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Filter errors"
            aria-label="Filter errors"
            className="h-7 w-full pl-8 pr-2 rounded-md border border-[#d5dae0] dark:border-[#2a3040] bg-transparent text-[12px] focus:outline-none focus:ring-2 focus:ring-[#003d82]"
          />
        </label>
      </div>

      <div className={cn(PANEL, "overflow-hidden")}>
        {q.isLoading ? (
          <div className="p-4 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-900" />)}</div>
        ) : groups.length === 0 ? (
          <EmptyState
            title={q.data?.groups.length ? "No errors match these filters" : `No errors in the last ${range}`}
            hint={q.data?.groups.length ? undefined : "Web and Android errors show up here as soon as they are reported."}
          />
        ) : (
          <ul className="divide-y divide-[#d5dae0] dark:divide-[#2a3040]">
            {groups.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => setOpen(g)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <span className="min-w-[40px] text-center rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[13px] font-semibold tabular-nums py-1">
                    {fmtNum(g.count)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-gray-900 dark:text-gray-100 line-clamp-2 break-words">
                      {g.isNew && <span className="mr-1.5 align-middle rounded px-1 py-px text-[10px] font-bold uppercase tracking-wide bg-[#003d82] text-white">New</span>}
                      {g.message}
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {Object.entries(g.sources).map(([k, v]) => `${k} ${v}`).join(" · ")}
                      {g.versions[0] ? ` · v${g.versions[0][0]}` : ""} · last {timeAgo(g.lastSeen)}
                    </span>
                  </span>
                  <Spark data={g.trend} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {q.data?.truncated && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Very high volume: only the newest 5,000 events in this range were grouped.
        </p>
      )}
      <IssueDialog group={open} onClose={() => setOpen(null)} />
    </div>
  );
}
