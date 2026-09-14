/**
 * Firebase Cloud Messaging — server-side push notification service.
 *
 * Credentials come from environment variables (NEVER committed to git):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (the full PEM string, newlines as \n)
 *
 * All functions are safe to call even when Firebase isn't configured —
 * they return { sent: 0, failed: 0 } so the rest of the API keeps working.
 */

import { db } from "./db.js";
import { sql } from "drizzle-orm";

let _app: any = null;
let _messaging: any = null;
let _lastInitError: string | null = null;
let _initPromise: Promise<any> | null = null;

/**
 * Firebase Admin init using the MODULAR imports from firebase-admin/app +
 * firebase-admin/messaging. These are the ones supported by ESM in
 * firebase-admin v11+ (we're on v14). The previous approach of importing
 * the default `firebase-admin` module and calling `admin.apps.length`
 * failed with "Cannot read properties of undefined (reading 'length')"
 * because the ESM default export doesn't carry the `apps` array — that
 * lives on the module namespace itself, not the default.
 */
async function getApp(): Promise<any> {
  if (_app) return _app;
  if (_initPromise) return _initPromise;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    _lastInitError = `Missing env vars: ${[
      !projectId && "FIREBASE_PROJECT_ID",
      !clientEmail && "FIREBASE_CLIENT_EMAIL",
      !privateKey && "FIREBASE_PRIVATE_KEY",
    ].filter(Boolean).join(", ")}`;
    return null;
  }

  _initPromise = (async () => {
    try {
      const appMod = await import("firebase-admin/app");
      const msgMod = await import("firebase-admin/messaging");
      const initializeApp = appMod.initializeApp;
      const cert           = appMod.cert;
      const getApps        = appMod.getApps;
      const getApp_        = appMod.getApp;
      const getMessaging   = msgMod.getMessaging;

      const existingApps = getApps();
      _app = existingApps.length > 0
        ? getApp_()
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
          });
      _messaging = getMessaging(_app);
      _lastInitError = null;
      return _app;
    } catch (e: any) {
      _lastInitError = `${e?.name || "Error"}: ${e?.message ?? String(e)}`;
      console.error("[FCM] Firebase Admin init failed:", _lastInitError);
      _initPromise = null;
      return null;
    }
  })();
  return _initPromise;
}

/** Diagnostic info — exact reason FCM isn't initialising when it should. */
export async function getInitError(): Promise<string | null> {
  // Force an init attempt if we haven't tried yet
  if (!_app && !_lastInitError) await getApp();
  return _lastInitError;
}

/** All registered FCM tokens from the database. */
async function getAllTokens(): Promise<string[]> {
  try {
    const rows = await db.execute(sql`SELECT fcm_token FROM push_tokens WHERE fcm_token IS NOT NULL`);
    const data = (rows as any).rows ?? rows;
    return data.map((r: any) => r.fcm_token).filter(Boolean);
  } catch { return []; }
}

export interface SendResult {
  sent: number;
  failed: number;
  errors?: string[]; // per-token error codes, only populated when tokens.length ≤ 20
}

/**
 * Send a push notification to a list of FCM tokens.
 * Returns counts of successful and failed sends. When ≤20 tokens are
 * targeted, also returns the per-token error codes so admins can debug.
 */
export async function sendToTokens(
  tokens: string[],
  payload: { title: string; body: string; type?: string; screen?: string; data?: Record<string, string> },
): Promise<SendResult> {
  if (!tokens.length) return { sent: 0, failed: 0 };
  await getApp();
  if (!_messaging) {
    console.warn("[FCM] Not configured — skipping push to", tokens.length, "tokens");
    return { sent: 0, failed: 0, errors: [_lastInitError || "FCM not initialised"] };
  }

  const extra = payload.data ?? {};
  if (payload.type) extra["type"] = payload.type;
  if (payload.screen) extra["screen"] = payload.screen;

  // FCM multicast supports up to 500 tokens per call
  const CHUNK = 500;
  let sent = 0, failed = 0;
  const errors: string[] = [];
  const wantsErrorDetails = tokens.length <= 20;
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    try {
      // v1.76.0: send as data-only so onMessageReceived always fires and
      // we control notification rendering ourselves. Previously we sent
      // both `notification` and `data` — with `notification` set,
      // background messages get auto-rendered by Android and
      // onMessageReceived is skipped. When the app is in the foreground
      // Android does NOT auto-show the notification, so it looked like
      // notifications weren't arriving at all when in-app.
      //
      // Data-only + high priority = guaranteed onMessageReceived call in
      // both foreground and background, and we build the notification via
      // NotificationCompat with our correct channel + tap intent.
      const resp = await _messaging.sendEachForMulticast({
        tokens: chunk,
        data: {
          ...extra,
          title: payload.title,
          body: payload.body,
        },
        android: {
          priority: "high",
        },
      });
      sent += resp.successCount ?? 0;
      failed += resp.failureCount ?? 0;

      // Remove tokens that FCM says are unregistered/invalid
      if (resp.responses) {
        const dead: string[] = [];
        resp.responses.forEach((r: any, idx: number) => {
          if (r.success) return;
          const code = r.error?.code || "unknown";
          if (wantsErrorDetails) {
            errors.push(`${chunk[idx].slice(-8)}: ${code}${r.error?.message ? ` — ${r.error.message.slice(0, 100)}` : ""}`);
          }
          if (code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-registration-token") {
            dead.push(chunk[idx]);
          }
        });
        if (dead.length) {
          await db.execute(sql`DELETE FROM push_tokens WHERE fcm_token = ANY(${dead})`);
          console.log(`[FCM] Removed ${dead.length} stale tokens`);
        }
      }
    } catch (e: any) {
      console.error("[FCM] Multicast error:", e?.message);
      failed += chunk.length;
      if (wantsErrorDetails) errors.push(`batch error: ${e?.message || "unknown"}`);
    }
  }
  return wantsErrorDetails ? { sent, failed, errors } : { sent, failed };
}

/** Send to ALL registered devices. */
export async function broadcast(payload: {
  title: string;
  body: string;
  type?: string;
  screen?: string;
  data?: Record<string, string>;
}): Promise<SendResult & { total: number }> {
  const tokens = await getAllTokens();
  const result = await sendToTokens(tokens, payload);
  return { ...result, total: tokens.length };
}

/** Whether Firebase Admin is configured and ready. */
export function isFcmConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}
