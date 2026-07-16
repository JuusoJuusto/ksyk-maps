/**
 * colorEyedropper — pick a colour from anywhere on screen.
 *
 * Wraps the modern browser `EyeDropper` API where it exists (Chromium
 * 95+; ~87% global support as of 2026). When it doesn't, falls back to
 * a small hosted overlay that dims the app + tracks the cursor + reads
 * a live-updated computed backgroundColor from whatever element sits
 * under the cursor. That fallback isn't as pixel-accurate as the real
 * API but is good enough for picking a coloured building the user
 * drew earlier.
 */

/** Result of a successful pick. */
export interface PickedColor {
  hex: string;
}

interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperCtor {
  new (): { open(): Promise<EyeDropperResult> };
}

/** Returns true when the native EyeDropper API is available. */
export function nativeEyeDropperAvailable(): boolean {
  return typeof (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper === "function";
}

/**
 * Prompt the user to pick a colour. Resolves to `null` if they
 * cancelled or if the fallback couldn't determine a valid colour.
 */
export async function pickColor(): Promise<PickedColor | null> {
  const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  if (typeof Ctor === "function") {
    try {
      const dropper = new Ctor();
      const result = await dropper.open();
      return { hex: normalizeHex(result.sRGBHex) };
    } catch {
      return null;
    }
  }
  return fallbackPick();
}

/** Fallback: overlay a click catcher, follow the cursor, read the
 *  computed background colour of whatever element is under the mouse.
 *  Not perfect but handles solid-colour building fills fine. */
function fallbackPick(): Promise<PickedColor | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:2147483647;cursor:crosshair;
      background:rgba(0,0,0,0.05);
    `;
    const preview = document.createElement("div");
    preview.style.cssText = `
      position:fixed;pointer-events:none;z-index:2147483647;
      width:22px;height:22px;border:2px solid white;border-radius:50%;
      box-shadow:0 0 0 1px rgba(0,0,0,0.4),0 4px 12px rgba(0,0,0,0.4);
      transform:translate(-50%,-50%);background:transparent;
      transition:background 60ms linear;
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(preview);

    let lastHex: string | null = null;
    const onMove = (e: MouseEvent) => {
      preview.style.left = `${e.clientX + 16}px`;
      preview.style.top = `${e.clientY + 16}px`;
      // Hide overlay for hit-test, sample, then restore.
      overlay.style.pointerEvents = "none";
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      overlay.style.pointerEvents = "auto";
      if (under) {
        const c = getComputedStyle(under).backgroundColor;
        const hex = rgbStringToHex(c);
        if (hex) {
          lastHex = hex;
          preview.style.background = hex;
        }
      }
    };
    const finish = (hex: string | null) => {
      overlay.remove();
      preview.remove();
      window.removeEventListener("mousemove", onMove);
      resolve(hex ? { hex } : null);
    };
    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
      finish(lastHex);
    }, { once: true });
    window.addEventListener("keydown", function esc(ev) {
      if (ev.key === "Escape") {
        window.removeEventListener("keydown", esc);
        finish(null);
      }
    });
    window.addEventListener("mousemove", onMove);
  });
}

/** "rgb(37, 99, 235)" → "#2563eb". Returns null on transparent /
 *  non-rgb strings. */
function rgbStringToHex(rgb: string): string | null {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgb);
  if (!m) return null;
  const [r, g, b] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

/** Ensure a hex string is `#rrggbb` (six digits). */
function normalizeHex(hex: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return "#" + hex.slice(1).split("").map((c) => c + c).join("").toLowerCase();
  }
  return hex.toLowerCase();
}
