/**
 * Analytics hub — one tab, one range picker, seven views:
 *   Overview  how many people, is it growing, is anything broken
 *   Usage     features, search gaps, devices, retention, performance
 *   Errors    identical errors grouped into issues
 *   Sessions  who was on the site, with replays
 *   Logs      raw log stream + admin activity
 *   Alerts    Slack + phone notifications (owner only)
 *   Feedback  tickets-adjacent reports from users
 * The active view lives in the URL hash so links and reloads land on it.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import AppLogsManager from "@/components/AppLogsManager";
import AnalyticsExternalPanel from "@/components/AnalyticsExternalPanel";
import { PostHogReplaysPanel } from "@/components/PostHogReplaysPanel";
import { cn } from "@/lib/utils";
import AlertsTab from "./AlertsTab";
import ErrorsTab from "./ErrorsTab";
import OverviewTab, { useSummary } from "./OverviewTab";
import { Masthead, RANGES, RangePicker, type Range } from "./shared";
import {
  AnnouncementCtrCard, AuditPanel, EggsPanel, FeaturesPanel, InsightsPanels, PerformancePanel,
  RecentEventsPanel, RetentionChart, RoomPopularityCard, RoutePopularityCard, SessionsPanel,
} from "./UsagePanels";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "usage", label: "Usage" },
  { key: "errors", label: "Errors" },
  { key: "sessions", label: "Sessions" },
  { key: "logs", label: "Logs" },
  { key: "alerts", label: "Alerts" },
  { key: "feedback", label: "Feedback" },
] as const;
type Tab = (typeof TABS)[number]["key"];

// Hashes from before the rework still resolve.
const LEGACY_HASH: Record<string, Tab> = { analytics: "overview", external: "usage" };
const RANGE_KEY = "ksyk_analytics_range";
const RANGE_TABS: Tab[] = ["overview", "usage", "errors", "sessions"];

function readTab(): Tab {
  if (typeof window === "undefined") return "overview";
  const h = window.location.hash.replace(/^#/, "");
  return TABS.some((t) => t.key === h) ? (h as Tab) : LEGACY_HASH[h] ?? "overview";
}

function readRange(): Range {
  try {
    const v = localStorage.getItem(RANGE_KEY) as Range | null;
    if (v && RANGES.includes(v)) return v;
  } catch { /* storage blocked: fall back to the default */ }
  return "24h";
}

function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-[#d5dae0] dark:border-[#2a3040]">
      <summary className="cursor-pointer select-none list-none px-4 py-3 text-[13px] font-semibold text-gray-900 dark:text-white flex items-center justify-between">
        {title}
        <span className="text-[11px] font-normal text-gray-500 group-open:hidden">Show</span>
        <span className="text-[11px] font-normal text-gray-500 hidden group-open:inline">Hide</span>
      </summary>
      <div className="p-4 pt-0">{children}</div>
    </details>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <Masthead>{title}</Masthead>
      {children}
    </section>
  );
}

function UsageTab({ range }: { range: Range }) {
  return (
    <div className="space-y-6">
      <Section title="Features"><FeaturesPanel range={range} /></Section>
      <Section title="Search, devices and timing"><InsightsPanels range={range} /></Section>
      <Section title="Places">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RoomPopularityCard range={range} />
          <RoutePopularityCard range={range} />
        </div>
      </Section>
      <Section title="Retention and announcements">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RetentionChart range={range} />
          <AnnouncementCtrCard range={range} />
        </div>
      </Section>
      <Section title="Performance"><PerformancePanel range={range} /></Section>
      <Section title="Event stream"><RecentEventsPanel range={range} /></Section>
      <Collapsible title="Easter eggs"><EggsPanel /></Collapsible>
      <Collapsible title="Infrastructure (Cloudflare, Firestore)"><AnalyticsExternalPanel /></Collapsible>
    </div>
  );
}

export default function AnalyticsHub({ feedback }: { feedback: ReactNode }) {
  const qc = useQueryClient();
  const [tab, setTabState] = useState<Tab>(readTab);
  const [range, setRangeState] = useState<Range>(readRange);
  const summary = useSummary(range);

  const setTab = (t: Tab) => {
    setTabState(t);
    if (window.location.hash !== `#${t}`) history.replaceState(null, "", `#${t}`);
  };
  const setRange = (r: Range) => {
    setRangeState(r);
    try { localStorage.setItem(RANGE_KEY, r); } catch { /* per-viewer convenience only */ }
  };
  useEffect(() => {
    const onHash = () => setTabState(readTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const errors = summary.data?.metrics.errors.current ?? 0;
  const live = summary.data?.live.now;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#d5dae0] dark:border-[#2a3040]">
        <div role="tablist" aria-label="Analytics views" className="flex gap-1 overflow-x-auto -mb-px max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "h-10 px-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#003d82]",
                tab === t.key
                  ? "border-[#003d82] text-[#003d82] dark:border-blue-400 dark:text-blue-300"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
              )}
            >
              {t.label}
              {t.key === "errors" && errors > 0 && (
                <span className="ml-1.5 rounded px-1.5 py-px text-[10px] font-bold bg-red-600 text-white tabular-nums">{errors > 99 ? "99+" : errors}</span>
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 pb-2">
          {live !== undefined && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-300 tabular-nums">
              <span className={cn("h-1.5 w-1.5 rounded-full", live > 0 ? "bg-emerald-500" : "bg-gray-300")} />
              {live} online
            </span>
          )}
          {RANGE_TABS.includes(tab) && <RangePicker range={range} onChange={setRange} />}
          <button
            type="button"
            onClick={() => qc.invalidateQueries()}
            aria-label="Refresh"
            title="Refresh"
            className="h-7 w-7 grid place-items-center rounded-md border border-[#d5dae0] dark:border-[#2a3040] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {tab === "overview" && <OverviewTab range={range} onOpenErrors={() => setTab("errors")} />}
      {tab === "usage" && <UsageTab range={range} />}
      {tab === "errors" && <ErrorsTab range={range} />}
      {tab === "sessions" && (
        <div className="space-y-6">
          <SessionsPanel range={range} />
          <Section title="PostHog replays"><PostHogReplaysPanel range={range} /></Section>
        </div>
      )}
      {tab === "logs" && (
        <div className="space-y-6">
          <AppLogsManager />
          <Section title="Admin activity (last 7 days)"><AuditPanel /></Section>
        </div>
      )}
      {tab === "alerts" && <AlertsTab />}
      {tab === "feedback" && feedback}
    </div>
  );
}
