/**
 * KSYK Maps — Beacon Surveyor (admin).
 *
 * Used to map indoor positioning fingerprints by walking each classroom
 * and recording WiFi access-point signal strengths at named positions
 * (NW corner, NE corner, doorway, centre, etc.). The fingerprint then
 * lets a phone app estimate which room a user is in from the signals it
 * currently sees, no GPS required.
 *
 * Browsers can't scan WiFi directly, so each "reading" is captured by
 * the surveyor either:
 *   a) pasting RSSI values their phone's WiFi tool reported, or
 *   b) using the experimental NetworkInformation API where available.
 *
 * Stored in Firestore at /beaconSurveys/{roomId}/positions/{positionId}.
 *
 * The whole feature is gated behind security.beaconPositioningEnabled
 * (in admin Settings → Navigation & Positioning) so it stays hidden
 * until the school is ready to roll it out.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi, MapPin, Plus, Save, Trash2, Search, Loader2,
  Radio, CornerDownLeft, ChevronRight, CheckCircle2, FlaskConical, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminHeaders } from "@/lib/adminAuth";

interface CoverageEntry { roomId: string; positionCount: number; apCount: number; }
interface CoverageQualityEntry {
  roomId: string;
  roomNumber: string | null;
  floor: number | null;
  positionCount: number;
  avgQuality: number;
  qualityLabel: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
}
interface WifiStatus { fingerprintCount: number; ready: boolean; }
interface LocateResult {
  roomId: string; positionLabel: string;
  floor: number | null;
  confidence: string; confidenceScore: number;
  sharedApCount: number; distance: number;
}

interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  floor: number;
  type?: string;
}

interface BeaconReading {
  bssid: string;          // MAC of the access point (lowercased)
  ssid?: string;          // friendly SSID name
  rssi: number;           // dBm, typically -30 to -95
  source?: "manual" | "wifi" | "bluetooth"; // how the reading was captured
}

/** True when running inside the Electron desktop app, which has native WiFi access. */
const IS_ELECTRON = typeof window !== "undefined" && (window as any).electronAPI?.isElectron === true;

interface SurveyPosition {
  id: string;
  positionLabel: string;  // "Corner NW", "Doorway", etc.
  capturedAt: string;
  readings: BeaconReading[];
  quality?: { score: number; label: 'excellent' | 'good' | 'fair' | 'poor' };
  /** Optional GPS coordinates of the surveyor at the moment of capture.
   *  When 4+ positions in a room have GPS, the system can auto-derive
   *  the room's bounding rectangle and snap it onto the campus map. */
  lat?: number;
  lng?: number;
  accuracyM?: number;
  /** Auto-assigned corner label after auto-detection runs over the
   *  saved positions of the room. NW/NE/SW/SE — not user input. */
  autoCorner?: "NW" | "NE" | "SW" | "SE" | null;
}

const DEFAULT_POSITION_LABELS = [
  "Corner NW", "Corner NE", "Corner SW", "Corner SE",
  "Centre", "Doorway", "Window-side", "Whiteboard",
];

export default function BeaconSurveyor() {
  const { darkMode } = useDarkMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [testPaste, setTestPaste] = useState("");
  const [testResult, setTestResult] = useState<LocateResult | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [showTest, setShowTest] = useState(false);

  /* ── System status ──────────────────────────────────────────────── */
  const { data: wifiStatus, refetch: refetchStatus, isFetching: statusFetching } =
    useQuery<WifiStatus>({
      queryKey: ["wifi-status"],
      queryFn: async () => {
        const r = await fetch("/api/wifi/locate");
        if (!r.ok) throw new Error("status fetch failed");
        return r.json();
      },
      staleTime: 30_000,
    });

  /* ── Per-room coverage ──────────────────────────────────────────── */
  const { data: coverage = [] } = useQuery<CoverageEntry[]>({
    queryKey: ["beacon-coverage"],
    queryFn: async () => {
      const r = await fetch("/api/beacons/coverage");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30_000,
  });

  const coverageMap = useMemo(() => {
    const m = new Map<string, CoverageEntry>();
    for (const c of coverage) m.set(c.roomId, c);
    return m;
  }, [coverage]);

  /* ── Coverage quality (floor breakdown) ─────────────────────────── */
  const { data: coverageQuality = [] } = useQuery<CoverageQualityEntry[]>({
    queryKey: ["beacon-coverage-quality"],
    queryFn: async () => {
      const r = await fetch("/api/beacons/coverage-quality");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30_000,
  });

  const floorSummary = useMemo(() => {
    const floors = new Map<number, { excellent: number; good: number; fair: number; poor: number; none: number }>();
    for (const e of coverageQuality) {
      const f = e.floor ?? -1;
      if (!floors.has(f)) floors.set(f, { excellent: 0, good: 0, fair: 0, poor: 0, none: 0 });
      const entry = floors.get(f)!;
      entry[e.positionCount === 0 ? 'none' : e.qualityLabel]++;
    }
    return [...floors.entries()].sort((a, b) => a[0] - b[0]);
  }, [coverageQuality]);

  /* ── Test locate ────────────────────────────────────────────────── */
  const runTest = async () => {
    setTestBusy(true);
    setTestError(null);
    setTestResult(null);
    const readings: { bssid: string; rssi: number; ssid?: string }[] = [];
    for (const raw of testPaste.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^([0-9a-f:.\-]+)\s+(-?\d+)(?:\s+(.+))?$/i);
      if (!m) continue;
      readings.push({ bssid: m[1].toLowerCase(), rssi: parseInt(m[2], 10), ssid: m[3]?.trim() || undefined });
    }
    if (readings.length === 0) { setTestError("No valid readings parsed — use: <bssid> <rssi> [ssid]"); setTestBusy(false); return; }
    try {
      const resp = await fetch("/api/wifi/locate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readings }),
      });
      if (!resp.ok) { setTestError(`Server: ${(await resp.json()).message ?? resp.status}`); return; }
      setTestResult(await resp.json());
    } catch (e) {
      setTestError((e as Error).message);
    } finally {
      setTestBusy(false);
    }
  };

  /* ── Rooms list ─────────────────────────────────────────────────── */
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms
      .filter((r) => r.type !== "hallway" && r.type !== "corridor")
      .filter((r) =>
        !q || r.roomNumber?.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => (a.roomNumber || "").localeCompare(b.roomNumber || ""));
  }, [rooms, query]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  /* ── Positions for selected room ────────────────────────────────── */
  const { data: positions = [], isFetching } = useQuery<SurveyPosition[]>({
    queryKey: ["beacon-survey", selectedRoomId],
    enabled: !!selectedRoomId,
    queryFn: async () => {
      const r = await fetch(`/api/beacons/${selectedRoomId}/positions`);
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30_000,
  });

  const completedCount = positions.length;

  /** Auto-corner detection — runs over every position labelled "Corner"
   *  that also carries a GPS fix. With 4+ such corners, we work out the
   *  centroid and assign NW/NE/SW/SE by sign of (lat-centroidLat) and
   *  (lng-centroidLng). The result is a per-position lookup so the UI
   *  can label corners without the user picking them by hand. */
  const cornerLabels = useMemo<Record<string, "NW" | "NE" | "SW" | "SE">>(() => {
    const corners = positions.filter((p) => p.lat != null && p.lng != null && /corner/i.test(p.positionLabel));
    if (corners.length < 4) return {};
    const cLat = corners.reduce((a, p) => a + (p.lat ?? 0), 0) / corners.length;
    const cLng = corners.reduce((a, p) => a + (p.lng ?? 0), 0) / corners.length;
    const out: Record<string, "NW" | "NE" | "SW" | "SE"> = {};
    for (const p of corners) {
      const north = (p.lat ?? 0) > cLat;
      const east = (p.lng ?? 0) > cLng;
      out[p.id] = north
        ? east ? "NE" : "NW"
        : east ? "SE" : "SW";
    }
    return out;
  }, [positions]);

  /* ── Save / delete ──────────────────────────────────────────────── */

  const savePosition = useMutation({
    mutationFn: async (payload: Omit<SurveyPosition, "id">) => {
      const r = await fetch(`/api/beacons/${selectedRoomId}/positions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Save failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Position saved" });
      queryClient.invalidateQueries({ queryKey: ["beacon-survey", selectedRoomId] });
    },
    onError: () => toast({ title: "Couldn't save position", variant: "destructive" }),
  });

  const deletePosition = useMutation({
    mutationFn: async (positionId: string) => {
      const r = await fetch(`/api/beacons/${selectedRoomId}/positions/${positionId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAdminHeaders(),
      });
      if (!r.ok && r.status !== 204) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "Position removed" });
      queryClient.invalidateQueries({ queryKey: ["beacon-survey", selectedRoomId] });
    },
  });

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">
      {/* System status */}
      <Card className={cn(
        wifiStatus?.ready
          ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20"
          : "border-gray-200 dark:border-gray-800",
      )}>
        <CardContent className="py-4 flex items-center gap-4">
          {wifiStatus?.ready ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <Wifi className="h-5 w-5 text-gray-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Wi-Fi Positioning
              <Badge variant="secondary" className={cn(
                "text-[10px]",
                wifiStatus?.ready
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
              )}>
                {wifiStatus?.ready ? "LIVE" : "NO DATA"}
              </Badge>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {wifiStatus
                ? `${wifiStatus.fingerprintCount} fingerprints · ${coverage.length} room${coverage.length === 1 ? "" : "s"} covered`
                : "Loading…"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { refetchStatus(); queryClient.invalidateQueries({ queryKey: ["beacon-coverage"] }); }}
            disabled={statusFetching}
            className="h-8 w-8 p-0 text-gray-400"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", statusFetching && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTest((v) => !v)}
            className="h-8 text-xs gap-1.5"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Test
          </Button>
        </CardContent>
      </Card>

      {/* Test locate panel */}
      {showTest && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-600" />
              Test locate
            </CardTitle>
            <CardDescription className="text-xs">
              Paste current BSSID/RSSI readings to verify the positioning engine.
              Format: <code className="font-mono">aa:bb:cc:dd:ee:ff -67 [ssid]</code> one per line.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={testPaste}
              onChange={(e) => setTestPaste(e.target.value)}
              placeholder={"aa:bb:cc:dd:ee:ff -67 ksyk-staff\n11:22:33:44:55:66 -82 eduroam"}
              className={cn(
                "w-full text-xs font-mono p-2.5 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y h-24",
                darkMode ? "bg-gray-900" : "bg-white",
              )}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={runTest}
                disabled={testBusy || !testPaste.trim()}
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                {testBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                Run
              </Button>
              {testError && <p className="text-xs text-red-600 dark:text-red-400">{testError}</p>}
            </div>
            {testResult && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 text-xs space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Room: <span className="font-mono">{testResult.roomId}</span> · {testResult.positionLabel}
                  {testResult.floor != null && <span> · Floor {testResult.floor}</span>}
                </p>
                <p className="text-blue-800/80 dark:text-blue-300/80">
                  Confidence: <strong>{testResult.confidence}</strong> ({testResult.confidenceScore}%)
                  · {testResult.sharedApCount} shared APs · dist {testResult.distance}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Floor coverage map */}
      {floorSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4 text-blue-600" />
              Coverage by Floor
            </CardTitle>
            <CardDescription className="text-xs">
              Rooms with calibrated fingerprints — collect more fingerprints in yellow/red areas.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {floorSummary.map(([floor, counts]) => {
              const total = counts.excellent + counts.good + counts.fair + counts.poor + counts.none;
              const calibrated = counts.excellent + counts.good + counts.fair + counts.poor;
              return (
                <div key={floor} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 w-16 shrink-0">
                      {floor === -1 ? 'Unknown' : `Floor ${floor}`}
                    </span>
                    <span className="text-gray-400">{calibrated}/{total} rooms</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
                      {counts.excellent > 0 && (
                        <div style={{ width: `${(counts.excellent / total) * 100}%` }} className="bg-green-500 h-full" title={`Excellent: ${counts.excellent}`} />
                      )}
                      {counts.good > 0 && (
                        <div style={{ width: `${(counts.good / total) * 100}%` }} className="bg-blue-500 h-full" title={`Good: ${counts.good}`} />
                      )}
                      {counts.fair > 0 && (
                        <div style={{ width: `${(counts.fair / total) * 100}%` }} className="bg-yellow-400 h-full" title={`Fair: ${counts.fair}`} />
                      )}
                      {counts.poor > 0 && (
                        <div style={{ width: `${(counts.poor / total) * 100}%` }} className="bg-red-400 h-full" title={`Poor: ${counts.poor}`} />
                      )}
                      {counts.none > 0 && (
                        <div style={{ width: `${(counts.none / total) * 100}%` }} className="bg-gray-200 dark:bg-gray-700 h-full" title={`No data: ${counts.none}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Excellent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Good</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Fair</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Poor</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> None</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-4">
        {/* Rooms sidebar */}
        <Card className="overflow-hidden h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Pick a room
            </CardTitle>
            <CardDescription className="text-xs">
              {rooms.length} rooms · pick one to survey
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="relative mb-2">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto -mx-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-xs text-center text-gray-500">No rooms match.</p>
              ) : filtered.map((r) => {
                const cov = coverageMap.get(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoomId(r.id)}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2 text-sm border-l-2 transition-colors",
                      selectedRoomId === r.id
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-600"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 border-transparent",
                    )}
                  >
                    <span className="font-mono text-xs font-bold w-12 shrink-0 tabular-nums">{r.roomNumber}</span>
                    <span className="flex-1 truncate text-xs">{r.name || r.type || "—"}</span>
                    {cov ? (
                      <span className={cn(
                        "text-[10px] font-semibold px-1 rounded shrink-0",
                        cov.positionCount >= 4
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                      )}>
                        {cov.positionCount}p
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 shrink-0">F{r.floor}</span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Survey workspace */}
        <div className="space-y-4">
          {!selectedRoom ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <Wifi className="h-9 w-9 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pick a room to start</p>
                <p className="text-xs text-gray-500 max-w-xs">
                  For each room, capture readings at the four corners, the doorway and the centre.
                  More positions = better positioning accuracy.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="font-mono text-blue-600">{selectedRoom.roomNumber}</span>
                        <span className="text-gray-500 font-normal">·</span>
                        <span>{selectedRoom.name || selectedRoom.type || "Room"}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">Floor {selectedRoom.floor} · {selectedRoom.type ?? "classroom"}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {completedCount}/{DEFAULT_POSITION_LABELS.length} positions
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              <NewPositionForm
                onSubmit={(payload) => savePosition.mutate(payload)}
                submitting={savePosition.isPending}
                darkMode={darkMode}
              />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="h-4 w-4 text-blue-600" />
                    Captured positions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isFetching ? (
                    <p className="text-sm text-gray-500 flex items-center gap-2 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </p>
                  ) : positions.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 text-center">
                      Nothing captured yet. Use the form above.
                    </p>
                  ) : (
                    <>
                      {Object.keys(cornerLabels).length >= 4 && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300">
                          ✓ Corners auto-detected — NW / NE / SW / SE assigned by GPS.
                        </div>
                      )}
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {positions.map((p) => {
                          const auto = cornerLabels[p.id];
                          return (
                            <div key={p.id} className="py-2.5 flex items-start gap-3">
                              <CornerDownLeft className="h-3.5 w-3.5 text-blue-500 mt-1 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-semibold">{p.positionLabel}</p>
                                  {auto && (
                                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                      Auto: {auto}
                                    </Badge>
                                  )}
                                  {p.lat != null && (
                                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                                      <MapPin className="h-2.5 w-2.5" />
                                      GPS
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  {p.readings.length} AP{p.readings.length === 1 ? "" : "s"} ·
                                  {" "}{new Date(p.capturedAt).toLocaleString()}
                                  {p.quality && (
                                    <span className={cn(
                                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                      p.quality.label === 'excellent' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                      p.quality.label === 'good'      && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                      p.quality.label === 'fair'      && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                      p.quality.label === 'poor'      && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                    )}>
                                      {p.quality.score}/100 · {p.quality.label}
                                    </span>
                                  )}
                                </p>
                                {p.lat != null && p.lng != null && (
                                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                    {p.lat.toFixed(6)}, {p.lng.toFixed(6)} · ±{Math.round(p.accuracyM ?? 0)}m
                                  </p>
                                )}
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {p.readings.slice(0, 6).map((r, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                    >
                                      {r.ssid || r.bssid.slice(-5)}: {r.rssi}dBm
                                    </span>
                                  ))}
                                  {p.readings.length > 6 && (
                                    <span className="text-[10px] text-gray-400">
                                      +{p.readings.length - 6} more
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePosition.mutate(p.id)}
                                className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── New position form ──────────────────────────────────────────────── */

function NewPositionForm({
  onSubmit, submitting, darkMode,
}: {
  onSubmit: (p: Omit<SurveyPosition, "id">) => void;
  submitting: boolean;
  darkMode: boolean;
}) {
  const [label, setLabel] = useState("Corner");
  const [paste, setPaste] = useState("");
  const [readings, setReadings] = useState<BeaconReading[]>([]);
  /** Captured GPS — auto-fills when the user taps "Capture GPS". */
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracyM: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  /** WiFi / BLE scan status. */
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported.");
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        });
        setGpsBusy(false);
      },
      (err) => {
        setGpsError(err.message || "Couldn't get GPS.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  };

  const scan = async () => {
    setScanBusy(true);
    setScanError(null);

    if (IS_ELECTRON) {
      // Native WiFi scan via Electron IPC — works on Windows/Mac/Linux.
      try {
        const result: { networks?: Array<{ bssid: string; ssid?: string; rssi: number }>; error?: string } =
          await (window as any).electronAPI.scanWifi();
        if (result.error && (!result.networks || result.networks.length === 0)) {
          setScanError(`WiFi scan failed: ${result.error}`);
        } else if (!result.networks || result.networks.length === 0) {
          setScanError("No WiFi networks found. Make sure WiFi is enabled.");
        } else {
          const arr: BeaconReading[] = result.networks.map((n) => ({
            bssid: n.bssid,
            ssid: n.ssid || undefined,
            rssi: n.rssi,
            source: "wifi" as const,
          }));
          setReadings((prev) => [...arr, ...prev.filter((p) => !arr.find((a) => a.bssid === p.bssid))]);
        }
      } catch (err) {
        setScanError((err as Error).message || "WiFi scan failed.");
      } finally {
        setScanBusy(false);
      }
      return;
    }

    // Browser fallback: Web Bluetooth (Chrome only, experimental).
    const nav = navigator as any;
    if (!nav.bluetooth?.requestLEScan) {
      setScanError("Use the Electron desktop app for WiFi scanning. In browser, paste readings manually below.");
      setScanBusy(false);
      return;
    }
    try {
      const bleScan = await nav.bluetooth.requestLEScan({ acceptAllAdvertisements: true });
      const seen: Record<string, BeaconReading> = {};
      const onAdv = (e: any) => {
        const id = String(e.device?.id || e.device?.name || "");
        if (!id) return;
        const rssi = e.rssi;
        if (typeof rssi !== "number") return;
        if (!seen[id] || seen[id].rssi < rssi) {
          seen[id] = { bssid: id.toLowerCase().slice(0, 30), ssid: e.device?.name || undefined, rssi, source: "bluetooth" };
        }
      };
      nav.bluetooth.addEventListener("advertisementreceived", onAdv);
      await new Promise((r) => setTimeout(r, 5000));
      bleScan.stop();
      nav.bluetooth.removeEventListener("advertisementreceived", onAdv);
      const arr = Object.values(seen).sort((a, b) => b.rssi - a.rssi);
      if (arr.length === 0) {
        setScanError("No BLE beacons heard. Use the Electron app for WiFi scanning.");
      } else {
        setReadings((prev) => [...arr, ...prev.filter((p) => !arr.find((a) => a.bssid === p.bssid))]);
      }
    } catch (err) {
      setScanError((err as Error).message || "Bluetooth scan failed.");
    } finally {
      setScanBusy(false);
    }
  };

  const parsePaste = () => {
    // Accepted input — one reading per line, format:
    //   <bssid> <rssi> [ssid]
    //   aa:bb:cc:dd:ee:ff -67 ksyk-staff
    const out: BeaconReading[] = [];
    for (const raw of paste.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^([0-9a-f:.\-]+)\s+(-?\d+)(?:\s+(.+))?$/i);
      if (!m) continue;
      out.push({
        bssid: m[1].toLowerCase(),
        rssi: parseInt(m[2], 10),
        ssid: m[3]?.trim() || undefined,
        source: "manual",
      });
    }
    if (out.length === 0) return;
    setReadings(out);
    setPaste("");
  };

  const removeReading = (i: number) => setReadings((rs) => rs.filter((_, j) => j !== i));

  const submit = () => {
    if (readings.length === 0 && !gps) return;
    onSubmit({
      positionLabel: label,
      capturedAt: new Date().toISOString(),
      readings,
      lat: gps?.lat,
      lng: gps?.lng,
      accuracyM: gps?.accuracyM,
    });
    setReadings([]);
    setGps(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="h-4 w-4 text-blue-600" />
          New position
        </CardTitle>
        <CardDescription className="text-xs">
          Walk to a corner, tap <strong>Capture GPS</strong> +{" "}
          <strong>{IS_ELECTRON ? "Scan WiFi" : "Scan BLE"}</strong>, then save.
          {IS_ELECTRON
            ? " Running in desktop app — native WiFi scanning is active."
            : " In browser only BLE beacons are scannable; use the desktop app for full WiFi scanning."}
          {" "}With 4+ corners + GPS we'll auto-detect the room shape.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Capture row — GPS + Bluetooth */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={captureGps}
            disabled={gpsBusy}
            className={cn(
              "h-10 rounded-lg text-xs font-semibold gap-1.5 inline-flex items-center justify-center transition-colors border-2",
              gps
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",
            )}
          >
            {gpsBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
            {gps
              ? `GPS · ±${Math.round(gps.accuracyM)} m`
              : gpsBusy ? "Locating…" : "Capture GPS"}
          </button>
          <button
            type="button"
            onClick={scan}
            disabled={scanBusy}
            className={cn(
              "h-10 rounded-lg text-xs font-semibold gap-1.5 inline-flex items-center justify-center transition-colors border-2",
              "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",
            )}
          >
            {scanBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
            {scanBusy ? "Scanning…" : IS_ELECTRON ? "Scan WiFi" : "Scan BLE (5s)"}
          </button>
        </div>
        {gpsError && (
          <p className="text-[11px] text-red-600 dark:text-red-400">{gpsError}</p>
        )}
        {scanError && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">{scanError}</p>
        )}
        {gps && (
          <p className="text-[10px] font-mono text-gray-500">
            {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} · accuracy ±{Math.round(gps.accuracyM)} m
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="Corner">Corner (auto-detect)</option>
              {DEFAULT_POSITION_LABELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
              <option value="Other">Other…</option>
            </select>
            <p className="text-[10px] text-gray-400 leading-tight">
              Use <strong>Corner</strong> for auto-detection — we'll work out NW/NE/SW/SE from GPS.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Captured at</Label>
            <Input
              value={new Date().toLocaleString()}
              readOnly
              className="h-9 text-sm font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Paste readings · one per line · "&lt;bssid&gt; &lt;rssi&gt; [ssid]"</Label>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"aa:bb:cc:dd:ee:ff -67 ksyk-staff\n11:22:33:44:55:66 -82 eduroam"}
            className={cn(
              "w-full text-xs font-mono p-2.5 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y h-24",
              darkMode ? "bg-gray-900" : "bg-white",
            )}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={parsePaste}
              disabled={!paste.trim()}
              className="h-8 text-xs gap-1"
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
              Parse
            </Button>
          </div>
        </div>

        {readings.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Parsed readings ({readings.length})</Label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {readings.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 text-xs">
                  <code className="font-mono text-blue-600 dark:text-blue-400 shrink-0">{r.bssid}</code>
                  <span className="text-gray-500 shrink-0 tabular-nums">{r.rssi} dBm</span>
                  {r.ssid && <span className="text-gray-700 dark:text-gray-300 truncate">{r.ssid}</span>}
                  <button
                    type="button"
                    onClick={() => removeReading(i)}
                    className="ml-auto text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            disabled={readings.length === 0 || submitting}
            onClick={submit}
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save position
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
