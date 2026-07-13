/**
 * KSYK Maps — three ambient easter eggs mounted once at the App root.
 *
 * All discoveries are gated by localStorage (one credit per browser),
 * hit /api/easter-eggs/found for the server counter, and pipe through
 * trackEasterEgg() for the client-side analytics stream. Design intent:
 * an ambient hook that never touches the DOM, never renders anything,
 * and works from any page without co-operation from that page.
 *
 * Egg 1 — ksykTyped: type "ksyk" anywhere. Debounced typing buffer that
 *         resets after 2 s of quiet or after any non-alpha key.
 *
 * Egg 2 — logoClicks: click any element that contains the literal text
 *         "KSYK Maps" ten times in a row within 8 s. Uses text-content
 *         probing because the Header component is off-limits to edit.
 *
 * Egg 3 — debugCombo: Ctrl+Shift+K then Ctrl+Shift+D within 3 s of each
 *         other. Fires trackFeature() for observability but doesn't
 *         change route — feels "professional" rather than confetti.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trackEasterEgg, trackFeature } from "@/lib/analytics";

const KEY = {
  typed: "ksyk_ksyk_typed_found",
  logo: "ksyk_logo_clicks_found",
  debug: "ksyk_debug_combo_found",
} as const;

function markAndReport(
  key: (typeof KEY)[keyof typeof KEY],
  eggId: string,
  serverEgg: string,
): boolean {
  if (localStorage.getItem(key) === "true") return false;
  localStorage.setItem(key, "true");
  trackEasterEgg(eggId);
  fetch("/api/easter-eggs/found", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      egg: serverEgg,
      userId: localStorage.getItem("ksyk_user_id") || "anonymous",
    }),
  }).catch(() => { /* silent */ });
  return true;
}

export function useKsykEasterEggs() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // ── Egg 1 — type "ksyk" ────────────────────────────────────────────
    let buf = "";
    let bufTimer: number | null = null;
    const resetBuf = () => { buf = ""; };
    const onKey = (e: KeyboardEvent) => {
      // Ignore typing while a form control has focus so it doesn't fight
      // legitimate input (e.g. someone with the surname "Ksykala").
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" ||
                t.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (!/^[a-z]$/.test(key)) { resetBuf(); return; }
      buf = (buf + key).slice(-4);
      if (bufTimer !== null) clearTimeout(bufTimer);
      bufTimer = window.setTimeout(resetBuf, 2000);
      if (buf === "ksyk") {
        resetBuf();
        if (markAndReport(KEY.typed, "ksyk-typed", "ksykTyped")) {
          setLocation("/secret-easter-egg");
        }
      }
    };
    window.addEventListener("keydown", onKey);

    // ── Egg 2 — 10 clicks on the "KSYK Maps" wordmark ─────────────────
    let clicks = 0;
    let clickTimer: number | null = null;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anc = target.closest("*") as HTMLElement | null;
      if (!anc) return;
      // Cheap contains-check on the nearest headline — restricts firing
      // to the app's KSYK wordmark without dragging in every random node.
      const text = (anc.textContent || "").trim();
      const isLogo = text === "KSYK Maps" || text === "KSYK MAPS";
      if (!isLogo) return;
      clicks += 1;
      if (clickTimer !== null) clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => { clicks = 0; }, 8000);
      if (clicks >= 10) {
        clicks = 0;
        if (markAndReport(KEY.logo, "logo-clicks", "logoClicks")) {
          setLocation("/dev-mode-secret");
        }
      }
    };
    window.addEventListener("click", onClick, true);

    // ── Egg 3 — Ctrl+Shift+K then Ctrl+Shift+D within 3 s ─────────────
    let comboStage = 0;
    let comboTimer: number | null = null;
    const resetCombo = () => { comboStage = 0; };
    const onCombo = (e: KeyboardEvent) => {
      const ctrlShift = e.ctrlKey && e.shiftKey;
      if (!ctrlShift) return;
      const k = e.key.toLowerCase();
      if (comboStage === 0 && k === "k") {
        comboStage = 1;
        if (comboTimer !== null) clearTimeout(comboTimer);
        comboTimer = window.setTimeout(resetCombo, 3000);
      } else if (comboStage === 1 && k === "d") {
        resetCombo();
        if (markAndReport(KEY.debug, "debug-combo", "debugCombo")) {
          trackFeature("easter_debug_combo_unlocked");
          // Non-destructive banner via the toast layer would be ideal, but
          // we don't want to pull that dependency in here. A short console
          // banner is enough — power-users will see it in devtools.
          try {
            // eslint-disable-next-line no-console
            console.log("%cKSYK debug combo unlocked ✅",
              "background:#2563eb;color:#fff;padding:4px 8px;border-radius:6px;font-weight:700");
          } catch { /* ignore */ }
        }
      }
    };
    window.addEventListener("keydown", onCombo);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onCombo);
      if (bufTimer !== null) clearTimeout(bufTimer);
      if (clickTimer !== null) clearTimeout(clickTimer);
      if (comboTimer !== null) clearTimeout(comboTimer);
    };
  }, [setLocation]);
}
