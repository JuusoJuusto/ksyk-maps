/**
 * Floating schedule card that shows current/next lesson + today's timetable.
 * Opened from the header when a Wilma calendar is connected.
 */

import { useState, useEffect, useCallback } from "react";
import {
  loadCachedEvents,
  syncCalendar,
  clearCache,
  getCacheAge,
  getCurrentLesson,
  getNextLesson,
  getTodayLessons,
  getWeekLessons,
  type CalendarEvent,
} from "@/lib/wilmaCalendar";
import WilmaConnectPanel from "@/components/WilmaConnectPanel";

type Tab = "today" | "week" | "settings";

type TeacherMap = Map<string, string>; // abbrev → "First Last"
type SubjectMap = Map<string, string>; // code → name

function resolveSubjectName(code: string, map: SubjectMap): string | null {
  if (!code) return null;
  if (map.has(code)) return map.get(code)!;
  // Prefix match: map key "FY" matches code "FY1.F"
  for (const [k, v] of map) {
    if (code.startsWith(k + ".") || code.startsWith(k + " ")) return v;
  }
  return null;
}

interface Props {
  onNavigateToRoom?: (roomId: string) => void;
  onClose?: () => void;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function WilmaScheduleCard({ onNavigateToRoom, onClose }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadCachedEvents());
  const [tab, setTab] = useState<Tab>("today");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(() => getCacheAge());
  const [teacherMap, setTeacherMap] = useState<TeacherMap>(new Map());
  const [subjectMap, setSubjectMap] = useState<SubjectMap>(new Map());

  const refresh = useCallback(async (force = false) => {
    if (force) clearCache();
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await syncCalendar();
      setEvents(result.events);
      setLastSync(new Date());
    } catch (e: any) {
      setSyncError(e.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Auto-sync if cache is stale or empty
    if (events.length === 0 || !getCacheAge()) {
      refresh();
    }
  }, []);

  useEffect(() => {
    fetch("/api/teachers")
      .then(r => r.ok ? r.json() : [])
      .then((teachers: { firstName: string; lastName: string; abbrev?: string }[]) => {
        const m = new Map<string, string>();
        for (const t of teachers) {
          if (t.abbrev) m.set(t.abbrev, `${t.firstName} ${t.lastName}`);
        }
        setTeacherMap(m);
      })
      .catch(() => {});

    fetch("/api/subjects")
      .then(r => r.ok ? r.json() : [])
      .then((subs: { code: string; name: string }[]) => {
        const m = new Map<string, string>();
        for (const s of subs) m.set(s.code, s.name);
        setSubjectMap(m);
      })
      .catch(() => {});
  }, []);

  const current = getCurrentLesson(events);
  const next = getNextLesson(events);
  const today = getTodayLessons(events);
  const week = getWeekLessons(events);
  const hasCalendar = !!localStorage.getItem("ksyk_wilma_ical_url");

  return (
    <div
      className="fixed right-4 top-16 z-50 w-80 rounded-2xl shadow-2xl
                 border border-slate-200/80 dark:border-slate-700
                 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm
                 text-slate-900 dark:text-slate-100
                 flex flex-col overflow-hidden"
      style={{ maxHeight: "calc(100vh - 80px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-semibold text-sm">My Schedule</span>
          {syncing && <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">Syncing…</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refresh(true)}
            disabled={syncing}
            title="Refresh calendar"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${syncing ? "animate-spin" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {onClose && (
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1 shrink-0 pb-2">
        {(["today", "week", "settings"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize
              ${tab === t
                ? "bg-blue-600 text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
          >
            {t === "settings" ? "Setup" : t}
          </button>
        ))}
      </div>

      {/* Sync error */}
      {syncError && (
        <div className="mx-4 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-300">
          {syncError}
        </div>
      )}

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-4 pb-4">
        {/* ── Today tab ── */}
        {tab === "today" && (
          <div className="flex flex-col gap-3">
            {!hasCalendar ? (
              <NoCalendarPrompt onSetup={() => setTab("settings")} />
            ) : events.length === 0 && !syncing ? (
              <EmptyState message="No lessons found in your calendar." />
            ) : (
              <>
                {/* NOW card */}
                <LessonCard
                  label="NOW"
                  labelColor="text-emerald-600 dark:text-emerald-400"
                  event={current}
                  emptyText="No lesson right now"
                  onNavigate={onNavigateToRoom}
                  teacherMap={teacherMap}
                  subjectMap={subjectMap}
                />

                {/* NEXT card */}
                <LessonCard
                  label="NEXT"
                  labelColor="text-blue-600 dark:text-blue-400"
                  event={next}
                  emptyText="No more lessons today"
                  onNavigate={onNavigateToRoom}
                  teacherMap={teacherMap}
                  subjectMap={subjectMap}
                />

                {/* Today's rest */}
                {today.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Today's schedule
                    </p>
                    {today.map(ev => (
                      <TimetableRow key={ev.uid} event={ev} onNavigate={onNavigateToRoom} teacherMap={teacherMap} subjectMap={subjectMap} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Week tab ── */}
        {tab === "week" && (
          <div className="flex flex-col gap-4">
            {!hasCalendar ? (
              <NoCalendarPrompt onSetup={() => setTab("settings")} />
            ) : week.every(d => d.length === 0) && !syncing ? (
              <EmptyState message="No lessons found in your calendar." />
            ) : (
              week.map((day, idx) => (
                day.length > 0 ? (
                  <div key={idx}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      {DAY_NAMES[idx]}
                    </p>
                    <div className="flex flex-col gap-1">
                      {day.map(ev => (
                        <TimetableRow key={ev.uid + ev.dayOfWeek} event={ev} onNavigate={onNavigateToRoom} teacherMap={teacherMap} subjectMap={subjectMap} />
                      ))}
                    </div>
                  </div>
                ) : null
              ))
            )}
          </div>
        )}

        {/* ── Settings tab ── */}
        {tab === "settings" && (
          <WilmaConnectPanel
            onConnected={result => {
              setEvents(result.events);
              setLastSync(new Date());
              setTab("today");
            }}
            onDisconnected={() => { setEvents([]); }}
          />
        )}
      </div>

      {/* Footer */}
      {lastSync && tab !== "settings" && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-600">
            Last synced: {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

function LessonCard({
  label, labelColor, event, emptyText, onNavigate, teacherMap, subjectMap,
}: {
  label: string;
  labelColor: string;
  event: CalendarEvent | null;
  emptyText: string;
  onNavigate?: (roomId: string) => void;
  teacherMap?: TeacherMap;
  subjectMap?: SubjectMap;
}) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
      <p className={`text-xs font-bold tracking-widest ${labelColor} mb-1`}>{label}</p>
      {event ? (
        <div className="flex flex-col gap-1">
          {(() => {
            const resolvedName = subjectMap && event.subjectCode
              ? resolveSubjectName(event.subjectCode, subjectMap)
              : null;
            return (
              <p className="font-semibold text-sm leading-tight">
                {resolvedName ?? event.summary}
              </p>
            );
          })()}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {event.matchedRoomNumber && (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                </svg>
                Room {event.matchedRoomNumber}
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">{event.startHhmm}–{event.endHhmm}</span>
            {(() => {
              const resolved = teacherMap && event.teacherAbbrev
                ? teacherMap.get(event.teacherAbbrev)
                : null;
              const display = resolved ?? event.teacher ?? null;
              return display ? <span className="text-xs text-slate-500">{display}</span> : null;
            })()}
          </div>
          {event.matchedRoomId && onNavigate && (
            <button
              onClick={() => onNavigate(event.matchedRoomId!)}
              className="mt-1 self-start flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400
                         hover:text-blue-500 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Navigate to {event.matchedRoomNumber}
            </button>
          )}
          {!event.matchedRoomId && event.location && (
            <p className="text-xs text-slate-500 italic">Room "{event.location}" not found in map</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function TimetableRow({
  event, onNavigate, teacherMap, subjectMap,
}: {
  event: CalendarEvent;
  onNavigate?: (roomId: string) => void;
  teacherMap?: TeacherMap;
  subjectMap?: SubjectMap;
}) {
  const resolvedSubject = subjectMap && event.subjectCode
    ? resolveSubjectName(event.subjectCode, subjectMap)
    : null;
  const resolvedTeacher = teacherMap && event.teacherAbbrev
    ? teacherMap.get(event.teacherAbbrev)
    : null;
  const teacherDisplay = resolvedTeacher ?? event.teacherAbbrev ?? null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 px-2.5 py-1.5">
      <span className="text-xs text-slate-500 w-10 shrink-0 font-mono">{event.startHhmm}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{resolvedSubject ?? event.summary}</p>
        <div className="flex items-center gap-2">
          {event.matchedRoomNumber && (
            <p className="text-xs text-slate-500">Room {event.matchedRoomNumber}</p>
          )}
          {teacherDisplay && (
            <p className="text-xs text-slate-400 truncate">{teacherDisplay}</p>
          )}
        </div>
      </div>
      {event.matchedRoomId && onNavigate && (
        <button
          onClick={() => onNavigate(event.matchedRoomId!)}
          title={`Navigate to ${event.matchedRoomNumber}`}
          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 active:scale-95 transition-all shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

function NoCalendarPrompt({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="py-6 text-center flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <p className="font-medium text-sm">No calendar connected</p>
        <p className="text-xs text-slate-500 mt-1">Connect your Wilma calendar to see your schedule here.</p>
      </div>
      <button
        onClick={onSetup}
        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
      >
        Connect Wilma
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
