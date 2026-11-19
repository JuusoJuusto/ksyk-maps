/**
 * Web admin sliding session (client/src/lib/adminAuth.ts): renewal, idle
 * cut-off and 401 recovery. The module only touches localStorage, fetch,
 * sessionStorage and window.location, so Node stubs are enough.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../seo/helpers";

type Store = Map<string, string>;
const g = globalThis as any;

function memoryStorage(store: Store) {
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

let local: Store;
let session: Store;
let calls: { url: string; init: any }[];
let respond: () => Response | Promise<Response>;
let redirectedTo: string | null;
let mod: typeof import("../../client/src/lib/adminAuth");

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(async () => {
  local = new Map(); session = new Map(); calls = []; redirectedTo = null;
  g.localStorage = memoryStorage(local);
  g.sessionStorage = memoryStorage(session);
  g.window = { location: { pathname: "/admin", replace: (to: string) => { redirectedTo = to; } } };
  g.fetch = async (url: string, init: any) => { calls.push({ url, init }); return respond(); };
  // Fresh module state (in-flight promise, memoised notice) for every test.
  mod = await import(pathToFileURL(path.join(ROOT, "client/src/lib/adminAuth.ts")).href + `?t=${Math.random()}`);
});

function signedIn(extra: Record<string, string> = {}) {
  local.set("ksyk_admin_logged_in", "true");
  local.set("ksyk_admin_token", "old-token");
  local.set("ksyk_admin_login_at", String(Date.now()));
  for (const [k, v] of Object.entries(extra)) local.set(k, v);
}

test("a successful refresh stores the new token, resets the idle clock and picks up the role", async () => {
  signedIn({ ksyk_admin_login_at: String(Date.now() - 11 * 3600_000) });
  respond = () => json(200, { success: true, adminToken: "new-token", user: { id: "u1", role: "owner" } });
  assert.equal(await mod.refreshAdminSession(), "refreshed");
  assert.equal(local.get("ksyk_admin_token"), "new-token");
  assert.ok(Date.now() - Number(local.get("ksyk_admin_login_at")) < 5_000, "idle clock restarted");
  assert.equal(JSON.parse(local.get("ksyk_admin_user")!).role, "owner");
  assert.equal(calls[0].url, "/api/auth/admin-refresh");
  assert.equal(calls[0].init.headers.Authorization, "Bearer old-token");
  assert.equal(mod.isAdminSessionIdle(), false);
});

test("only a 401 means expired; 404 (older server), 5xx, 429, offline and junk bodies keep the session", async () => {
  const cases: [string, () => Response | Promise<Response>][] = [
    ["404", () => json(404)], ["500", () => json(500)], ["429", () => json(429)],
    ["offline", () => { throw new TypeError("Failed to fetch"); }],
    ["200 without a token", () => json(200, { success: true })],
  ];
  for (const [label, r] of cases) {
    signedIn(); respond = r;
    assert.equal(await mod.refreshAdminSession({ force: true }), "skipped", label);
    assert.equal(local.get("ksyk_admin_token"), "old-token", `${label}: token untouched`);
  }
  respond = () => json(401, { message: "Invalid or expired admin token" });
  assert.equal(await mod.refreshAdminSession({ force: true }), "expired");
});

test("refresh is throttled, skipped when signed out, and de-duplicated while in flight", async () => {
  respond = () => json(200, { adminToken: "n" });
  assert.equal(await mod.refreshAdminSession(), "skipped", "no token / not signed in");
  signedIn();
  assert.equal(await mod.refreshAdminSession(), "refreshed");
  assert.equal(await mod.refreshAdminSession(), "skipped", "inside the 20 min window");
  assert.equal(calls.length, 1);

  signedIn(); local.delete("ksyk_admin_refreshed_at");
  let release!: () => void;
  respond = () => new Promise<Response>((r) => { release = () => r(json(200, { adminToken: "n2" })); });
  const a = mod.refreshAdminSession(); const b = mod.refreshAdminSession();
  release();
  assert.deepEqual(await Promise.all([a, b]), ["refreshed", "refreshed"]);
  assert.equal(calls.length, 2, "two concurrent callers, one request");
});

test("the idle cut-off still applies to abandoned sessions (12 h without a refresh)", () => {
  signedIn({ ksyk_admin_login_at: String(Date.now() - 13 * 3600_000) });
  assert.equal(mod.isAdminSessionIdle(), true);
  local.set("ksyk_admin_login_at", String(Date.now() - 11 * 3600_000));
  assert.equal(mod.isAdminSessionIdle(), false);
});

test("401 recovery: renews and asks for a retry; a second 401 right after a refresh is left alone", async () => {
  signedIn(); respond = () => json(200, { adminToken: "fresh" });
  assert.equal(await mod.recoverFromUnauthorized(), true);
  assert.equal(local.get("ksyk_admin_token"), "fresh");
  assert.equal(await mod.recoverFromUnauthorized(), false, "just refreshed: the 401 isn't about token age");
  assert.equal(calls.length, 1);
});

test("401 recovery on a dead token signs out and sends admin pages back to sign-in with a notice", async () => {
  signedIn(); respond = () => json(401, { message: "Invalid or expired admin token" });
  assert.equal(await mod.recoverFromUnauthorized(), false);
  assert.equal(local.get("ksyk_admin_token"), undefined, "session cleared");
  assert.equal(redirectedTo, "/admin");
  assert.equal(mod.consumeExpiredNotice(), true);
});

test("on a public page an expired token is only dropped: the visitor is not redirected", async () => {
  g.window.location.pathname = "/";
  signedIn(); respond = () => json(401, {});
  assert.equal(await mod.recoverFromUnauthorized(), false);
  assert.equal(local.get("ksyk_admin_token"), undefined);
  assert.equal(redirectedTo, null);
  assert.equal(mod.consumeExpiredNotice(), false);
});

test("without a token there is nothing to recover and no request is made", async () => {
  respond = () => json(401);
  assert.equal(await mod.recoverFromUnauthorized(), false);
  assert.equal(calls.length, 0);
});
