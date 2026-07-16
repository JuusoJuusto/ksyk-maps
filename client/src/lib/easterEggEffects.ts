/**
 * Reward effects for KSYK Maps easter eggs.
 *
 * All effects are zero-dep — no confetti/vfx library — and self-cleanup
 * after their run so nothing leaks between eggs. Every effect is safe
 * to call from any page; each one attaches to `document.body`, runs
 * its animation, then removes itself.
 */

/**
 * Confetti burst — colourful paper particles fall + fade.
 * @param opts.colors palette (defaults to rainbow).
 * @param opts.count  particle count (default 90).
 * @param opts.duration lifetime in ms (default 3000).
 */
export function confetti(opts: {
  colors?: string[];
  count?: number;
  duration?: number;
} = {}): void {
  const colors = opts.colors ?? [
    "#ef4444", "#f59e0b", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
  const count = opts.count ?? 90;
  const duration = opts.duration ?? 3000;

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
  document.body.appendChild(host);

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 8;
    const x = Math.random() * 100;
    const delay = Math.random() * 500;
    const rot = Math.random() * 720 - 360;
    const drift = (Math.random() - 0.5) * 40;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      position:absolute;top:-20px;left:${x}vw;
      width:${size}px;height:${size * 0.4}px;
      background:${color};
      border-radius:2px;
      opacity:0;
      transform:rotate(${rot}deg);
      animation:ksyk-egg-fall ${duration - delay}ms ${delay}ms cubic-bezier(.2,.5,.4,1) forwards;
      --drift:${drift}vw;
    `;
    host.appendChild(p);
  }

  ensureConfettiKeyframes();
  window.setTimeout(() => {
    host.remove();
  }, duration + 800);
}

/** Runs once — inserts the fall keyframe rule if it isn't already. */
let confettiKeyframesInstalled = false;
function ensureConfettiKeyframes(): void {
  if (confettiKeyframesInstalled) return;
  confettiKeyframesInstalled = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes ksyk-egg-fall {
      0%   { opacity:0; transform:translateY(0) translateX(0) rotate(0deg); }
      10%  { opacity:1; }
      100% { opacity:0; transform:translateY(110vh) translateX(var(--drift, 0)) rotate(720deg); }
    }
    @keyframes ksyk-egg-shake {
      0%,100% { transform:translateX(0); }
      25%     { transform:translateX(-4px) rotate(-1deg); }
      75%     { transform:translateX(4px) rotate(1deg); }
    }
    @keyframes ksyk-egg-spin360 {
      0%   { transform:rotate(0deg); }
      100% { transform:rotate(360deg); }
    }
  `;
  document.head.appendChild(s);
}

/**
 * CRT retro theme burst — green-on-black overlay for `durationMs`.
 * Non-invasive: applies a top-layer div with mix-blend so the app
 * underneath still works but is tinted.
 */
export function crtBurst(durationMs = 15_000): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:2147483646;
    background:
      linear-gradient(rgba(20,190,80,0.16),rgba(20,190,80,0.16)),
      repeating-linear-gradient(0deg, rgba(0,0,0,0.35), rgba(0,0,0,0.35) 2px, transparent 2px, transparent 4px);
    mix-blend-mode:screen;
    animation:ksyk-egg-shake 260ms infinite;
    transition:opacity 800ms ease;
  `;
  document.body.appendChild(overlay);
  ensureConfettiKeyframes();

  const banner = document.createElement("div");
  banner.textContent = "▓▒░ 1985 SYSTEM ONLINE  · KSYK MAPS TERMINAL v1.0 ░▒▓";
  banner.style.cssText = `
    position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;
    font-family:'Courier New',monospace;font-weight:700;letter-spacing:2px;
    color:#8ffca8;text-shadow:0 0 6px #22c55e;
    padding:6px 14px;background:rgba(0,0,0,.75);border:1px solid #22c55e;border-radius:2px;
    pointer-events:none;
  `;
  document.body.appendChild(banner);

  window.setTimeout(() => {
    overlay.style.opacity = "0";
    banner.style.opacity = "0";
    window.setTimeout(() => { overlay.remove(); banner.remove(); }, 900);
  }, durationMs);
}

/**
 * Barrel roll — rotates the entire viewport 360° over 1.5s.
 */
export function barrelRoll(durationMs = 1500): void {
  ensureConfettiKeyframes();
  const target = document.getElementById("root") ?? document.body;
  const prevTransform = target.style.transform;
  const prevOrigin = target.style.transformOrigin;
  target.style.transformOrigin = "center center";
  target.style.animation = `ksyk-egg-spin360 ${durationMs}ms cubic-bezier(.5,0,.2,1)`;
  const onEnd = () => {
    target.style.animation = "";
    target.style.transform = prevTransform;
    target.style.transformOrigin = prevOrigin;
    target.removeEventListener("animationend", onEnd);
  };
  target.addEventListener("animationend", onEnd);
}

/**
 * Toast — small ephemeral message for confirming a hidden discovery.
 */
export function eggToast(message: string, opts: { emoji?: string; ms?: number } = {}): void {
  const el = document.createElement("div");
  const emoji = opts.emoji ?? "🥚";
  el.innerHTML = `<span style="font-size:16px;margin-right:8px">${emoji}</span>${escapeHtml(message)}`;
  el.style.cssText = `
    position:fixed;top:24px;right:24px;z-index:2147483647;
    background:linear-gradient(135deg,#1e40af,#7c3aed);color:#fff;
    padding:10px 16px;border-radius:12px;font-weight:600;font-size:13px;
    box-shadow:0 10px 30px rgba(0,0,0,.25);
    transform:translateY(-20px);opacity:0;transition:all 300ms cubic-bezier(.16,1,.3,1);
    pointer-events:none;
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = "translateY(0)";
    el.style.opacity = "1";
  });
  window.setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-20px)";
    window.setTimeout(() => el.remove(), 400);
  }, opts.ms ?? 3000);
}

function escapeHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
