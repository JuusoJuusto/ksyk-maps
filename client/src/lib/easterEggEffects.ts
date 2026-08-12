/**
 * Reward effects for KSYK Maps easter eggs.
 *
 * All effects are zero-dep — no confetti/vfx library — and self-cleanup
 * after their run so nothing leaks between eggs. Every effect is safe
 * to call from any page; each one attaches to `document.body`, runs
 * its animation, then removes itself.
 */

// ── Keyframe manager ─────────────────────────────────────────────

let _keyframesInstalled = false;
function ensureKeyframes(): void {
  if (_keyframesInstalled) return;
  _keyframesInstalled = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes ksyk-fall {
      0%   { opacity:0; transform:translateY(0) translateX(0) rotate(0deg); }
      10%  { opacity:1; }
      100% { opacity:0; transform:translateY(110vh) translateX(var(--drift,0)) rotate(720deg); }
    }
    @keyframes ksyk-snow {
      0%   { opacity:0; transform:translateY(-10px) translateX(0); }
      10%  { opacity:0.85; }
      100% { opacity:0; transform:translateY(110vh) translateX(var(--drift,0)); }
    }
    @keyframes ksyk-shake {
      0%,100% { transform:translateX(0); }
      25%     { transform:translateX(-4px) rotate(-1deg); }
      75%     { transform:translateX(4px) rotate(1deg); }
    }
    @keyframes ksyk-spin360 {
      0%   { transform:rotate(0deg); }
      100% { transform:rotate(360deg); }
    }
    @keyframes ksyk-ach-backdrop-in  { from { opacity:0 } to { opacity:1 } }
    @keyframes ksyk-ach-backdrop-out { from { opacity:1 } to { opacity:0 } }
    @keyframes ksyk-ach-card-in {
      from { opacity:0; transform:scale(0.82) translateY(28px); }
      to   { opacity:1; transform:scale(1)    translateY(0); }
    }
    @keyframes ksyk-ach-icon-bounce {
      from { transform:scale(0) rotate(-20deg); }
      60%  { transform:scale(1.25) rotate(6deg); }
      to   { transform:scale(1) rotate(0deg); }
    }
    @keyframes ksyk-toast-in {
      from { opacity:0; transform:translateY(-16px) scale(0.92); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes ksyk-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
  `;
  document.head.appendChild(s);
}

// ── Confetti ──────────────────────────────────────────────────────

export function confetti(opts: {
  colors?: string[];
  count?: number;
  duration?: number;
} = {}): void {
  const colors = opts.colors ?? [
    "#ef4444", "#f59e0b", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
  const count    = opts.count    ?? 90;
  const duration = opts.duration ?? 3000;

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
  document.body.appendChild(host);

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size  = 5 + Math.random() * 10;
    const x     = Math.random() * 100;
    const delay = Math.random() * 600;
    const drift = (Math.random() - 0.5) * 50;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = Math.random() > 0.5 ? "2px" : "50%";
    p.style.cssText = `
      position:absolute;top:-20px;left:${x}vw;
      width:${size}px;height:${size * (Math.random() > 0.5 ? 0.4 : 1)}px;
      background:${color};border-radius:${shape};opacity:0;
      animation:ksyk-fall ${duration - delay}ms ${delay}ms cubic-bezier(.2,.5,.4,1) forwards;
      --drift:${drift}vw;
    `;
    host.appendChild(p);
  }

  ensureKeyframes();
  setTimeout(() => host.remove(), duration + 900);
}

// ── Snowfall ──────────────────────────────────────────────────────

export function snowfall(durationMs = 5500): void {
  ensureKeyframes();
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
  document.body.appendChild(host);

  for (let i = 0; i < 120; i++) {
    const p = document.createElement("div");
    const size  = 4 + Math.random() * 10;
    const x     = Math.random() * 100;
    const delay = Math.random() * 3000;
    const spd   = 4000 + Math.random() * 4000;
    const drift = (Math.random() - 0.5) * 20;
    p.style.cssText = `
      position:absolute;top:-12px;left:${x}vw;
      width:${size}px;height:${size}px;
      background:white;border-radius:50%;
      box-shadow:0 0 ${size}px rgba(186,230,253,0.9);
      opacity:0;
      animation:ksyk-snow ${spd}ms ${delay}ms linear forwards;
      --drift:${drift}vw;
    `;
    host.appendChild(p);
  }
  setTimeout(() => host.remove(), durationMs + 3200);
}

// ── Matrix rain ───────────────────────────────────────────────────

export function matrixRain(durationMs = 8000): void {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:2147483646;
    opacity:0;transition:opacity 500ms;
  `;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx  = canvas.getContext("2d")!;
  const cols = Math.floor(canvas.width / 16);
  const drops: number[] = Array.from({ length: cols }, () => Math.random() * -20);
  const chars = "KSYK01アイウエカキサシタチ01230101";

  let running = true;
  let frame: number;
  const draw = () => {
    if (!running) return;
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 14px monospace";
    for (let i = 0; i < drops.length; i++) {
      const bright = Math.random() > 0.96;
      ctx.fillStyle = bright ? "#afffb0" : "#0f9";
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * 16, drops[i] * 16);
      if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 0.6;
    }
    frame = requestAnimationFrame(draw);
  };

  requestAnimationFrame(() => {
    canvas.style.opacity = "0.88";
    draw();
  });

  setTimeout(() => {
    running = false;
    cancelAnimationFrame(frame);
    canvas.style.opacity = "0";
    setTimeout(() => canvas.remove(), 600);
  }, durationMs);
}

// ── CRT retro theme ───────────────────────────────────────────────

export function crtBurst(durationMs = 15_000): void {
  ensureKeyframes();
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:2147483646;
    background:
      linear-gradient(rgba(20,190,80,0.16),rgba(20,190,80,0.16)),
      repeating-linear-gradient(0deg,rgba(0,0,0,0.35),rgba(0,0,0,0.35) 2px,transparent 2px,transparent 4px);
    mix-blend-mode:screen;
    animation:ksyk-shake 260ms infinite;
    transition:opacity 800ms ease;
  `;
  document.body.appendChild(overlay);

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

  setTimeout(() => {
    overlay.style.opacity = "0";
    banner.style.opacity = "0";
    setTimeout(() => { overlay.remove(); banner.remove(); }, 900);
  }, durationMs);
}

// ── Barrel roll ───────────────────────────────────────────────────

export function barrelRoll(durationMs = 1500): void {
  ensureKeyframes();
  const target = document.getElementById("root") ?? document.body;
  const prev = target.style.animation;
  target.style.transformOrigin = "center center";
  target.style.animation = `ksyk-spin360 ${durationMs}ms cubic-bezier(.5,0,.2,1)`;
  const onEnd = () => {
    target.style.animation = prev;
    target.removeEventListener("animationend", onEnd);
  };
  target.addEventListener("animationend", onEnd);
}

// ── Achievement card (rare+ eggs) ────────────────────────────────

type AchievementRarity = "common" | "rare" | "epic" | "legendary";

const RARITY_CFG: Record<AchievementRarity, {
  label: string; color: string; bg: string; glow: string; header: string;
}> = {
  common:    { label: "COMMON",    color: "#60a5fa", bg: "rgba(59,130,246,0.12)",  glow: "0 0 24px rgba(59,130,246,0.35)",  header: "✨ ACHIEVEMENT UNLOCKED" },
  rare:      { label: "RARE",      color: "#34d399", bg: "rgba(16,185,129,0.12)",  glow: "0 0 24px rgba(16,185,129,0.35)",  header: "💎 RARE ACHIEVEMENT" },
  epic:      { label: "EPIC",      color: "#a78bfa", bg: "rgba(139,92,246,0.12)",  glow: "0 0 32px rgba(139,92,246,0.45)",  header: "⚡ EPIC ACHIEVEMENT" },
  legendary: { label: "LEGENDARY", color: "#fbbf24", bg: "rgba(245,158,11,0.12)", glow: "0 0 40px rgba(245,158,11,0.55)",  header: "🏆 LEGENDARY ACHIEVEMENT" },
};

export function achievementCard(opts: {
  emoji: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  reward: string;
  ms?: number;
}): void {
  const { emoji, name, description, rarity, reward, ms = 5500 } = opts;
  const cfg = RARITY_CFG[rarity];
  ensureKeyframes();

  const backdrop = document.createElement("div");
  backdrop.style.cssText = `
    position:fixed;inset:0;z-index:2147483647;
    display:flex;align-items:center;justify-content:center;
    background:rgba(4,6,16,0.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
    animation:ksyk-ach-backdrop-in 220ms ease forwards;
    cursor:pointer;
  `;

  const card = document.createElement("div");
  const isLegendary = rarity === "legendary";
  card.style.cssText = `
    background:rgba(8,10,22,0.94);
    border:1.5px solid ${cfg.color}50;
    border-radius:22px;
    padding:32px 36px 24px;
    text-align:center;
    max-width:340px;width:88%;
    box-shadow:${cfg.glow},0 32px 72px rgba(0,0,0,0.7);
    animation:ksyk-ach-card-in 420ms cubic-bezier(.16,1,.3,1) forwards;
    pointer-events:none;
    font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
    position:relative;overflow:hidden;
    ${isLegendary ? `
      background:linear-gradient(rgba(8,10,22,0.94),rgba(8,10,22,0.94)),
        linear-gradient(135deg,#fbbf2440,#f59e0b40,#fbbf2440);
    ` : ""}
  `;

  if (isLegendary) {
    const shine = document.createElement("div");
    shine.style.cssText = `
      position:absolute;inset:0;border-radius:22px;pointer-events:none;
      background:linear-gradient(105deg,transparent 40%,rgba(251,191,36,0.08) 50%,transparent 60%);
      background-size:200% auto;
      animation:ksyk-shimmer 2.5s linear infinite;
    `;
    card.appendChild(shine);
  }

  const header = document.createElement("div");
  header.textContent = cfg.header;
  header.style.cssText = `
    font-size:10px;font-weight:800;letter-spacing:2.5px;
    color:${cfg.color};text-transform:uppercase;
    margin-bottom:18px;opacity:0.9;
  `;

  const iconWrap = document.createElement("div");
  iconWrap.style.cssText = `margin-bottom:14px;`;
  const iconEl = document.createElement("div");
  iconEl.textContent = emoji;
  iconEl.style.cssText = `
    font-size:56px;line-height:1;
    filter:drop-shadow(0 6px 16px ${cfg.color}70);
    animation:ksyk-ach-icon-bounce 550ms 140ms cubic-bezier(.16,1,.3,1) both;
    display:inline-block;
  `;
  iconWrap.appendChild(iconEl);

  const nameEl = document.createElement("div");
  nameEl.textContent = name;
  nameEl.style.cssText = `
    font-size:20px;font-weight:700;
    color:#f1f5f9;letter-spacing:-0.4px;margin-bottom:4px;
  `;

  const descEl = document.createElement("div");
  descEl.textContent = description;
  descEl.style.cssText = `
    font-size:12px;color:#64748b;margin-bottom:10px;
  `;

  const badge = document.createElement("div");
  badge.textContent = cfg.label;
  badge.style.cssText = `
    display:inline-block;
    font-size:9px;font-weight:800;letter-spacing:2.5px;
    color:${cfg.color};
    background:${cfg.bg};
    border:1px solid ${cfg.color}55;
    border-radius:100px;padding:3px 10px;
    margin-bottom:14px;
  `;

  const rewardEl = document.createElement("div");
  rewardEl.textContent = `🎁 ${reward}`;
  rewardEl.style.cssText = `
    font-size:12.5px;color:#94a3b8;line-height:1.5;
    margin-bottom:18px;
    background:rgba(255,255,255,0.03);
    border:1px solid rgba(255,255,255,0.06);
    border-radius:10px;padding:8px 12px;
  `;

  const hint = document.createElement("div");
  hint.textContent = "Tap anywhere to dismiss";
  hint.style.cssText = `font-size:10px;color:#334155;`;

  card.append(header, iconWrap, nameEl, descEl, badge, rewardEl, hint);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  const dismiss = () => {
    backdrop.style.animation = "ksyk-ach-backdrop-out 200ms ease forwards";
    setTimeout(() => backdrop.remove(), 250);
  };
  backdrop.addEventListener("click", dismiss);
  setTimeout(dismiss, ms);
}

// ── Toast (common discoveries & quick notifications) ──────────────

export function eggToast(message: string, opts: { emoji?: string; ms?: number } = {}): void {
  ensureKeyframes();
  const el = document.createElement("div");
  const emoji = opts.emoji ?? "🥚";
  el.innerHTML = `<span style="font-size:18px;line-height:1;margin-right:10px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</span><span style="flex:1">${escapeHtml(message)}</span>`;
  el.style.cssText = `
    position:fixed;top:20px;right:20px;z-index:2147483647;
    background:linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,27,75,0.96));
    color:#e2e8f0;
    padding:12px 18px;border-radius:14px;
    font-size:13px;font-weight:600;
    font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
    box-shadow:0 12px 36px rgba(0,0,0,0.4),0 0 0 1px rgba(139,92,246,0.3);
    display:flex;align-items:center;gap:0;
    animation:ksyk-toast-in 280ms cubic-bezier(.16,1,.3,1) forwards;
    pointer-events:none;
    max-width:280px;
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 300ms,transform 300ms";
    el.style.opacity = "0";
    el.style.transform = "translateY(-12px) scale(0.92)";
    setTimeout(() => el.remove(), 350);
  }, opts.ms ?? 3000);
}

function escapeHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
