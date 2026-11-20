/**
 * The admin-token signing key must never be a constant from the public source.
 * Regression test for: production ran without SESSION_SECRET, so a token signed
 * with the hardcoded fallback string was accepted and anyone could forge an
 * admin/owner session.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, read } from "../seo/helpers";

const OLD_PUBLIC_FALLBACKS = ["ksyk-maps-admin-built-in-fallback-key-v1", "ksyk-insecure-fallback-set-session-secret-in-vercel"];
const DB = "postgres://nobody:nothing@127.0.0.1:1/none";
type Handler = (req: unknown, res: unknown) => Promise<unknown>;
let handler: Handler;

before(async () => {
  process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "ksyk-secret-test-")));
  process.env.DATABASE_URL = DB;
  process.env.SESSION_SECRET = "t".repeat(48);
  handler = (await import(pathToFileURL(path.join(ROOT, "api/index.ts")).href)).default;
});

async function status(method: string, url: string, authorization: string) {
  const out: { status?: number } = {};
  const res = {
    setHeader() { return res; }, getHeader() { return undefined; },
    status(c: number) { out.status = c; return res; }, json() { return res; }, send() { return res; }, end() { return res; },
  };
  const req = { method, url, headers: { "x-forwarded-for": "203.0.113.9", authorization }, query: {}, body: {} };
  await Promise.race([handler(req, res), new Promise((r) => setTimeout(r, 3000))]);
  return out.status;
}

const sign = (secret: string, role = "admin") => {
  const payload = Buffer.from(JSON.stringify({ userId: "u1", role, exp: Date.now() + 60_000 })).toString("base64url");
  return `Bearer ${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url")}`;
};

test("no constant signing key from the public source is accepted, with or without SESSION_SECRET", async () => {
  for (const secret of OLD_PUBLIC_FALLBACKS) {
    assert.equal(await status("GET", "/api/users", sign(secret, "owner")), 401, `with SESSION_SECRET set, key "${secret.slice(0, 12)}..."`);
  }
  const saved = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET; // the production misconfiguration
  try {
    for (const secret of OLD_PUBLIC_FALLBACKS) {
      assert.equal(await status("GET", "/api/users", sign(secret, "owner")), 401, `SESSION_SECRET unset, key "${secret.slice(0, 12)}..."`);
      assert.equal(await status("POST", "/api/auth/admin-refresh", sign(secret, "owner")), 401);
    }
    // ...and legitimate sign-in keeps working: the key is derived from a private server secret.
    const derived = crypto.createHmac("sha256", DB).update("ksyk-admin-token-key-v2").digest("hex");
    assert.notEqual(await status("GET", "/api/users", sign(derived)), 401, "the derived key still authenticates");
  } finally {
    process.env.SESSION_SECRET = saved;
  }
});

test("with no server secret at all the API fails closed instead of using a constant", async () => {
  const saved = { s: process.env.SESSION_SECRET, d: process.env.DATABASE_URL };
  delete process.env.SESSION_SECRET;
  delete process.env.DATABASE_URL;
  try {
    for (const secret of OLD_PUBLIC_FALLBACKS) assert.equal(await status("GET", "/api/users", sign(secret, "owner")), 401);
  } finally {
    process.env.SESSION_SECRET = saved.s;
    process.env.DATABASE_URL = saved.d;
  }
});

test("source: the old fallback constants are gone from the API and the dev server", () => {
  for (const file of ["api/index.ts", "server/routes.ts"]) {
    const src = read(file);
    for (const c of OLD_PUBLIC_FALLBACKS) assert.ok(!src.includes(c), `${file} still contains a public fallback signing key`);
  }
});
