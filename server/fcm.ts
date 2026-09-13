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

function getApp() {
  if (_app) return _app;
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  try {
    const admin = require("firebase-admin");
    if (admin.apps.length === 0) {
      _app = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      _app = admin.apps[0];
    }
    _messaging = admin.messaging(_app);
    return _app;
  } catch (e: any) {
    console.error("[FCM] Firebase Admin init failed:", e?.message);
    return null;
  }
}

/** All registered FCM tokens from the database. */
async function getAllTokens(): Promise<string[]> {
  try {
    const rows = await db.execute(sql`SELECT fcm_token FROM push_tokens WHERE fcm_token IS NOT NULL`);
    const data = (rows as any).rows ?? rows;
    return data.map((r: any) => r.fcm_token).filter(Boolean);
  } catch { return []; }
}

/**
 * Send a push notification to a list of FCM tokens.
 * Returns counts of successful and failed sends.
 */
export async function sendToTokens(
  tokens: string[],
  payload: { title: string; body: string; type?: string; screen?: string; data?: Record<string, string> },
): Promise<{ sent: number; failed: number }> {
  if (!tokens.length) return { sent: 0, failed: 0 };
  if (!getApp() || !_messaging) {
    console.warn("[FCM] Not configured — skipping push to", tokens.length, "tokens");
    return { sent: 0, failed: 0 };
  }

  const extra = payload.data ?? {};
  if (payload.type) extra["type"] = payload.type;
  if (payload.screen) extra["screen"] = payload.screen;

  // FCM multicast supports up to 500 tokens per call
  const CHUNK = 500;
  let sent = 0, failed = 0;
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    try {
      const resp = await _messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: payload.title, body: payload.body },
        data: extra,
        android: {
          notification: {
            channelId: payload.type === "schedule_change" ? "ksyk_timetable" : "ksyk_push",
            priority: "high",
          },
          priority: "high",
        },
      });
      sent += resp.successCount ?? 0;
      failed += resp.failureCount ?? 0;

      // Remove tokens that FCM says are unregistered/invalid
      if (resp.responses) {
        const dead: string[] = [];
        resp.responses.forEach((r: any, idx: number) => {
          if (!r.success && (
            r.error?.code === "messaging/registration-token-not-registered" ||
            r.error?.code === "messaging/invalid-registration-token"
          )) dead.push(chunk[idx]);
        });
        if (dead.length) {
          await db.execute(sql`DELETE FROM push_tokens WHERE fcm_token = ANY(${dead})`);
          console.log(`[FCM] Removed ${dead.length} stale tokens`);
        }
      }
    } catch (e: any) {
      console.error("[FCM] Multicast error:", e?.message);
      failed += chunk.length;
    }
  }
  return { sent, failed };
}

/** Send to ALL registered devices. */
export async function broadcast(payload: {
  title: string;
  body: string;
  type?: string;
  screen?: string;
  data?: Record<string, string>;
}): Promise<{ sent: number; failed: number; total: number }> {
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
