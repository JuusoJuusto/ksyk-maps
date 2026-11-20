/**
 * Owner alerts + insights: who may call what, and that the Slack webhook (a
 * secret) can never leak back out. Drives the real Vercel handler with the DB
 * pointed at a closed port, so every status asserted here is decided by the
 * auth gate or by input validation, before any query could succeed.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../seo/helpers";

const SECRET = "t".repeat(48);
type Handler = (req: unknown, res: unknown) => Promise<unknown>;
let handler: Handler;
let alerts: typeof import("../../server/alerts");
let insights: typeof import("../../server/insights");

before(async () => {
  process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "ksyk-alerts-test-")));
  process.env.DATABASE_URL = "postgres://nobody:nothing@127.0.0.1:1/none";
  process.env.SESSION_SECRET = SECRET;
  delete process.env.CRON_SECRET;
  delete process.env.SLACK_WEBHOOK_URL;
  const load = (f: string) => import(pathToFileURL(path.join(ROOT, f)).href);
  handler = (await load("api/index.ts")).default;
  alerts = await load("server/alerts.ts");
  insights = await load("server/insights.ts");
});

async function call(method: string, url: string, headers: Record<string, string> = {}, body: unknown = {}) {
  const out: { status?: number; body?: any } = {};
  const res = {
    setHeader() { return res; },
    getHeader() { return undefined; },
    status(code: number) { out.status = code; return res; },
    json(b: unknown) { out.body = b; return res; },
    send(b: unknown) { out.body = b; return res; },
    end() { return res; },
  };
  const req = { method, url, headers: { "x-forwarded-for": "203.0.113.9", ...headers }, query: {}, body };
  await Promise.race([handler(req, res), new Promise((r) => setTimeout(r, 4000))]);
  return out;
}

function token(role: string, userId = "u1") {
  const payload = Buffer.from(JSON.stringify({ userId, role, exp: Date.now() + 60_000 })).toString("base64url");
  return `Bearer ${payload}.${crypto.createHmac("sha256", SECRET).update(payload).digest("base64url")}`;
}

const ALERT_ROUTES: [string, string][] = [
  ["GET", "/api/admin/alerts"],
  ["PUT", "/api/admin/alerts/settings"],
  ["DELETE", "/api/admin/alerts/slack"],
  ["POST", "/api/admin/alerts/devices"],
  ["POST", "/api/admin/alerts/devices/unregister"],
  ["POST", "/api/admin/alerts/test"],
  ["POST", "/api/admin/alerts/digest"],
];

test("anonymous callers get 401 on insights and every alerts route", async () => {
  for (const url of ["/api/admin/insights/summary", "/api/admin/insights/errors"]) {
    assert.equal((await call("GET", url)).status, 401, `GET ${url}`);
  }
  for (const [method, url] of ALERT_ROUTES) {
    assert.equal((await call(method, url)).status, 401, `${method} ${url}`);
  }
});

test("a regular admin can read insights but is locked out of alert settings", async () => {
  const authorization = token("admin");
  assert.notEqual((await call("GET", "/api/admin/insights/summary", { authorization })).status, 401);
  // Each non-owner lookup waits out the closed-port DB, so sample the routes.
  for (const [method, url] of [ALERT_ROUTES[0], ALERT_ROUTES[1], ALERT_ROUTES[5]]) {
    assert.equal((await call(method, url, { authorization })).status, 403, `${method} ${url} as admin`);
  }
});

test("the owner passes the gate; a forged owner role does not", async () => {
  // With the DB unreachable the handler may stall past the harness timeout (status
  // undefined); what matters is that it got past the gate instead of answering 401/403.
  const ok = await call("GET", "/api/admin/alerts", { authorization: token("owner") });
  assert.ok(ok.status !== 401 && ok.status !== 403, `owner got ${ok.status}`);

  const payload = Buffer.from('{"userId":"u1","role":"owner","exp":9999999999999}').toString("base64url");
  const forged = `Bearer ${payload}.${crypto.createHmac("sha256", "z".repeat(48)).update(payload).digest("base64url")}`;
  assert.equal((await call("GET", "/api/admin/alerts", { authorization: forged })).status, 401);
});

test("a webhook that is not a Slack incoming webhook is refused", async () => {
  const authorization = token("owner");
  for (const slackWebhookUrl of [
    "https://evil.example.com/services/T000/B000/xyz",
    "http://hooks.slack.com/services/T000/B000/xyz",
    "https://hooks.slack.com.evil.example/services/T000/B000/xyz",
    "https://hooks.slack.com/other/T000",
    "file:///etc/passwd",
  ]) {
    const out = await call("PUT", "/api/admin/alerts/settings", { authorization }, { slackWebhookUrl });
    assert.equal(out.status, 400, slackWebhookUrl);
  }
});

test("the cron digest stays closed without the secret and with a wrong one", async () => {
  assert.equal((await call("GET", "/api/cron/daily-digest")).status, 401);
  assert.equal((await call("GET", "/api/cron/daily-digest", { authorization: "Bearer " })).status, 401);
  process.env.CRON_SECRET = "s".repeat(32);
  try {
    assert.equal((await call("GET", "/api/cron/daily-digest", { authorization: "Bearer nope" })).status, 401);
    assert.equal((await call("GET", "/api/cron/daily-digest", { authorization: `Bearer ${"s".repeat(31)}` })).status, 401);
  } finally {
    delete process.env.CRON_SECRET;
  }
});

test("/api/logs/batch exists in the production handler (it used to 404)", async () => {
  const out = await call("POST", "/api/logs/batch", {}, { entries: [], source: "android" });
  assert.equal(out.status, 200);
  assert.equal(out.body.inserted, 0);
});

// ── pure helpers ────────────────────────────────────────────────────────────

test("isSlackWebhook accepts only https hooks.slack.com/services URLs", () => {
  assert.equal(alerts.isSlackWebhook("https://hooks.slack.com/services/T000/B000/abc123"), true);
  assert.equal(alerts.isSlackWebhook("https://hooks.slack.com/services/"), false);
  assert.equal(alerts.isSlackWebhook("https://hooks.slack.com/services/T0/B0/x?redirect=https://evil"), false);
  assert.equal(alerts.isSlackWebhook("not a url"), false);
});

test("the public settings view never contains the webhook, only a 4-character hint", () => {
  const secret = "https://hooks.slack.com/services/T000/B000/abcdefSECRETtail";
  const view = alerts.toPublicSettings(alerts.sanitizeSettings({ slackWebhookUrl: secret }));
  const json = JSON.stringify(view);
  assert.equal(view.slackConfigured, true);
  assert.ok(!json.includes("abcdefSECRET"), "secret part of the URL must not be serialised");
  assert.ok(!("slackWebhookUrl" in view));
  assert.ok(view.slackHint?.endsWith("tail"));
});

test("sanitizeSettings clamps thresholds and ignores junk", () => {
  const s = alerts.sanitizeSettings({
    pushEnabled: "yes",
    rules: { errorSpike: { threshold: -5, windowMin: 99999, cooldownMin: "x" }, loginFailures: { threshold: 1 } },
  });
  assert.equal(s.pushEnabled, true, "non-boolean falls back to the default");
  assert.equal(s.rules.errorSpike.threshold, 1);
  assert.equal(s.rules.errorSpike.windowMin, 1440);
  assert.equal(s.rules.errorSpike.cooldownMin, alerts.DEFAULT_SETTINGS.rules.errorSpike.cooldownMin);
  assert.equal(s.rules.loginFailures.threshold, 2, "a single failed sign-in must never page the owner");
});

test("errorFingerprint groups the same error with different ids and numbers", () => {
  const fp = insights.errorFingerprint;
  assert.equal(fp("Failed to load room 123 from https://a.fi/x?y=1"), fp("Failed to load room 987 from https://b.fi/z"));
  assert.equal(fp("Item 550e8400-e29b-41d4-a716-446655440000 missing"), fp("Item 123e4567-e89b-12d3-a456-426614174000 missing"));
  assert.notEqual(fp("Failed to load room 1"), fp("Failed to save room 1"));
});

test("parseRange falls back to 24h for anything unknown", () => {
  assert.equal(insights.parseRange("7d"), "7d");
  assert.equal(insights.parseRange("1y"), "24h");
  assert.equal(insights.parseRange(undefined), "24h");
});
