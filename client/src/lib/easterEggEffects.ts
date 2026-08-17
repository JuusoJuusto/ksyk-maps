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

  ensureKeyframes();
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

// ── Fireworks ─────────────────────────────────────────────────────

export function fireworks(durationMs = 6000): void {
  ensureKeyframes();
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ksyk-fw-particle {
      0%   { transform:translate(0,0) scale(1); opacity:1; }
      100% { transform:translate(var(--dx),var(--dy)) scale(0); opacity:0; }
    }
    @keyframes ksyk-fw-trail {
      0%   { opacity:1; transform:scaleY(1); }
      100% { opacity:0; transform:scaleY(0); }
    }
  `;
  document.head.appendChild(style);

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
  document.body.appendChild(host);

  const COLORS = ["#ff6b6b","#ffd700","#4ecdc4","#45b7d1","#ff9f43","#a29bfe","#fd79a8","#00cec9","#6c5ce7","#ffeaa7"];

  const burst = (xPct: number, yPct: number) => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const n = 20 + Math.floor(Math.random() * 14);
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      const angle = (i / n) * Math.PI * 2;
      const dist = 55 + Math.random() * 90;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const size = 4 + Math.random() * 7;
      const dur = 550 + Math.random() * 500;
      const shape = Math.random() > 0.4 ? "50%" : "2px";
      p.style.cssText = `
        position:absolute;left:${xPct}%;top:${yPct}%;
        width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 0.35)}px;
        background:${color};border-radius:${shape};
        animation:ksyk-fw-particle ${dur}ms cubic-bezier(.2,.8,.4,1) forwards;
        --dx:${dx}px;--dy:${dy}px;
        box-shadow:0 0 ${size + 2}px ${color};
      `;
      host.appendChild(p);
    }
  };

  let count = 0;
  const maxBursts = Math.ceil(durationMs / 450);
  const timer = setInterval(() => {
    if (count >= maxBursts) return;
    const x = 10 + Math.random() * 80;
    const y = 8 + Math.random() * 65;
    burst(x, y);
    if (Math.random() > 0.55) setTimeout(() => burst(x + (Math.random()-0.5)*12, y + (Math.random()-0.5)*12), 120);
    count++;
  }, 420);

  setTimeout(() => { clearInterval(timer); style.remove(); host.remove(); }, durationMs + 1200);
}

// ── Pizza rain ────────────────────────────────────────────────────

export function pizzaRain(durationMs = 5000): void {
  ensureKeyframes();
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
  document.body.appendChild(host);
  const PIZZAS = ["🍕","🍕","🍕","🧀","🍅","🌶️","🍕"];
  for (let i = 0; i < 55; i++) {
    const p = document.createElement("div");
    const size = 22 + Math.random() * 34;
    const x = Math.random() * 100;
    const delay = Math.random() * 1200;
    const dur = 2800 + Math.random() * 2200;
    const drift = (Math.random() - 0.5) * 50;
    p.textContent = PIZZAS[Math.floor(Math.random() * PIZZAS.length)];
    p.style.cssText = `
      position:absolute;top:-70px;left:${x}vw;
      font-size:${size}px;line-height:1;opacity:0;
      animation:ksyk-fall ${dur}ms ${delay}ms cubic-bezier(.2,.5,.4,1) forwards;
      --drift:${drift}vw;
    `;
    host.appendChild(p);
  }
  setTimeout(() => host.remove(), durationMs + 2500);
}

// ── Emoji confetti (generic) ──────────────────────────────────────

export function emojiRain(emojis: string[], count = 50, durationMs = 4000): void {
  ensureKeyframes();
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
  document.body.appendChild(host);
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 18 + Math.random() * 28;
    const x = Math.random() * 100;
    const delay = Math.random() * 1000;
    const dur = 2600 + Math.random() * 2000;
    const drift = (Math.random() - 0.5) * 40;
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.cssText = `
      position:absolute;top:-60px;left:${x}vw;
      font-size:${size}px;line-height:1;opacity:0;
      animation:ksyk-fall ${dur}ms ${delay}ms cubic-bezier(.2,.5,.4,1) forwards;
      --drift:${drift}vw;
    `;
    host.appendChild(p);
  }
  setTimeout(() => host.remove(), durationMs + 2200);
}

// ── Disco mode ────────────────────────────────────────────────────

export function discoMode(durationMs = 8000): void {
  ensureKeyframes();
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ksyk-disco-sweep { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes ksyk-disco-flash { 0%,100%{opacity:0} 40%,60%{opacity:0.65} }
    @keyframes ksyk-disco-ball {
      0%   { transform:translate(-50%,-50%) rotate(0deg); }
      100% { transform:translate(-50%,-50%) rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483646;overflow:hidden;mix-blend-mode:screen;";
  document.body.appendChild(host);

  const BEAMS = [
    "rgba(255,0,128,0.3)","rgba(0,255,200,0.3)","rgba(255,220,0,0.3)",
    "rgba(0,128,255,0.3)","rgba(200,0,255,0.3)","rgba(255,100,0,0.3)",
  ];
  for (let i = 0; i < BEAMS.length; i++) {
    const beam = document.createElement("div");
    beam.style.cssText = `
      position:absolute;top:30%;left:50%;
      width:150%;height:5px;
      background:linear-gradient(to right,transparent,${BEAMS[i]},transparent);
      transform-origin:0 50%;
      transform:rotate(${(i / BEAMS.length) * 360}deg);
      animation:ksyk-disco-sweep ${1.2 + i * 0.25}s linear infinite;
    `;
    host.appendChild(beam);
  }

  const FLASH_COLORS = ["rgba(255,0,128,0.22)","rgba(0,255,200,0.22)","rgba(255,220,0,0.22)","rgba(128,0,255,0.22)"];
  const flashTimer = setInterval(() => {
    const f = document.createElement("div");
    const c = FLASH_COLORS[Math.floor(Math.random() * FLASH_COLORS.length)];
    f.style.cssText = `position:absolute;inset:0;background:${c};animation:ksyk-disco-flash 320ms ease both;`;
    host.appendChild(f);
    setTimeout(() => f.remove(), 400);
  }, 280);

  confetti({ count: 60, duration: durationMs });

  setTimeout(() => { clearInterval(flashTimer); host.remove(); style.remove(); }, durationMs);
}

// ── Neon rainbow sweep ────────────────────────────────────────────

export function neonSweep(durationMs = 4500): void {
  ensureKeyframes();
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ksyk-neon-sweep {
      0%   { left:-60%; }
      100% { left:160%; }
    }
    @keyframes ksyk-neon-fade { 0%,100%{opacity:0} 20%,80%{opacity:1} }
  `;
  document.head.appendChild(style);

  const host = document.createElement("div");
  host.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:2147483646;
    overflow:hidden;mix-blend-mode:screen;
    animation:ksyk-neon-fade ${durationMs}ms ease forwards;
  `;
  document.body.appendChild(host);

  for (let pass = 0; pass < 2; pass++) {
    const beam = document.createElement("div");
    beam.style.cssText = `
      position:absolute;top:0;bottom:0;width:50%;
      background:linear-gradient(to right,
        transparent,
        rgba(255,0,180,0.45) 20%,
        rgba(255,140,0,0.45) 35%,
        rgba(255,255,0,0.45) 50%,
        rgba(0,255,128,0.45) 65%,
        rgba(0,180,255,0.45) 80%,
        transparent
      );
      animation:ksyk-neon-sweep ${durationMs * 0.65}ms ${pass * durationMs * 0.35}ms ease-in-out both;
    `;
    host.appendChild(beam);
  }

  setTimeout(() => { host.remove(); style.remove(); }, durationMs + 600);
}

// ── Screen flash ──────────────────────────────────────────────────

export function screenFlash(color = "rgba(255,255,255,0.92)", durationMs = 180): void {
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:2147483647;
    background:${color};opacity:1;transition:opacity ${durationMs * 2}ms ease;
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), durationMs * 2 + 50);
  }));
}

// ── Heat haze (sauna effect) ──────────────────────────────────────

export function heatHaze(durationMs = 5000): void {
  ensureKeyframes();
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ksyk-heat-rise {
      0%   { opacity:0; transform:translateY(0) scaleX(1); }
      20%  { opacity:0.55; }
      100% { opacity:0; transform:translateY(-80px) scaleX(1.15); }
    }
    @keyframes ksyk-heat-ember {
      0%   { opacity:0; transform:translateY(0) scale(1); }
      20%  { opacity:0.9; }
      100% { opacity:0; transform:translateY(-120px) scale(0); }
    }
  `;
  document.head.appendChild(style);

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
  document.body.appendChild(host);

  const HEAT_COLORS = ["rgba(255,80,0,0.35)","rgba(255,140,0,0.3)","rgba(255,200,0,0.25)","rgba(255,60,0,0.3)"];
  for (let i = 0; i < 45; i++) {
    const p = document.createElement("div");
    const x = Math.random() * 100;
    const size = 8 + Math.random() * 20;
    const delay = Math.random() * 2000;
    const dur = 1400 + Math.random() * 1600;
    const color = HEAT_COLORS[Math.floor(Math.random() * HEAT_COLORS.length)];
    const isEmber = Math.random() > 0.6;
    p.style.cssText = `
      position:absolute;bottom:0;left:${x}vw;
      width:${size}px;height:${size * (isEmber ? 1 : 2.5)}px;
      background:${color};border-radius:${isEmber ? "50%" : "50% 50% 0 0"};
      animation:${isEmber ? "ksyk-heat-ember" : "ksyk-heat-rise"} ${dur}ms ${delay}ms ease-out infinite;
      filter:blur(${isEmber ? "1px" : "2px"});
    `;
    host.appendChild(p);
  }

  setTimeout(() => { host.remove(); style.remove(); }, durationMs + 2000);
}

// ── Fake BSOD (blue screen) ───────────────────────────────────────

export function fakeBSOD(durationMs = 4000): void {
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed;inset:0;z-index:2147483647;pointer-events:none;
    background:#0050ef;color:white;font-family:'Courier New',monospace;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:40px;opacity:0;transition:opacity 80ms ease;
  `;
  el.innerHTML = `
    <div style="max-width:620px;text-align:left">
      <div style="font-size:72px;margin-bottom:24px">:(</div>
      <div style="font-size:28px;font-weight:700;margin-bottom:16px">Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</div>
      <div style="font-size:14px;margin-top:24px;opacity:0.8">0% complete</div>
      <div style="margin-top:32px;font-size:13px;opacity:0.6">
        Stop code: EASTER_EGG_FOUND<br>
        What failed: ksyk_maps_secret.sys
      </div>
    </div>
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = "1"; }));
  setTimeout(() => {
    el.style.transition = "opacity 300ms ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 350);
  }, durationMs);
}

// ── Achievement sound (Web Audio API) ────────────────────────────

export function playDiscoverySound(rarity: "common" | "rare" | "epic" | "legendary"): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes: Record<typeof rarity, number[]> = {
      common:    [523, 659],
      rare:      [523, 659, 784],
      epic:      [523, 659, 784, 1047],
      legendary: [523, 659, 784, 1047, 1319],
    };
    const seq = notes[rarity];
    seq.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    });
    setTimeout(() => ctx.close(), seq.length * 130 + 500);
  } catch { /* AudioContext blocked — silent */ }
}

// ── Glitch effect ─────────────────────────────────────────────────

export function glitchEffect(durationMs = 3000): void {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ksyk-glitch-h {
      0%,100% { clip-path:inset(0 0 100% 0); transform:translateX(0); }
      20%      { clip-path:inset(30% 0 50% 0); transform:translateX(-6px); }
      40%      { clip-path:inset(10% 0 70% 0); transform:translateX(6px); }
      60%      { clip-path:inset(60% 0 20% 0); transform:translateX(-4px); }
      80%      { clip-path:inset(80% 0 5% 0);  transform:translateX(4px); }
    }
    @keyframes ksyk-glitch-c { 0%,100%{opacity:0} 15%,25%{opacity:0.55} 50%,60%{opacity:0.35} }
  `;
  document.head.appendChild(style);

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;overflow:hidden;";

  // Use colored gradient overlays with screen blend — no DOM clone needed
  const layer1 = document.createElement("div");
  layer1.style.cssText = `
    position:absolute;inset:0;
    background:linear-gradient(90deg,rgba(255,0,100,0.7),rgba(0,255,200,0.7));
    mix-blend-mode:screen;
    animation:ksyk-glitch-h 180ms steps(1) infinite,ksyk-glitch-c ${durationMs}ms ease both;
  `;
  const layer2 = document.createElement("div");
  layer2.style.cssText = `
    position:absolute;inset:0;
    background:linear-gradient(270deg,rgba(0,100,255,0.7),rgba(255,200,0,0.7));
    mix-blend-mode:screen;
    animation:ksyk-glitch-h 230ms steps(1) 90ms infinite,ksyk-glitch-c ${durationMs}ms ease both;
  `;
  host.append(layer1, layer2);
  document.body.appendChild(host);
  setTimeout(() => { host.remove(); style.remove(); }, durationMs + 100);
}

// ── Taco rain ─────────────────────────────────────────────────────

export function tacoRain(durationMs = 6000): void {
  ensureKeyframes();
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
  document.body.appendChild(host);

  const TACOS = ["🌮","🌮","🌮","🌯","🫔","🌶️","🧅","🥑","🌮"];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement("div");
    const size = 24 + Math.random() * 36;
    const x = Math.random() * 100;
    const delay = Math.random() * 1500;
    const dur = 2600 + Math.random() * 2400;
    const drift = (Math.random() - 0.5) * 60;
    const spin = Math.random() > 0.5 ? "rotate(360deg)" : "rotate(-360deg)";
    p.textContent = TACOS[Math.floor(Math.random() * TACOS.length)];
    p.style.cssText = `
      position:absolute;top:-80px;left:${x}vw;
      font-size:${size}px;line-height:1;opacity:0;
      animation:ksyk-fall ${dur}ms ${delay}ms cubic-bezier(.2,.5,.4,1) forwards;
      --drift:${drift}vw;
    `;
    // Override the fall animation's end transform with spin
    void spin;
    host.appendChild(p);
  }
  setTimeout(() => host.remove(), durationMs + 2800);
}

export function playTacoSong(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    // "It's Raining Tacos" — G major, BPM 148, sawtooth+lowpass synth + drums.
    const BPM = 148;
    const q = 60 / BPM;

    const melNote = (f: number, beat: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const flt = ctx.createBiquadFilter();
      const env = ctx.createGain();
      osc.type = "sawtooth"; osc.frequency.value = f;
      flt.type = "lowpass"; flt.frequency.value = 1800; flt.Q.value = 1.8;
      osc.connect(flt); flt.connect(env); env.connect(master);
      const t = ctx.currentTime + beat * q, d = dur * q;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol, t + 0.018);
      env.gain.setValueAtTime(vol, t + d * 0.65);
      env.gain.exponentialRampToValueAtTime(0.001, t + d);
      osc.start(t); osc.stop(t + d + 0.02);
    };

    const bassNote = (f: number, beat: number, dur: number) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "triangle"; osc.frequency.value = f / 2;
      osc.connect(env); env.connect(master);
      const t = ctx.currentTime + beat * q, d = dur * q;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.3, t + 0.02);
      env.gain.setValueAtTime(0.3, t + d * 0.75);
      env.gain.exponentialRampToValueAtTime(0.001, t + d);
      osc.start(t); osc.stop(t + d + 0.02);
    };

    const kick = (beat: number) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      const t = ctx.currentTime + beat * q;
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
      env.gain.setValueAtTime(0.85, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(env); env.connect(master);
      osc.start(t); osc.stop(t + 0.3);
    };

    const hihat = (beat: number, accent: boolean) => {
      const t = ctx.currentTime + beat * q;
      const n = Math.floor(ctx.sampleRate * 0.045);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8500;
      const env = ctx.createGain();
      const v = accent ? 0.16 : 0.07;
      env.gain.setValueAtTime(v, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + (accent ? 0.04 : 0.022));
      src.connect(hp); hp.connect(env); env.connect(master);
      src.start(t); src.stop(t + 0.05);
    };

    // Drum pattern — 5 bars of 4/4 (20 beats).
    for (let b = 0; b < 20; b += 0.5) hihat(b, b % 2 === 0);
    for (let b = 0; b < 20; b += 2)  kick(b);

    const G4=392, A4=440, B4=494, C5=523, D5=587, E5=659, G5=784;

    const melody: [number, number, number][] = [
      [G4, 0,   0.32], [A4, 0.5, 0.32], [B4, 1,   0.32], [C5, 1.5, 0.62],
      [B4, 2.5, 0.32], [A4, 3,   0.32], [G4, 3.5, 0.82],
      [A4, 4.5, 0.32], [B4, 5,   0.32], [C5, 5.5, 0.32], [D5, 6,   0.62],
      [C5, 7,   0.32], [B4, 7.5, 0.32], [A4, 8,   0.32], [G4, 8.5, 1.1],
      [E5, 10,  0.38], [D5, 10.5,0.38], [C5, 11,  0.38], [B4, 11.5,0.38],
      [A4, 12,  0.38], [G4, 12.5,0.38], [A4, 13,  0.38], [B4, 13.5,0.38],
      [C5, 14,  0.38], [D5, 14.5,0.38], [E5, 15,  0.38], [D5, 15.5,0.38],
      [C5, 16,  0.38], [B4, 16.5,0.38], [A4, 17,  0.38], [G5, 17.5, 1.8],
    ];

    const bassLine: [number, number, number][] = [
      [G4, 0, 1.9], [A4, 2, 1.9], [G4, 4, 1.9], [D5, 6, 1.9],
      [G4, 8, 1.9], [C5, 10, 1.9], [A4, 12, 1.9], [C5, 14, 1.9],
      [G4, 16, 1.9], [G4, 18, 1.9],
    ];

    for (const [f, b, d] of melody)   melNote(f, b, d, 0.48);
    for (const [f, b, d] of bassLine) bassNote(f, b, d);

    setTimeout(() => ctx.close(), (20 * q + 2) * 1000);
  } catch { /* AudioContext blocked — silent */ }
}

// ── Typewriter banner ─────────────────────────────────────────────

export function typewriterBanner(text: string, opts: { color?: string; bg?: string; ms?: number } = {}): void {
  const { color = "#22c55e", bg = "rgba(0,0,0,0.9)", ms = 5000 } = opts;
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    z-index:2147483647;pointer-events:none;
    background:${bg};border:2px solid ${color};border-radius:8px;
    padding:12px 24px;font-family:'Courier New',monospace;
    font-size:16px;font-weight:700;color:${color};
    white-space:nowrap;letter-spacing:2px;
    box-shadow:0 0 20px ${color}60;
    min-width:200px;
  `;
  document.body.appendChild(el);

  let i = 0;
  const cursor = "█";
  const tick = setInterval(() => {
    if (i <= text.length) {
      el.textContent = text.slice(0, i) + (i < text.length ? cursor : "");
      i++;
    } else {
      clearInterval(tick);
    }
  }, 60);

  setTimeout(() => {
    el.style.transition = "opacity 400ms";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 450);
    clearInterval(tick);
  }, ms);
}
