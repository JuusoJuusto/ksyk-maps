/**
 * Server-side authorization, independent of anything the SEO layer does.
 * Drives the real Vercel handler (api/index.ts) with mock requests; the DB
 * URL points at a closed port, so every assertion here must be decided by the
 * auth gate *before* any query runs.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, read } from "../seo/helpers";
import { PUBLIC_STAFF_FIELDS, toPublicStaff } from "../../shared/staffPublic";

const SECRET = "t".repeat(48);
type Handler = (req: unknown, res: unknown) => Promise<unknown>;
let handler: Handler;

before(async () => {
  // server/storage.ts runs dotenv.config() against the cwd. Leave the repo so
  // the real .env (live credentials) can never be injected into a test run.
  process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "ksyk-api-test-")));
  process.env.DATABASE_URL = "postgres://nobody:nothing@127.0.0.1:1/none";
  process.env.SESSION_SECRET = SECRET;
  handler = (await import(pathToFileURL(path.join(ROOT, "api/index.ts")).href)).default;
});

async function call(method: string, url: string, headers: Record<string, string> = {}) {
  const out: { status?: number; body?: unknown } = {};
  const res = {
    setHeader() { return res; },
    getHeader() { return undefined; },
    status(code: number) { out.status = code; return res; },
    json(body: unknown) { out.body = body; return res; },
    send(body: unknown) { out.body = body; return res; },
    end() { return res; },
  };
  const req = { method, url, headers: { "x-forwarded-for": "203.0.113.7", ...headers }, query: {}, body: {} };
  await Promise.race([handler(req, res), new Promise((r) => setTimeout(r, 3000))]);
  return out;
}

function adminToken({ expiresInMs = 60_000, secret = SECRET }: { expiresInMs?: number; secret?: string } = {}) {
  const payload = Buffer.from(JSON.stringify({ userId: "u1", role: "admin", exp: Date.now() + expiresInMs })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

const ADMIN_ONLY_READS = [
  "/api/users", "/api/users/abc", "/api/tickets", "/api/feedback", "/api/bug-reports", "/api/crash-reports",
  "/api/push-tokens", "/api/notifications/history", "/api/notifications/status", "/api/logs", "/api/admin-login-logs",
  "/api/analytics", "/api/analytics/overview", "/api/analytics/summary", "/api/analytics/events", "/api/analytics/visitors",
  "/api/analytics/searches", "/api/sessions/rrweb", "/api/admin/posthog/recordings", "/api/auth/user",
  "/api/auth/admin-diag", "/api/email-diagnostic", "/api/debug",
];

const ADMIN_ONLY_WRITES: [string, string][] = [
  ["POST", "/api/staff"], ["PATCH", "/api/staff/abc"], ["DELETE", "/api/staff/abc"],
  ["PUT", "/api/settings"], ["PUT", "/api/security-settings"], ["PUT", "/api/map-defaults"],
  ["POST", "/api/rooms"], ["PUT", "/api/rooms/abc"], ["DELETE", "/api/rooms/abc"], ["POST", "/api/buildings"],
  ["POST", "/api/hallways"], ["POST", "/api/pois"], ["POST", "/api/announcements"], ["POST", "/api/subjects"],
  ["POST", "/api/users"], ["POST", "/api/notifications/broadcast"], ["POST", "/api/admin/cleanup"],
  ["POST", "/api/admin/cleanup-all"], ["DELETE", "/api/analytics/reset"], ["POST", "/api/test-email"],
];

test("anonymous callers get 401 on every admin-only read", async () => {
  for (const url of ADMIN_ONLY_READS) {
    assert.equal((await call("GET", url)).status, 401, `GET ${url}`);
  }
});

test("anonymous callers get 401 on every admin-only write", async () => {
  for (const [method, url] of ADMIN_ONLY_WRITES) {
    assert.equal((await call(method, url)).status, 401, `${method} ${url}`);
  }
});

test("forged, malformed, expired and wrongly-signed tokens are rejected", async () => {
  const bad: Record<string, string> = {
    garbage: "Bearer not-a-token",
    "no signature": `Bearer ${adminToken().split(".")[0]}`,
    "wrong secret": `Bearer ${adminToken({ secret: "z".repeat(48) })}`,
    expired: `Bearer ${adminToken({ expiresInMs: -1000 })}`,
    "role swapped": `Bearer ${Buffer.from('{"userId":"u1","role":"owner","exp":9999999999999}').toString("base64url")}.${adminToken().split(".")[1]}`,
  };
  for (const [label, authorization] of Object.entries(bad)) {
    for (const url of ["/api/users", "/api/tickets", "/api/debug"]) {
      assert.equal((await call("GET", url, { authorization })).status, 401, `${label} on ${url}`);
    }
    assert.equal((await call("POST", "/api/staff", { authorization })).status, 401, `${label} on POST /api/staff`);
  }
});

test("a correctly signed admin token passes the gate (so the 401s above are the gate, not a broken route)", async () => {
  const authorization = `Bearer ${adminToken()}`;
  for (const url of ["/api/users", "/api/debug"]) {
    const status = (await call("GET", url, { authorization })).status;
    assert.notEqual(status, 401, `GET ${url} with a valid admin token`);
  }
});

// ── sliding admin session (mobile app stays signed in) ──────────────────────

const refresh = (headers: Record<string, string> = {}) => call("POST", "/api/auth/admin-refresh", headers);
const claimOf = (token: string) => JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());

test("admin-refresh swaps a valid token for a fresh ~30-day one the real gate accepts", async () => {
  const out = await refresh({ authorization: `Bearer ${adminToken({ expiresInMs: 60_000 })}` });
  assert.equal(out.status, 200);
  const fresh = (out.body as { adminToken: string }).adminToken;
  const days = (claimOf(fresh).exp - Date.now()) / 86_400_000;
  assert.ok(days > 29 && days <= 30, `new token should live ~30 days, got ${days.toFixed(2)}`);
  assert.notEqual((await call("GET", "/api/users", { authorization: `Bearer ${fresh}` })).status, 401, "refreshed token passes the admin gate");
});

test("admin-refresh also reads the x-admin-token header the Android client sends", async () => {
  assert.equal((await refresh({ "x-admin-token": adminToken() })).status, 200);
});

test("admin-refresh refuses anonymous, expired, forged and malformed tokens", async () => {
  const cases: Record<string, Record<string, string>> = {
    anonymous: {},
    garbage: { authorization: "Bearer junk" },
    expired: { authorization: `Bearer ${adminToken({ expiresInMs: -1000 })}` },
    "wrong secret": { authorization: `Bearer ${adminToken({ secret: "z".repeat(48) })}` },
  };
  for (const [label, headers] of Object.entries(cases)) {
    assert.equal((await refresh(headers)).status, 401, label);
  }
});

test("new sign-ins get the same long TTL as refreshed tokens", () => {
  const src = read("api/index.ts");
  assert.ok(src.includes("exp: Date.now() + ADMIN_TOKEN_TTL_MS"), "tokens use the shared TTL constant");
  assert.ok(!src.includes("604_800_000"), "no leftover hard-coded 7-day expiry");
});

test("search-engine directives do not stand in for auth: robots/noindex changes nothing server-side", async () => {
  // A crawler identity and an X-Robots-Tag-style header must not unlock anything.
  const status = (await call("GET", "/api/users", { "user-agent": "Googlebot/2.1", "x-robots-tag": "all" })).status;
  assert.equal(status, 401);
});

// ── staff privacy ───────────────────────────────────────────────────────────

const row = {
  id: "s1", userId: "u9", firstName: "Aino", lastName: "Virtanen", email: "aino.virtanen@ksyk.fi", phone: "+358401234567",
  position: "Opettaja", positionEn: "Teacher", positionFi: "Opettaja", department: "Kielet", departmentEn: "Languages",
  departmentFi: "Kielet", officeRoomId: "r1", profileImageUrl: "https://x/y.jpg", bio: "private bio", bioEn: "b", bioFi: "b",
  abbrev: "AVi", wilmaProfileUrl: "https://wilma/x", isActive: true, createdAt: "2026-01-01", updatedAt: "2026-01-02",
};

test("anonymous staff projection keeps directory fields and drops contact details", () => {
  const out = toPublicStaff(row);
  assert.deepEqual(Object.keys(out).sort(), [...PUBLIC_STAFF_FIELDS].sort());
  for (const secret of ["email", "phone", "bio", "bioEn", "bioFi", "userId", "officeRoomId", "profileImageUrl", "wilmaProfileUrl", "createdAt", "updatedAt"]) {
    assert.ok(!(secret in out), `${secret} must not be public`);
  }
  assert.ok(!JSON.stringify(out).includes("@ksyk.fi") && !JSON.stringify(out).includes("+358"));
  assert.equal(out.firstName, "Aino");
});

test("GET /api/staff applies the projection unless a verified admin token is present", () => {
  // The handler needs storage (a DB) to return rows, so this guards the wiring statically.
  for (const file of ["api/index.ts", "server/routes.ts"]) {
    const src = read(file);
    const start = src.search(/['"]\/(api\/)?staff['"]\s*(&&|,)/);
    assert.ok(start >= 0, `${file} defines GET staff`);
    const branch = src.slice(start, start + 900);
    assert.ok(branch.includes("toPublicStaff"), `${file}: GET staff must project for anonymous callers`);
  }
  const api = read("api/index.ts");
  const branch = api.slice(api.indexOf("apiPath === '/staff' && req.method === 'GET'"), api.indexOf("// ── Staff CRUD"));
  assert.ok(branch.includes("verifyAdminToken"), "full rows only after the HMAC token verifies");
  assert.ok(read("client/src/components/AdminDashboard.tsx").includes('fetch("/api/staff", { headers: getAdminHeaders()'), "admin panel sends its token so it keeps full rows");
});
