/**
 * Wilma iCalendar connection setup panel.
 *
 * Shows step-by-step instructions (FI/EN), URL input, validation,
 * and troubleshooting guidance. The URL is stored ONLY in localStorage
 * — never sent to analytics or logged.
 */

import { useState } from "react";
import {
  getStoredUrl,
  setStoredUrl,
  clearStoredUrl,
  clearCache,
  syncCalendar,
  type SyncResult,
} from "@/lib/wilmaCalendar";

interface Props {
  onConnected?: (result: SyncResult) => void;
  onDisconnected?: () => void;
}

export default function WilmaConnectPanel({ onConnected, onDisconnected }: Props) {
  const [url, setUrl] = useState(getStoredUrl() ?? "");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SyncResult | null>(null);
  const [showInstructions, setShowInstructions] = useState(!getStoredUrl());
  const connected = !!getStoredUrl() && !error;

  async function handleConnect() {
    const trimmed = url.trim();
    if (!trimmed) { setError("Please paste your Wilma iCalendar URL."); return; }
    if (!trimmed.startsWith("http")) { setError("The URL should start with https://"); return; }
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await syncCalendar(trimmed);
      setStoredUrl(trimmed);
      setSuccess(result);
      onConnected?.(result);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setSyncing(false);
    }
  }

  function handleDisconnect() {
    clearStoredUrl();
    clearCache();
    setUrl("");
    setSuccess(null);
    setError(null);
    setShowInstructions(true);
    onDisconnected?.();
  }

  async function handleRefresh() {
    setSyncing(true);
    setError(null);
    try {
      clearCache();
      const result = await syncCalendar();
      setSuccess(result);
      onConnected?.(result);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-base leading-tight">Connect Wilma Schedule</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Import your timetable directly from Wilma — no password needed
          </p>
        </div>
      </div>

      {/* Already connected status */}
      {connected && !error && success && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Calendar connected
          </div>
          <p className="text-xs text-slate-400">
            {success.stats.total} events imported · {success.stats.matched} rooms matched
            {success.stats.unmatched > 0 && ` · ${success.stats.unmatched} rooms not found`}
          </p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleRefresh}
              disabled={syncing}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              {syncing ? "Refreshing…" : "Refresh now"}
            </button>
            <button
              onClick={handleDisconnect}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Instructions toggle */}
      {showInstructions && (
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 text-sm flex flex-col gap-3">
          <p className="font-semibold text-slate-200">How to find your iCalendar URL in Wilma</p>

          <div className="text-slate-300 flex flex-col gap-1.5">
            <p className="font-medium text-slate-400 text-xs uppercase tracking-wide">English</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
              <li>Log in to Wilma (<span className="font-mono text-blue-400">ksyk.inschool.fi</span>)</li>
              <li>Click your name or profile icon (top-right corner)</li>
              <li>Go to <span className="font-semibold">Timetable</span></li>
              <li>Look for a calendar icon or <span className="font-semibold">Subscribe to calendar / iCal</span> link</li>
              <li>Copy the URL that starts with <span className="font-mono text-blue-400">https://</span></li>
              <li>Paste it below</li>
            </ol>
          </div>

          <div className="text-slate-300 flex flex-col gap-1.5 pt-1 border-t border-slate-700">
            <p className="font-medium text-slate-400 text-xs uppercase tracking-wide">Suomi</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
              <li>Kirjaudu Wilmaan (<span className="font-mono text-blue-400">ksyk.inschool.fi</span>)</li>
              <li>Klikkaa nimeäsi tai profiili-kuvaketta (oikeassa yläkulmassa)</li>
              <li>Siirry <span className="font-semibold">Lukujärjestys</span>-osioon</li>
              <li>Etsi kalenterikuvake tai <span className="font-semibold">Tilaa kalenteri / iCal</span> -linkki</li>
              <li>Kopioi URL, joka alkaa <span className="font-mono text-blue-400">https://</span></li>
              <li>Liitä se alle</li>
            </ol>
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300">
            <span className="font-semibold">Note:</span> The URL is personal — treat it like a password.
            KSYK Maps stores it only in your browser, never on a server.
          </div>
        </div>
      )}

      {/* URL input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Wilma iCalendar URL
        </label>
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleConnect()}
          placeholder="https://ksyk.inschool.fi/...?ical=..."
          className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2.5 text-sm
                     placeholder:text-slate-500 focus:outline-none focus:border-blue-500
                     font-mono text-blue-300 disabled:opacity-50"
          disabled={syncing}
          autoComplete="off"
          spellCheck={false}
        />
        {!showInstructions && (
          <button
            className="text-left text-xs text-blue-400 hover:text-blue-300 underline"
            onClick={() => setShowInstructions(true)}
          >
            Where do I find this URL?
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 flex flex-col gap-2">
          <div className="font-medium">{error}</div>
          <div className="text-xs text-slate-400 flex flex-col gap-1">
            <p className="font-semibold text-slate-300">Troubleshooting:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Make sure the URL starts with <span className="font-mono">https://</span></li>
              <li>The URL may have expired — generate a new one in Wilma</li>
              <li>Check your school network or VPN if using a corporate URL</li>
              <li>Try opening the URL in a browser first to confirm it works</li>
              <li>Make sure you copied the full URL (no line breaks)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Connect button */}
      {(!connected || error) && (
        <button
          onClick={handleConnect}
          disabled={syncing || !url.trim()}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                     text-sm font-semibold transition-colors"
        >
          {syncing ? "Connecting…" : connected ? "Reconnect" : "Connect calendar"}
        </button>
      )}

      {/* Privacy note */}
      <p className="text-xs text-slate-500 text-center">
        Your calendar URL is stored only in this browser. It is never shared or logged.
      </p>
    </div>
  );
}
