/**
 * KSYK Maps — ambient easter egg watcher.
 *
 * Mounted once at the App root. Listens for triggers on window/document
 * and, when one fires, gates the discovery via localStorage (one credit
 * per browser), reports it to the server counter (POST /api/easter-eggs/found
 * — the server aliases that to /track), and runs a reward effect from
 * `easterEggEffects`.
 *
 * Registry-driven: adding a new trigger only needs a new EGG id in
 * `easterEggRegistry` and a matching `whenX` inside this hook.
 *
 * Eggs handled here (all wired to the same registry):
 *   - ksyk-typed   → route to /secret-easter-egg (unchanged)
 *   - sisu-typed   → blue/white Finnish flag confetti + toast
 *   - party-typed  → rainbow confetti + toast
 *   - retro-crt    → 15s CRT overlay ("retro" or "1985")
 *   - barrel-roll  → 360° spin
 *   - konami       → CRT overlay + toast (unified with 8-bit tribute)
 *   - logo-clicks  → route to /dev-mode-secret (unchanged)
 *   - debug-combo  → console banner (unchanged)
 *   - zoom-lord    → detection lives in KSYKMapView; here we just
 *                    listen for a custom event dispatch.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trackEasterEgg, trackFeature } from "@/lib/analytics";
import { eggLocalKey, EASTER_EGGS, EGG_RESET_EPOCH, resetLocalEggFlags } from "@/lib/easterEggRegistry";
import { barrelRoll, confetti, crtBurst, eggToast } from "@/lib/easterEggEffects";

const FINNISH_COLORS = ["#003580", "#003580", "#ffffff", "#e5edff"];
const RETRO_COLORS = ["#22c55e", "#84cc16", "#4ade80"];

/** Mark an egg as found + report + return true if it was NEW to this
 *  browser (so callers can trigger their reward). */
function markAndReport(id: string): boolean {
  const key = eggLocalKey(id);
  if (localStorage.getItem(key) === "true") return false;
  localStorage.setItem(key, "true");
  trackEasterEgg(id);
  fetch("/api/easter-eggs/found", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      egg: id,
      userId: localStorage.getItem("ksyk_user_id") || "anonymous",
    }),
  }).catch(() => { /* silent */ });

  // Meta-egg: once every other egg is found, unlock full-hunter.
  const allExceptFull = EASTER_EGGS.filter((e) => e.id !== "full-hunter");
  const foundOthers = allExceptFull.every((e) => localStorage.getItem(eggLocalKey(e.id)) === "true");
  if (foundOthers && localStorage.getItem(eggLocalKey("full-hunter")) !== "true") {
    localStorage.setItem(eggLocalKey("full-hunter"), "true");
    trackEasterEgg("full-hunter");
    fetch("/api/easter-eggs/found", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ egg: "full-hunter" }),
    }).catch(() => {});
    eggToast("Full Hunter! Every egg found.", { emoji: "🏆", ms: 5000 });
    confetti({ count: 180, duration: 4500 });
  }
  return true;
}

export function useKsykEasterEggs() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // ── Reset epoch — if the user's local epoch is older than the
    //    registry's, wipe every per-browser "found" flag. That's the
    //    "reset the counter now" behaviour: bump EGG_RESET_EPOCH and
    //    everyone gets a fresh hunt on their next page load.
    try {
      const seen = localStorage.getItem("ksyk_egg_reset_epoch");
      if (seen !== EGG_RESET_EPOCH) {
        resetLocalEggFlags();
        localStorage.setItem("ksyk_egg_reset_epoch", EGG_RESET_EPOCH);
      }
    } catch {
      // localStorage denied (private mode / quota) — ignore.
    }

    // ── Type-word watcher ────────────────────────────────────────────
    // Single rolling buffer of the last N alphanumeric keys. Fires when
    // any egg trigger word is found as a suffix. Reset on any non-alnum
    // key or after 2 s of quiet.
    const TRIGGERS: Array<{ word: string; onFound: () => void }> = [
      {
        word: "ksyk",
        onFound: () => {
          if (markAndReport("ksyk-typed")) setLocation("/secret-easter-egg");
        },
      },
      {
        word: "sisu",
        onFound: () => {
          if (markAndReport("sisu-typed")) {
            confetti({ colors: FINNISH_COLORS, count: 120, duration: 3500 });
            eggToast("Sisu! Finnish grit unlocked.", { emoji: "🇫🇮" });
          }
        },
      },
      {
        word: "party",
        onFound: () => {
          if (markAndReport("party-typed")) {
            confetti({ count: 160, duration: 4000 });
            eggToast("Party mode!", { emoji: "🎉" });
          }
        },
      },
      {
        word: "barrel",
        onFound: () => {
          if (markAndReport("barrel-roll")) {
            barrelRoll();
            eggToast("Barrel roll!", { emoji: "🌀" });
          }
        },
      },
      {
        word: "retro",
        onFound: () => {
          if (markAndReport("retro-crt")) {
            crtBurst(15_000);
            confetti({ colors: RETRO_COLORS, count: 40, duration: 1500 });
            eggToast("1985 system online.", { emoji: "📼" });
          }
        },
      },
      {
        word: "1985",
        onFound: () => {
          if (markAndReport("retro-crt")) {
            crtBurst(15_000);
            eggToast("1985 system online.", { emoji: "📼" });
          }
        },
      },
    ];
    const maxLen = TRIGGERS.reduce((n, t) => Math.max(n, t.word.length), 0);
    let buf = "";
    let bufTimer: number | null = null;
    const resetBuf = () => { buf = ""; };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (!/^[a-z0-9]$/.test(k)) { resetBuf(); return; }
      buf = (buf + k).slice(-maxLen);
      if (bufTimer !== null) clearTimeout(bufTimer);
      bufTimer = window.setTimeout(resetBuf, 2000);
      for (const trig of TRIGGERS) {
        if (buf.endsWith(trig.word)) {
          resetBuf();
          trig.onFound();
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);

    // ── Egg — 10 clicks on the "KSYK Maps" wordmark ──────────────────
    let clicks = 0;
    let clickTimer: number | null = null;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anc = target.closest("*") as HTMLElement | null;
      if (!anc) return;
      const text = (anc.textContent || "").trim();
      const isLogo = text === "KSYK Maps" || text === "KSYK MAPS";
      if (!isLogo) return;
      clicks += 1;
      if (clickTimer !== null) clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => { clicks = 0; }, 8000);
      if (clicks >= 10) {
        clicks = 0;
        if (markAndReport("logo-clicks")) {
          eggToast("Dev Mode unlocked.", { emoji: "🛠️" });
          setLocation("/dev-mode-secret");
        }
      }
    };
    window.addEventListener("click", onClick, true);

    // ── Egg — Ctrl+Shift+K then Ctrl+Shift+D within 3 s ──────────────
    let comboStage = 0;
    let comboTimer: number | null = null;
    const resetCombo = () => { comboStage = 0; };
    const onDebugCombo = (e: KeyboardEvent) => {
      const ctrlShift = e.ctrlKey && e.shiftKey;
      if (!ctrlShift) return;
      const k = e.key.toLowerCase();
      if (comboStage === 0 && k === "k") {
        comboStage = 1;
        if (comboTimer !== null) clearTimeout(comboTimer);
        comboTimer = window.setTimeout(resetCombo, 3000);
      } else if (comboStage === 1 && k === "d") {
        resetCombo();
        if (markAndReport("debug-combo")) {
          trackFeature("easter_debug_combo_unlocked");
          eggToast("Debug combo unlocked.", { emoji: "🐛" });
          try {
            // eslint-disable-next-line no-console
            console.log("%cKSYK debug combo unlocked ✅",
              "background:#2563eb;color:#fff;padding:4px 8px;border-radius:6px;font-weight:700");
          } catch { /* ignore */ }
        }
      }
    };
    window.addEventListener("keydown", onDebugCombo);

    // ── Egg — Konami: ↑↑↓↓←→←→BA ─────────────────────────────────────
    const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
    let konamiPos = 0;
    let konamiTimer: number | null = null;
    const resetKonami = () => { konamiPos = 0; };
    const onKonami = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === KONAMI[konamiPos]) {
        konamiPos += 1;
        if (konamiTimer !== null) clearTimeout(konamiTimer);
        konamiTimer = window.setTimeout(resetKonami, 4000);
        if (konamiPos === KONAMI.length) {
          resetKonami();
          if (markAndReport("konami")) {
            eggToast("Konami code! +30 lives.", { emoji: "🎮" });
            crtBurst(8000);
          }
        }
      } else {
        resetKonami();
      }
    };
    window.addEventListener("keydown", onKonami);

    // ── Mobile-friendly triggers ─────────────────────────────────────
    // Keyboard-only eggs are invisible on touch devices. These three
    // gestures cover mobile parity:
    //
    //  - 6 rapid taps anywhere in the KSYK Maps wordmark (mirrors the
    //    10-click logo egg but with a lower threshold for touch UX).
    //  - Device shake (via DeviceMotion). Fires the "sisu" egg.
    //  - 5-finger touch. Fires the "party" egg.

    let mobileTapStreak = 0;
    let mobileTapTimer: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      // 5-finger touch → party
      if (e.touches.length >= 5) {
        if (markAndReport("party-typed")) {
          confetti({ count: 160, duration: 4000 });
          eggToast("Party mode!", { emoji: "🎉" });
        }
        return;
      }
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anc = target.closest("*") as HTMLElement | null;
      const text = (anc?.textContent ?? "").trim();
      if (text === "KSYK Maps" || text === "KSYK MAPS") {
        mobileTapStreak += 1;
        if (mobileTapTimer !== null) clearTimeout(mobileTapTimer);
        mobileTapTimer = window.setTimeout(() => { mobileTapStreak = 0; }, 4000);
        if (mobileTapStreak >= 6) {
          mobileTapStreak = 0;
          if (markAndReport("logo-clicks")) {
            eggToast("Dev Mode unlocked.", { emoji: "🛠️" });
            setLocation("/dev-mode-secret");
          }
        }
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    // Device motion / shake → sisu. Threshold tuned for a firm shake,
    // not a walk. Detects a peak acceleration on any axis > 25 m/s².
    let lastShakeAt = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      const now = Date.now();
      if (mag > 25 && now - lastShakeAt > 1500) {
        lastShakeAt = now;
        if (markAndReport("sisu-typed")) {
          confetti({ colors: FINNISH_COLORS, count: 120, duration: 3500 });
          eggToast("Sisu! Finnish grit unlocked.", { emoji: "🇫🇮" });
        }
      }
    };
    // iOS 13+ needs an explicit permission prompt to enable DeviceMotion,
    // triggered by a user gesture. We ask on the first tap.
    const askMotionPermission = () => {
      const ctor = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> });
      if (typeof ctor.requestPermission === "function") {
        ctor.requestPermission().then((state) => {
          if (state === "granted") {
            window.addEventListener("devicemotion", onMotion);
          }
        }).catch(() => { /* denied — silent */ });
      } else {
        window.addEventListener("devicemotion", onMotion);
      }
      window.removeEventListener("touchstart", askMotionPermission);
    };
    window.addEventListener("touchstart", askMotionPermission, { once: true, passive: true });

    // ── Egg — Zoom Lord (10 zoom-ins in a row) ───────────────────────
    // The zoom-in button dispatches a custom "ksyk:zoomin" event so we
    // don't couple this hook to MapLibre. See KSYKMapView.tsx.
    let zoomStreak = 0;
    let zoomTimer: number | null = null;
    const onZoomIn = () => {
      zoomStreak += 1;
      if (zoomTimer !== null) clearTimeout(zoomTimer);
      zoomTimer = window.setTimeout(() => { zoomStreak = 0; }, 3000);
      if (zoomStreak >= 10) {
        zoomStreak = 0;
        if (markAndReport("zoom-lord")) {
          eggToast("Zoom Lord!", { emoji: "🔎" });
          confetti({ count: 60, duration: 2500 });
        }
      }
    };
    window.addEventListener("ksyk:zoomin", onZoomIn as EventListener);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onDebugCombo);
      window.removeEventListener("keydown", onKonami);
      window.removeEventListener("ksyk:zoomin", onZoomIn as EventListener);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("devicemotion", onMotion);
      window.removeEventListener("touchstart", askMotionPermission);
      if (bufTimer !== null) clearTimeout(bufTimer);
      if (clickTimer !== null) clearTimeout(clickTimer);
      if (comboTimer !== null) clearTimeout(comboTimer);
      if (konamiTimer !== null) clearTimeout(konamiTimer);
      if (zoomTimer !== null) clearTimeout(zoomTimer);
      if (mobileTapTimer !== null) clearTimeout(mobileTapTimer);
    };
  }, [setLocation]);
}
