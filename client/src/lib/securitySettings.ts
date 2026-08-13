/**
 * KSYK Maps — Security & Access Control settings.
 *
 * One config object that the admin panel writes and the map reads on every
 * render. Persisted in localStorage (instant) and synced to the server so
 * every device sees the same rules (eventually consistent).
 *
 * The DB layer is intentionally abstracted in server/storage.ts — when we
 * migrate from Firebase to Supabase later, only that file changes; this
 * settings object travels unchanged because it's serialised as JSON.
 */

export type AccessTier = "full" | "restricted" | "blocked";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
  fri: "Fri", sat: "Sat", sun: "Sun",
};

/** Per-day open window. `null` = closed all day. */
export type DayWindow = { open: string; close: string } | null;

export interface Holiday {
  id: string;
  name: string;
  /** YYYY-MM-DD inclusive */
  start: string;
  /** YYYY-MM-DD inclusive */
  end: string;
}

export interface IpRule {
  id: string;
  /** CIDR like "10.0.0.0/8" or exact IP "192.168.1.42" */
  cidr: string;
  label?: string;
}

export interface UserException {
  id: string;
  email: string;
  /** Overrides the computed tier for this specific email */
  tier: AccessTier;
  /** Optional ISO date — exception auto-expires after this date */
  expiresAt?: string;
  note?: string;
}

export interface AccessRequest {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
  status: "pending" | "approved" | "denied";
}

export interface SecuritySettings {
  /** Master toggle — when off, every user gets `full` access (legacy behaviour). */
  enabled: boolean;

  /* ── Time-window gate ───────────────────────────────────────────── */
  timeWindowEnabled: boolean;
  /** Per-weekday opening hours (HH:MM 24-hour). */
  schedule: Record<DayKey, DayWindow>;
  /** When inside the time window: `full`. Outside: `outsideHoursTier`. */
  outsideHoursTier: AccessTier;
  /** Holiday ranges — treated as "closed" days. */
  holidays: Holiday[];

  /* ── IP-allowlist gate ──────────────────────────────────────────── */
  ipGateEnabled: boolean;
  /** Allowed CIDRs. Empty list with gate enabled = nobody passes. */
  ipAllowlist: IpRule[];
  /** Tier given to users who fail the IP check. */
  offNetworkTier: AccessTier;

  /* ── Email-login gate ───────────────────────────────────────────── */
  loginGateEnabled: boolean;
  /** Required domain suffix(es), e.g. ["@ksyk.fi"]. */
  allowedEmailDomains: string[];
  /** Tier given to authenticated users with allowed domain. */
  loggedInTier: AccessTier;
  /** Tier given to guests (not logged in or wrong domain). */
  guestTier: AccessTier;
  /** Features that the `restricted` tier loses. Admin can toggle each. */
  restrictedDisabledFeatures: {
    threeDView: boolean;
    schedules: boolean;
    routing: boolean;
    search: boolean;
    geolocation: boolean;
  };

  /* ── Exceptions & inbox ─────────────────────────────────────────── */
  userExceptions: UserException[];
  /** Pending access requests submitted from the lockout screen. */
  accessRequests: AccessRequest[];

  /* ── Misc ───────────────────────────────────────────────────────── */
  /** Custom message shown on the lockout screen. */
  lockoutMessage: string;
  /** Lets owner test rules without affecting real users. */
  dryRun: boolean;
}

const STORAGE_KEY = "ksyk_security_settings_v1";

const STANDARD_SCHOOL_HOURS: DayWindow = { open: "07:30", close: "17:00" };

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  enabled: false,
  timeWindowEnabled: true,
  schedule: {
    mon: STANDARD_SCHOOL_HOURS,
    tue: STANDARD_SCHOOL_HOURS,
    wed: STANDARD_SCHOOL_HOURS,
    thu: STANDARD_SCHOOL_HOURS,
    fri: STANDARD_SCHOOL_HOURS,
    sat: null,
    sun: null,
  },
  outsideHoursTier: "blocked",
  holidays: [],
  ipGateEnabled: false,
  ipAllowlist: [],
  offNetworkTier: "restricted",
  loginGateEnabled: false,
  allowedEmailDomains: ["@ksyk.fi"],
  loggedInTier: "full",
  guestTier: "restricted",
  restrictedDisabledFeatures: {
    threeDView: true,
    schedules: false,
    routing: false,
    search: false,
    geolocation: false,
  },
  userExceptions: [],
  accessRequests: [],
  lockoutMessage:
    "The KSYK Map is currently unavailable. Please sign in with your @ksyk.fi account or contact campus admin for access.",
  dryRun: false,
};

export function loadSecuritySettings(): SecuritySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SECURITY_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SecuritySettings>;
    // Deep-merge nested objects so we don't lose new defaults when the schema
    // grows. Arrays are replaced wholesale — admins manage them as units.
    return {
      ...DEFAULT_SECURITY_SETTINGS,
      ...parsed,
      schedule: { ...DEFAULT_SECURITY_SETTINGS.schedule, ...(parsed.schedule ?? {}) },
      restrictedDisabledFeatures: {
        ...DEFAULT_SECURITY_SETTINGS.restrictedDisabledFeatures,
        ...(parsed.restrictedDisabledFeatures ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SECURITY_SETTINGS };
  }
}

export function saveSecuritySettings(s: SecuritySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage full / disabled — silent
  }
}

/* ── Helpers used by access engine + admin UI ──────────────────────── */

export function dayKeyForDate(d: Date): DayKey {
  // JS getDay(): 0 = Sunday … 6 = Saturday
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as DayKey[])[d.getDay()];
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isWithinWindow(time: string, win: DayWindow): boolean {
  if (!win) return false;
  const t = toMinutes(time);
  return t >= toMinutes(win.open) && t <= toMinutes(win.close);
}

export function isHoliday(dateISO: string, holidays: Holiday[]): Holiday | null {
  for (const h of holidays) {
    if (dateISO >= h.start && dateISO <= h.end) return h;
  }
  return null;
}

export function isoDate(d: Date): string {
  const m = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${m(d.getMonth() + 1)}-${m(d.getDate())}`;
}

export function timeHM(d: Date): string {
  const m = (n: number) => String(n).padStart(2, "0");
  return `${m(d.getHours())}:${m(d.getMinutes())}`;
}
