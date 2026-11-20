/**
 * Owner alerts — Slack + push notifications for the things the owner must hear
 * about without opening the dashboard (crashes, error spikes, brute-force
 * sign-ins, new support tickets, a daily digest).
 *
 * Design rules:
 *  - Nothing in here may throw into a request handler. Every entry point
 *    swallows its own failures; alerting is best-effort, never load-bearing.
 *  - Every alert is rate-limited per dedupe key through `alert_events`, so a
 *    crash loop produces one ping, not a thousand.
 *  - The Slack webhook is a secret: only ever returned masked, only ever sent
 *    to hooks.slack.com.
 *  - Tables are created lazily (CREATE TABLE IF NOT EXISTS) so this ships
 *    without a manual migration; rolling back leaves them behind harmlessly.
 */
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { errorFingerprint, countRecentErrors, countSimilarErrors, getSummary, getErrorGroups } from "./insights.js";
import { sendToTokens } from "./fcm.js";

export type AlertKind =
  | "crash" | "new_error" | "error_spike" | "login_failures"
  | "admin_login" | "ticket" | "digest" | "test";
export type Severity = "critical" | "warning" | "info";

export interface Rules {
  crash:         { enabled: boolean; cooldownMin: number };
  newError:      { enabled: boolean };
  errorSpike:    { enabled: boolean; threshold: number; windowMin: number; cooldownMin: number };
  loginFailures: { enabled: boolean; threshold: number; windowMin: number };
  adminLogin:    { enabled: boolean };
  ticket:        { enabled: boolean };
  dailyDigest:   { enabled: boolean };
}

export interface AlertSettings {
  slackEnabled: boolean;
  /** Stored value only; env SLACK_WEBHOOK_URL is the fallback. */
  slackWebhookUrl: string;
  pushEnabled: boolean;
  rules: Rules;
}

export const DEFAULT_SETTINGS: AlertSettings = {
  slackEnabled: true,
  slackWebhookUrl: "",
  pushEnabled: true,
  rules: {
    crash:         { enabled: true,  cooldownMin: 15 },
    newError:      { enabled: true },
    errorSpike:    { enabled: true,  threshold: 15, windowMin: 10, cooldownMin: 30 },
    loginFailures: { enabled: true,  threshold: 5,  windowMin: 10 },
    adminLogin:    { enabled: false },
    ticket:        { enabled: true },
    dailyDigest:   { enabled: true },
  },
};

const KV_KEY = "owner_alerts";
const SITE = () => (process.env.PUBLIC_BASE_URL || "https://www.ksykmaps.fi").replace(/\/$/, "");

function rowsOf(res: unknown): any[] {
  const r = res as any;
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Merge untrusted input over defaults and clamp every number. */
export function sanitizeSettings(input: any, base: AlertSettings = DEFAULT_SETTINGS): AlertSettings {
  const i = input && typeof input === "object" ? input : {};
  const r = i.rules && typeof i.rules === "object" ? i.rules : {};
  const b = base.rules;
  const on = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    slackEnabled: on(i.slackEnabled, base.slackEnabled),
    slackWebhookUrl: typeof i.slackWebhookUrl === "string" ? i.slackWebhookUrl.trim() : base.slackWebhookUrl,
    pushEnabled: on(i.pushEnabled, base.pushEnabled),
    rules: {
      crash: {
        enabled: on(r.crash?.enabled, b.crash.enabled),
        cooldownMin: clampInt(r.crash?.cooldownMin, 1, 1440, b.crash.cooldownMin),
      },
      newError: { enabled: on(r.newError?.enabled, b.newError.enabled) },
      errorSpike: {
        enabled: on(r.errorSpike?.enabled, b.errorSpike.enabled),
        threshold: clampInt(r.errorSpike?.threshold, 1, 1000, b.errorSpike.threshold),
        windowMin: clampInt(r.errorSpike?.windowMin, 1, 1440, b.errorSpike.windowMin),
        cooldownMin: clampInt(r.errorSpike?.cooldownMin, 1, 1440, b.errorSpike.cooldownMin),
      },
      loginFailures: {
        enabled: on(r.loginFailures?.enabled, b.loginFailures.enabled),
        threshold: clampInt(r.loginFailures?.threshold, 2, 100, b.loginFailures.threshold),
        windowMin: clampInt(r.loginFailures?.windowMin, 1, 1440, b.loginFailures.windowMin),
      },
      adminLogin: { enabled: on(r.adminLogin?.enabled, b.adminLogin.enabled) },
      ticket: { enabled: on(r.ticket?.enabled, b.ticket.enabled) },
      dailyDigest: { enabled: on(r.dailyDigest?.enabled, b.dailyDigest.enabled) },
    },
  };
}

/** Slack incoming webhooks only — never an arbitrary URL the server would fetch. */
export function isSlackWebhook(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "hooks.slack.com" && u.port === ""
      && !u.username && !u.password && !u.search && !u.hash
      && /^\/services\/[A-Za-z0-9/_-]+$/.test(u.pathname);
  } catch {
    return false;
  }
}

function webhookFor(s: AlertSettings): { url: string; source: "settings" | "env" } | null {
  if (s.slackWebhookUrl && isSlackWebhook(s.slackWebhookUrl)) return { url: s.slackWebhookUrl, source: "settings" };
  const env = process.env.SLACK_WEBHOOK_URL?.trim();
  if (env && isSlackWebhook(env)) return { url: env, source: "env" };
  return null;
}

export type PublicSettings = Omit<AlertSettings, "slackWebhookUrl"> & {
  slackConfigured: boolean;
  slackSource: "settings" | "env" | null;
  /** Last 4 chars only, so the owner can tell which hook is active. */
  slackHint: string | null;
  fcmConfigured: boolean;
  /** The daily digest runs from a Vercel cron, which needs CRON_SECRET to be allowed in. */
  cronConfigured: boolean;
};

export function toPublicSettings(s: AlertSettings): PublicSettings {
  const hook = webhookFor(s);
  const { slackWebhookUrl: _secret, ...rest } = s;
  return {
    ...rest,
    slackConfigured: !!hook,
    slackSource: hook?.source ?? null,
    slackHint: hook ? `hooks.slack.com/services/…${hook.url.slice(-4)}` : null,
    fcmConfigured: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
    cronConfigured: !!process.env.CRON_SECRET,
  };
}

let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (tablesReady) return tablesReady;
  tablesReady = (async () => {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS alert_devices (
      fcm_token text PRIMARY KEY, user_id text, label text, app_version text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS alert_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, severity text NOT NULL,
      title text NOT NULL, body text, dedupe_key text, slack text,
      push_sent int DEFAULT 0, push_failed int DEFAULT 0, created_at timestamptz DEFAULT now())`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_alert_events_dedupe ON alert_events (dedupe_key, created_at DESC)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS alert_signals (
      id bigserial PRIMARY KEY, kind text NOT NULL, ref text, created_at timestamptz DEFAULT now())`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_alert_signals_kind ON alert_signals (kind, created_at DESC)`);
  })().catch((e) => {
    tablesReady = null; // retry on the next call instead of caching a failure
    throw e;
  });
  return tablesReady;
}

export async function getSettings(): Promise<AlertSettings> {
  try {
    const r = await db.execute(sql`SELECT value FROM kv_settings WHERE key = ${KV_KEY}`);
    const stored = rowsOf(r)[0]?.value;
    return stored ? sanitizeSettings(stored) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: any): Promise<AlertSettings> {
  // Validate before any DB work so bad input fails fast and never reaches storage.
  const incoming = typeof patch?.slackWebhookUrl === "string" ? patch.slackWebhookUrl.trim() : "";
  if (incoming && !isSlackWebhook(incoming)) {
    throw new Error("Slack webhook must be an https://hooks.slack.com/services/… URL");
  }
  const current = await getSettings();
  // An omitted or blank webhook keeps the stored secret; the UI never receives it.
  const next = sanitizeSettings(
    { ...patch, slackWebhookUrl: typeof patch?.slackWebhookUrl === "string" && patch.slackWebhookUrl.trim() ? patch.slackWebhookUrl : current.slackWebhookUrl },
    current,
  );
  await db.execute(sql`
    INSERT INTO kv_settings (key, value, updated_at) VALUES (${KV_KEY}, ${JSON.stringify(next)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `);
  return next;
}

/** Removes the stored webhook (the env fallback, if any, stays). */
export async function clearSlackWebhook(): Promise<void> {
  const current = await getSettings();
  await db.execute(sql`
    INSERT INTO kv_settings (key, value, updated_at) VALUES (${KV_KEY}, ${JSON.stringify({ ...current, slackWebhookUrl: "" })}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `);
}

// ── Devices (the phones that receive pushes) ─────────────────────────────

export async function registerDevice(token: string, userId: string | null, label: string | null, appVersion: string | null) {
  await ensureTables();
  await db.execute(sql`
    INSERT INTO alert_devices (fcm_token, user_id, label, app_version)
    VALUES (${token}, ${userId}, ${label}, ${appVersion})
    ON CONFLICT (fcm_token) DO UPDATE
      SET user_id = EXCLUDED.user_id, label = COALESCE(EXCLUDED.label, alert_devices.label),
          app_version = EXCLUDED.app_version, updated_at = now()
  `);
}

export async function removeDevice(token: string) {
  await ensureTables();
  await db.execute(sql`DELETE FROM alert_devices WHERE fcm_token = ${token}`);
}

export async function listDevices(): Promise<{ id: string; label: string | null; appVersion: string | null; updatedAt: string }[]> {
  try {
    await ensureTables();
    const r = await db.execute(sql`SELECT fcm_token, label, app_version, updated_at FROM alert_devices ORDER BY updated_at DESC`);
    // Tokens are bearer-ish secrets for push delivery; expose only a tail as an id.
    return rowsOf(r).map((d) => ({ id: String(d.fcm_token).slice(-8), label: d.label, appVersion: d.app_version, updatedAt: new Date(d.updated_at).toISOString() }));
  } catch {
    return [];
  }
}

async function deviceTokens(): Promise<string[]> {
  try {
    await ensureTables();
    return rowsOf(await db.execute(sql`SELECT fcm_token FROM alert_devices`)).map((d) => d.fcm_token).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getHistory(limit = 50) {
  try {
    await ensureTables();
    const r = await db.execute(sql`
      SELECT id, kind, severity, title, body, slack, push_sent, push_failed, created_at
      FROM alert_events ORDER BY created_at DESC LIMIT ${Math.min(200, Math.max(1, limit))}`);
    return rowsOf(r).map((e) => ({
      id: e.id, kind: e.kind, severity: e.severity, title: e.title, body: e.body,
      slack: e.slack, pushSent: Number(e.push_sent) || 0, pushFailed: Number(e.push_failed) || 0,
      createdAt: new Date(e.created_at).toISOString(),
    }));
  } catch {
    return [];
  }
}

// ── Delivery ─────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Severity, string> = { critical: "#d92d20", warning: "#f79009", info: "#003d82" };

/** Slack mrkdwn treats & < > as control characters; error text is attacker-influenced. */
const slackEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function postSlack(url: string, a: { severity: Severity; title: string; body: string; link: string }): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctl.signal,
      body: JSON.stringify({
        text: a.title,
        attachments: [{
          color: SEVERITY_COLOR[a.severity],
          blocks: [
            { type: "section", text: { type: "mrkdwn", text: `*${slackEscape(a.title)}*\n${slackEscape(a.body).slice(0, 2800)}` } },
            { type: "context", elements: [{ type: "mrkdwn", text: `KSYK Maps · <${a.link}|Open Analytics>` }] },
          ],
        }],
      }),
    });
    return res.ok ? "sent" : `failed: HTTP ${res.status}`;
  } catch (e: any) {
    return `failed: ${e?.name === "AbortError" ? "timeout" : "network error"}`;
  } finally {
    clearTimeout(timer);
  }
}

export interface AlertInput {
  kind: AlertKind;
  severity: Severity;
  title: string;
  body: string;
  /** Alerts sharing a key are suppressed for `cooldownMin` after the first. */
  dedupeKey: string;
  cooldownMin: number;
  /** Skip the cooldown (the manual "send test" button). */
  force?: boolean;
}

export interface AlertResult {
  status: "sent" | "cooldown" | "no_channel" | "error";
  slack?: string;
  push?: { sent: number; failed: number };
  error?: string;
}

export async function notifyOwner(a: AlertInput): Promise<AlertResult> {
  try {
    await ensureTables();
    const settings = await getSettings();
    const hook = settings.slackEnabled ? webhookFor(settings) : null;
    const tokens = settings.pushEnabled ? await deviceTokens() : [];
    if (!hook && !tokens.length) return { status: "no_channel" };

    // Claim the key atomically so two concurrent errors can't both ping.
    const claim = await db.execute(a.force
      ? sql`INSERT INTO alert_events (kind, severity, title, body, dedupe_key)
            VALUES (${a.kind}, ${a.severity}, ${a.title}, ${a.body}, ${a.dedupeKey}) RETURNING id`
      : sql`INSERT INTO alert_events (kind, severity, title, body, dedupe_key)
            SELECT ${a.kind}, ${a.severity}, ${a.title}, ${a.body}, ${a.dedupeKey}
            WHERE NOT EXISTS (
              SELECT 1 FROM alert_events
              WHERE dedupe_key = ${a.dedupeKey}
                AND created_at > now() - make_interval(mins => ${Math.round(a.cooldownMin)}::int)
            ) RETURNING id`);
    const id = rowsOf(claim)[0]?.id;
    if (!id) return { status: "cooldown" };

    const link = `${SITE()}/admin/insights#${a.kind === "login_failures" || a.kind === "admin_login" || a.kind === "test" ? "alerts" : "errors"}`;
    const [slack, push] = await Promise.all([
      hook ? postSlack(hook.url, { severity: a.severity, title: a.title, body: a.body, link }) : Promise.resolve(undefined),
      tokens.length
        ? sendToTokens(tokens, { title: a.title, body: a.body.slice(0, 240), type: "owner_alert", screen: "admin_alerts", data: { kind: a.kind, severity: a.severity } })
        : Promise.resolve(undefined),
    ]);
    await db.execute(sql`
      UPDATE alert_events SET slack = ${slack ?? null}, push_sent = ${push?.sent ?? 0}, push_failed = ${push?.failed ?? 0}
      WHERE id = ${id}`);
    return { status: "sent", slack, push: push ? { sent: push.sent, failed: push.failed } : undefined };
  } catch (e: any) {
    console.warn("[alerts] notify failed:", e?.message);
    return { status: "error", error: e?.message ?? "unknown" };
  }
}

export function sendTestAlert(): Promise<AlertResult> {
  return notifyOwner({
    kind: "test", severity: "info", force: true, cooldownMin: 0, dedupeKey: "test",
    title: "KSYK Maps test alert",
    body: "If you can read this, owner alerts are wired up correctly.",
  });
}

// ── Triggers ─────────────────────────────────────────────────────────────

export interface LoggedError {
  level: string;
  message: string;
  source: string;
  appVersion?: string | null;
}

/** Per-instance throttles: a flood of errors must not become a flood of DB queries. */
let lastSpikeCheck = 0;
const recentNewChecks = new Map<string, number>();

const isCrash = (e: LoggedError) => e.level === "fatal" || /^CRASH:/i.test(e.message);

/** Call after storing error-level logs. Never throws. */
export async function onErrorsLogged(entries: LoggedError[]): Promise<void> {
  try {
    const errors = entries.filter((e) => e.level === "error" || e.level === "fatal");
    if (!errors.length) return;
    const s = await getSettings();
    if (!s.slackEnabled && !s.pushEnabled) return;

    const crash = errors.find(isCrash);
    if (crash && s.rules.crash.enabled) {
      await notifyOwner({
        kind: "crash", severity: "critical",
        title: `Crash on ${crash.source}${crash.appVersion ? ` ${crash.appVersion}` : ""}`,
        body: crash.message.slice(0, 400),
        dedupeKey: `crash:${errorFingerprint(crash.message)}`, cooldownMin: s.rules.crash.cooldownMin,
      });
    }

    if (s.rules.newError.enabled) {
      const first = errors.find((e) => !isCrash(e));
      if (first) {
        const fp = errorFingerprint(first.message);
        const checkedAt = recentNewChecks.get(fp) ?? 0;
        if (Date.now() - checkedAt > 10 * 60_000) {
          recentNewChecks.set(fp, Date.now());
          if (recentNewChecks.size > 200) recentNewChecks.clear();
          // The row was just inserted, so "1" means this is the first sighting.
          if ((await countSimilarErrors(first.message)) <= errors.length) {
            await notifyOwner({
              kind: "new_error", severity: "warning",
              title: `New error on ${first.source}${first.appVersion ? ` ${first.appVersion}` : ""}`,
              body: first.message.slice(0, 400),
              // One shared key: a bad deploy should page once, not per distinct message.
              dedupeKey: "new_error", cooldownMin: 10,
            });
          }
        }
      }
    }

    if (s.rules.errorSpike.enabled && Date.now() - lastSpikeCheck > 15_000) {
      lastSpikeCheck = Date.now();
      const { threshold, windowMin, cooldownMin } = s.rules.errorSpike;
      const n = await countRecentErrors(windowMin);
      if (n >= threshold) {
        await notifyOwner({
          kind: "error_spike", severity: "critical",
          title: `Error spike: ${n} errors in ${windowMin} min`,
          body: `Threshold is ${threshold} in ${windowMin} min. Latest: ${errors[0].message.slice(0, 200)}`,
          dedupeKey: "error_spike", cooldownMin,
        });
      }
    }
  } catch (e: any) {
    console.warn("[alerts] onErrorsLogged failed:", e?.message);
  }
}

/** Call on every failed admin sign-in. Never throws. */
export async function onLoginFailure(email: string, ip: string): Promise<void> {
  try {
    const s = await getSettings();
    if (!s.rules.loginFailures.enabled || (!s.slackEnabled && !s.pushEnabled)) return;
    await ensureTables();
    await db.execute(sql`INSERT INTO alert_signals (kind, ref) VALUES ('login_failure', ${`${ip}`.slice(0, 64)})`);
    // Keep the table tiny; this runs only on failures, which are rare.
    await db.execute(sql`DELETE FROM alert_signals WHERE created_at < now() - interval '2 days'`);
    const { threshold, windowMin } = s.rules.loginFailures;
    const r = await db.execute(sql`
      SELECT COUNT(*)::int AS n, COUNT(DISTINCT ref)::int AS ips FROM alert_signals
      WHERE kind = 'login_failure' AND created_at >= now() - make_interval(mins => ${windowMin}::int)`);
    const { n, ips } = rowsOf(r)[0] ?? { n: 0, ips: 0 };
    if (Number(n) >= threshold) {
      await notifyOwner({
        kind: "login_failures", severity: "critical",
        title: `${n} failed admin sign-ins in ${windowMin} min`,
        body: `From ${ips} IP address${Number(ips) === 1 ? "" : "es"}. Last attempt was for ${email.slice(0, 80)}.`,
        dedupeKey: "login_failures", cooldownMin: 30,
      });
    }
  } catch (e: any) {
    console.warn("[alerts] onLoginFailure failed:", e?.message);
  }
}

/** Call after a successful admin sign-in. Off by default. Never throws. */
export async function onAdminLogin(email: string, ip: string): Promise<void> {
  try {
    const s = await getSettings();
    if (!s.rules.adminLogin.enabled) return;
    await notifyOwner({
      kind: "admin_login", severity: "info",
      title: "Admin sign-in",
      body: `${email.slice(0, 80)} signed in from ${ip}.`,
      // Same person from the same address is noise; a new address is the signal.
      dedupeKey: `admin_login:${email.toLowerCase()}:${ip}`, cooldownMin: 24 * 60,
    });
  } catch (e: any) {
    console.warn("[alerts] onAdminLogin failed:", e?.message);
  }
}

export async function onTicket(t: { type: string; title: string; ticketId: string }): Promise<void> {
  try {
    const s = await getSettings();
    if (!s.rules.ticket.enabled) return;
    await notifyOwner({
      kind: "ticket", severity: "info",
      title: `New ${t.type} ticket`,
      body: `${t.title.slice(0, 200)} (${t.ticketId})`,
      dedupeKey: `ticket:${t.ticketId}`, cooldownMin: 60,
    });
  } catch (e: any) {
    console.warn("[alerts] onTicket failed:", e?.message);
  }
}

const delta = (cur: number, prev: number) =>
  prev === 0 ? (cur === 0 ? "0%" : "new") : `${cur >= prev ? "+" : ""}${Math.round(((cur - prev) / prev) * 100)}%`;

/** `force` is the manual "send digest now" button; the cron respects the rule + cooldown. */
export async function sendDailyDigest(force = false): Promise<AlertResult> {
  try {
    const s = await getSettings();
    if (!force && !s.rules.dailyDigest.enabled) return { status: "no_channel" };
    const [sum, errs] = await Promise.all([getSummary("24h"), getErrorGroups("24h")]);
    const m = sum.metrics;
    const lines = [
      `Sessions ${m.sessions.current} (${delta(m.sessions.current, m.sessions.previous)})`,
      `Pageviews ${m.pageviews.current} (${delta(m.pageviews.current, m.pageviews.previous)})`,
      `Searches ${m.searches.current} (${delta(m.searches.current, m.searches.previous)})`,
      `Errors ${m.errors.current} (${delta(m.errors.current, m.errors.previous)})`,
    ];
    const top = errs.groups.slice(0, 3).map((g) => `• ${g.count}× ${g.message.slice(0, 90)}`);
    return await notifyOwner({
      kind: "digest", severity: m.errors.current > 0 ? "warning" : "info",
      title: "KSYK Maps — last 24 hours",
      body: [...lines, ...(top.length ? ["", "Top errors:", ...top] : [])].join("\n"),
      dedupeKey: "digest", cooldownMin: 20 * 60, force,
    });
  } catch (e: any) {
    return { status: "error", error: e?.message ?? "unknown" };
  }
}
