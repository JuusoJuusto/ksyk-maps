/**
 * Runs the real prerender CLI against a throw-away dist built from the source
 * index.html, so these tests need no Vite build and no network.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PUBLIC_PAGES, canonicalUrl } from "../../shared/seo";
import { ANDROID_APP_VERSION } from "../../client/src/lib/changelog";
import {
  ROOT,
  assertPublicPage,
  bodyOf,
  canonicalsOf,
  jsonLdOf,
  metaOf,
  read,
  titleOf,
} from "./helpers";

const FEED = path.join(ROOT, "tests/seo/fixtures/lunch-feed.xml");
const dirs: string[] = [];

function makeDist({ apk = true }: { apk?: boolean } = {}): string {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), "ksyk-prerender-"));
  dirs.push(dist);
  fs.writeFileSync(path.join(dist, "index.html"), read("client/index.html"));
  if (apk) {
    fs.mkdirSync(path.join(dist, "releases"));
    fs.writeFileSync(path.join(dist, "releases", `ksykmaps-release-${ANDROID_APP_VERSION}.apk`), "x");
  }
  return dist;
}

function runPrerender(dist: string, env: Record<string, string>) {
  return spawnSync(process.execPath, ["--import", "tsx", path.join(ROOT, "scripts/prerender.ts")], {
    cwd: ROOT,
    env: { ...process.env, PRERENDER_DIST: dist, ...env },
    encoding: "utf8",
  });
}

const page = (dist: string, p: string) =>
  fs.readFileSync(path.join(dist, p === "/" ? "index.html" : path.join(p.slice(1), "index.html")), "utf8");

let withMenu: string;
let withoutMenu: string;

before(() => {
  withMenu = makeDist();
  const a = runPrerender(withMenu, { PRERENDER_LUNCH_FEED_FILE: FEED });
  assert.equal(a.status, 0, a.stderr);
  withoutMenu = makeDist();
  const b = runPrerender(withoutMenu, { PRERENDER_SKIP_LUNCH: "1" });
  assert.equal(b.status, 0, b.stderr);
});
after(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

test("every registered page is written and satisfies the public-page contract", () => {
  for (const p of PUBLIC_PAGES) assertPublicPage(page(withMenu, p.path), p);
});

test("pages are distinct documents: unique titles, descriptions, canonicals and h1s", () => {
  const html = PUBLIC_PAGES.map((p) => page(withMenu, p.path));
  const unique = (xs: (string | undefined)[]) => new Set(xs).size === xs.length;
  assert.ok(unique(html.map(titleOf)));
  assert.ok(unique(html.map((h) => metaOf(h, "name", "description"))));
  assert.ok(unique(html.map((h) => canonicalsOf(h)[0])));
  assert.ok(unique(html.map((h) => /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(bodyOf(h))?.[1])));
});

test("lunch page contains the real menu from the shared feed parser", () => {
  const body = bodyOf(page(withMenu, "/lunch"));
  for (const dish of ["Tonnikalakastiketta", "Soija-kasviskastiketta", "Broileripyöryköitä", "Punajuurikroketteja", "Burgerpastaa", "Vegaanista burgerpastaa"]) {
    assert.ok(body.includes(dish), `lunch page lists ${dish}`);
  }
  assert.equal((body.match(/<article>/g) ?? []).length, 5, "one article per weekday");
  assert.match(body, /<time datetime="2026-10-26">26\.10\.2026<\/time>/);
  assert.match(body, /Snapshot taken on/);
  assert.ok(!/invented|placeholder/i.test(body));
});

test("an unlabeled course is shown as unavailable, never guessed", () => {
  const body = bodyOf(page(withMenu, "/lunch"));
  const friday = body.slice(body.indexOf('datetime="2026-10-30"'), body.indexOf("</article>", body.indexOf('datetime="2026-10-30"')));
  assert.equal((friday.match(/Not available/g) ?? []).length, 2);
  assert.ok(!friday.includes("Nyhtöhernettä"), "Friday's unlabeled dishes are not assigned to a course");
});

test("with the feed unavailable the lunch page degrades to a fallback with no meals", () => {
  const html = page(withoutMenu, "/lunch");
  const body = bodyOf(html);
  assert.match(body, /could not be loaded/);
  assert.ok(!body.includes("<article>") && !body.includes("<dl>"), "no menu markup");
  assert.ok(body.includes("compass-group.fi"), "points at the authoritative source");
  assertPublicPage(html, PUBLIC_PAGES.find((p) => p.path === "/lunch")!);
});

test("feed text can never inject markup: tags are dropped, special characters escaped", () => {
  const dist = makeDist();
  const feed = `<rss><channel>
    <item><title>Maanantai, 02-11-2026</title><description>Lounas: &lt;img src=x onerror=alert(1)&gt;Soppa&lt;br&gt;Kasvislounas: Fish &amp;amp; chips "x" 5 &amp;lt; 6</description></item>
  </channel></rss>`;
  const file = path.join(dist, "feed.xml");
  fs.writeFileSync(file, feed);
  assert.equal(runPrerender(dist, { PRERENDER_LUNCH_FEED_FILE: file }).status, 0);
  const body = bodyOf(page(dist, "/lunch"));
  assert.ok(!body.includes("<img") && !body.includes("onerror="), "injected tag must not survive");
  assert.ok(body.includes("Soppa"), "text around the dropped tag is kept");
  assert.ok(body.includes("Fish &amp;amp; chips &quot;x&quot; 5 &amp;lt; 6"), "ampersands, quotes and angle brackets are escaped exactly once");
});

test("download page links the APK that exists and advertises the same version", () => {
  const html = page(withMenu, "/download");
  const apk = `/releases/ksykmaps-release-${ANDROID_APP_VERSION}.apk`;
  assert.ok(bodyOf(html).includes(`href="${apk}"`));
  const app = (jsonLdOf(html)[0] as { "@graph": Record<string, unknown>[] })["@graph"].find((n) => n["@type"] === "SoftwareApplication");
  assert.ok(app, "SoftwareApplication present");
  assert.equal(app.softwareVersion, ANDROID_APP_VERSION);
  assert.equal(app.downloadUrl, `https://www.ksykmaps.fi${apk}`);
  assert.equal(app.operatingSystem, "Android");
  assert.ok(!("aggregateRating" in app) && !("review" in app), "no invented ratings");
});

test("homepage structured data: WebSite + WebPage + the school as the subject, not as publisher", () => {
  const [ld] = jsonLdOf(page(withMenu, "/")) as { "@graph": Record<string, unknown>[] }[];
  const types = ld["@graph"].map((n) => n["@type"]);
  assert.deepEqual(types, ["WebSite", "WebPage", "EducationalOrganization"]);
  assert.ok(!JSON.stringify(ld).includes('"publisher"'));
});

test("faq and privacy pages carry the full shared copy", () => {
  const faq = bodyOf(page(withMenu, "/faq"));
  assert.ok(faq.includes("How do I connect my Wilma timetable?"));
  assert.equal((faq.match(/<section>/g) ?? []).length, 10);
  const privacy = bodyOf(page(withMenu, "/privacy"));
  assert.ok(privacy.includes("What we collect") && privacy.includes("Your rights"));
  assert.ok(privacy.includes("Updated September 2026"));
});

test("app-shell.html is noindex and makes no page-specific claims", () => {
  const html = fs.readFileSync(path.join(withMenu, "app-shell.html"), "utf8");
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.deepEqual(canonicalsOf(html), []);
  assert.deepEqual(jsonLdOf(html), []);
  assert.equal(metaOf(html, "property", "og:url"), undefined);
  assert.ok(html.includes('<div id="root"></div>'), "still the empty SPA mount");
});

test("sitemap.xml lists exactly the registered pages as absolute canonical https URLs", () => {
  const xml = fs.readFileSync(path.join(withMenu, "sitemap.xml"), "utf8");
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.ok(xml.trimEnd().endsWith("</urlset>"));
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, PUBLIC_PAGES.map((p) => canonicalUrl(p.path)));
  assert.equal((xml.match(/<url>/g) ?? []).length, locs.length);
  for (const loc of locs) {
    assert.match(loc, /^https:\/\/www\.ksykmaps\.fi(\/|\/[a-z-]+)$/);
    assert.ok(!/[?#&]/.test(loc), `${loc} has no query, fragment or entity`);
  }
});

test("fails loudly instead of shipping a half-built site", () => {
  const rerun = runPrerender(withMenu, { PRERENDER_SKIP_LUNCH: "1" });
  assert.notEqual(rerun.status, 0, "second run over prerendered output must refuse");
  assert.match(rerun.stderr, /already prerendered/);

  const noApk = makeDist({ apk: false });
  const r = runPrerender(noApk, { PRERENDER_SKIP_LUNCH: "1" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /has no \/releases\/ksykmaps-release-/);

  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "ksyk-prerender-"));
  dirs.push(empty);
  assert.notEqual(runPrerender(empty, {}).status, 0, "no index.html means vite build did not run");
});
