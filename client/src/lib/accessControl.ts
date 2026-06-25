/**
 * KSYK Maps — pure access-control engine.
 *
 * Given the current SecuritySettings, the requesting user, their IP, and the
 * current time, returns an AccessDecision. No side effects, no React — same
 * function runs in the lockout screen, in the map gate, and in the admin
 * preview tool. The owner can change any rule and see the impact instantly.
 */

import {
  AccessTier,
  SecuritySettings,
  dayKeyForDate,
  isHoliday,
  isWithinWindow,
  isoDate,
  timeHM,
} from "./securitySettings";

export interface AuthedUser {
  id?: string;
  email?: string;
  role?: "owner" | "admin" | "staff" | "student" | "guest" | string;
}

export interface AccessContext {
  settings: SecuritySettings;
  user: AuthedUser | null;
  ip?: string | null;
  now?: Date;
}

export interface AccessDecision {
  tier: AccessTier;
  /** Stable code so UI can show localised strings without parsing the reason. */
  reasonCode:
    | "disabled"
    | "owner-bypass"
    | "user-exception"
    | "holiday"
    | "outside-hours"
    | "off-network"
    | "guest-login-required"
    | "wrong-domain"
    | "logged-in"
    | "default";
  /** Human-readable reason for admin previews / lockout screen. */
  reason: string;
  /** Set when the time-window rule fires. */
  nextOpen?: string;
  /** Set when the IP rule fires. */
  blockedIp?: string;
}

export function evaluateAccess(ctx: AccessContext): AccessDecision {
  const { settings, user, ip } = ctx;
  const now = ctx.now ?? new Date();

  // 0. Master switch off → everyone has full access (legacy behaviour).
  if (!settings.enabled) {
    return { tier: "full", reasonCode: "disabled", reason: "Security gate disabled." };
  }

  // 1. Owner / admin always bypasses everything else.
  if (user?.role === "owner" || user?.role === "admin") {
    return { tier: "full", reasonCode: "owner-bypass", reason: "Admin bypass." };
  }

  // 2. Per-user exception — highest-priority override.
  if (user?.email) {
    const ex = settings.userExceptions.find(
      (e) =>
        e.email.toLowerCase() === user.email!.toLowerCase() &&
        (!e.expiresAt || e.expiresAt >= isoDate(now)),
    );
    if (ex) {
      return {
        tier: ex.tier,
        reasonCode: "user-exception",
        reason: `Per-user exception (${ex.note ?? "no note"}).`,
      };
    }
  }

  // 3. Holiday gate.
  if (settings.timeWindowEnabled) {
    const today = isoDate(now);
    const h = isHoliday(today, settings.holidays);
    if (h) {
      return {
        tier: settings.outsideHoursTier,
        reasonCode: "holiday",
        reason: `Holiday: ${h.name}.`,
      };
    }
  }

  // 4. Time-window gate.
  if (settings.timeWindowEnabled) {
    const day = dayKeyForDate(now);
    const win = settings.schedule[day];
    const open = isWithinWindow(timeHM(now), win);
    if (!open) {
      return {
        tier: settings.outsideHoursTier,
        reasonCode: "outside-hours",
        reason: win
          ? `Outside school hours (today: ${win.open}–${win.close}).`
          : "Closed today.",
        nextOpen: findNextOpen(settings, now),
      };
    }
  }

  // 5. IP allowlist gate.
  if (settings.ipGateEnabled && ip) {
    const allowed = settings.ipAllowlist.some((rule) => ipMatchesCidr(ip, rule.cidr));
    if (!allowed) {
      return {
        tier: settings.offNetworkTier,
        reasonCode: "off-network",
        reason: "Off the school network.",
        blockedIp: ip,
      };
    }
  }

  // 6. Login + email-domain gate.
  if (settings.loginGateEnabled) {
    if (!user?.email) {
      return {
        tier: settings.guestTier,
        reasonCode: "guest-login-required",
        reason: "Sign in with a school account for full access.",
      };
    }
    const email = user.email.toLowerCase();
    const matches = settings.allowedEmailDomains.some((d) =>
      email.endsWith(d.toLowerCase()),
    );
    if (!matches) {
      return {
        tier: settings.guestTier,
        reasonCode: "wrong-domain",
        reason: `Email must end with ${settings.allowedEmailDomains.join(" or ")}.`,
      };
    }
    return {
      tier: settings.loggedInTier,
      reasonCode: "logged-in",
      reason: "Verified school account.",
    };
  }

  // 7. No gates beyond time/IP fired — full access.
  return { tier: "full", reasonCode: "default", reason: "All checks passed." };
}

/* ── CIDR matching (IPv4 only — IPv6 schools are rare in our user-base) ──── */

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

export function ipMatchesCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes("/")) return ip === cidr.trim();
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipN = ipToInt(ip);
  const baseN = ipToInt(base);
  if (ipN === null || baseN === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
  return (ipN & mask) === (baseN & mask);
}

/** Find the next time the school is open — used for "opens at" hint. */
function findNextOpen(settings: SecuritySettings, now: Date): string | undefined {
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const day = dayKeyForDate(d);
    const win = settings.schedule[day];
    if (!win) continue;
    if (isHoliday(isoDate(d), settings.holidays)) continue;
    if (i === 0 && timeHM(now) >= win.close) continue;
    if (i === 0 && timeHM(now) >= win.open) continue;
    const label = i === 0 ? `today at ${win.open}` :
                  i === 1 ? `tomorrow at ${win.open}` :
                  `${day.toUpperCase()} ${win.open}`;
    return label;
  }
  return undefined;
}

/** Convenience helper for guards: is this feature available at this tier? */
export function isFeatureAllowed(
  feature: keyof SecuritySettings["restrictedDisabledFeatures"],
  decision: AccessDecision,
  settings: SecuritySettings,
): boolean {
  if (decision.tier === "blocked") return false;
  if (decision.tier === "full") return true;
  return !settings.restrictedDisabledFeatures[feature];
}
