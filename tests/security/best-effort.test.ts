/**
 * Alert hooks are best-effort: a broken alerts module, a thrown error or a
 * hung Slack call must not turn a sign-in, a log upload or a ticket into a 500.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../seo/helpers";
import { bestEffort } from "../../server/bestEffort";

test("bestEffort: swallows a failed import", async () => {
  const ok = await bestEffort(async () => { await import("../../server/does-not-exist-" + Date.now()); }, 1000);
  assert.equal(ok, false);
});

test("bestEffort: swallows a synchronous throw and a rejection", async () => {
  assert.equal(await bestEffort(() => { throw new Error("boom"); }, 1000), false);
  assert.equal(await bestEffort(() => Promise.reject(new Error("boom")), 1000), false);
});

test("bestEffort: gives up after the time cap and ignores a late failure", async () => {
  const started = Date.now();
  const ok = await bestEffort(() => new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 400)), 50);
  assert.equal(ok, false);
  assert.ok(Date.now() - started < 300, "returned at the cap, not when the task settled");
  await new Promise((r) => setTimeout(r, 500)); // an unhandled rejection would fail the run here
});

test("bestEffort: reports success", async () => {
  assert.equal(await bestEffort(async () => undefined, 1000), true);
});

test("api/index.ts: only owner/cron routes import alerts outside bestEffort", () => {
  const lines = fs.readFileSync(path.join(ROOT, "api/index.ts"), "utf8").split(/\r?\n/);
  const bare: string[] = [];
  lines.forEach((line, i) => {
    if (!line.includes("import('../server/alerts.js')")) return;
    const context = lines.slice(Math.max(0, i - 2), i).join("\n");
    if (!context.includes("bestEffort(")) bare.push(`${i + 1}: ${line.trim()}`);
  });
  // The two that remain sit behind the owner check and the cron secret, where
  // failing loudly is right and nothing else depends on them.
  assert.equal(bare.length, 2, `unguarded alerts imports:\n${bare.join("\n")}`);
  assert.ok(bare.some((l) => l.includes("sendDailyDigest")));
  assert.ok(bare.some((l) => l.includes("const alerts")));
});
