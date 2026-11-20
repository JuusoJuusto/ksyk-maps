import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NOINDEX_ROOTS, PUBLIC_PAGES, SITE_ORIGIN, canonicalUrl, findPublicPage } from "../../shared/seo";
import {
  ROOT,
  appRoutePaths,
  parseRobots,
  read,
  robotsAllows,
  sourceToRegExp,
  vercelConfig,
} from "./helpers";

// ── registry ────────────────────────────────────────────────────────────────

test("canonical origin is https on the host that actually serves content", () => {
  assert.equal(SITE_ORIGIN, "https://www.ksykmaps.fi");
  assert.ok(!SITE_ORIGIN.endsWith("/"));
});

test("registry: unique paths, sensible metadata, no overlap with noindex roots", () => {
  const paths = PUBLIC_PAGES.map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(new Set(PUBLIC_PAGES.map((p) => p.title.en)).size, paths.length, "titles must be unique");
  assert.equal(new Set(PUBLIC_PAGES.map((p) => p.description.en)).size, paths.length, "descriptions must be unique");
  for (const page of PUBLIC_PAGES) {
    assert.ok(page.title.en.length >= 10 && page.title.en.length <= 65, `${page.path} title length ${page.title.en.length}`);
    assert.ok(page.description.en.length >= 70 && page.description.en.length <= 165, `${page.path} description length ${page.description.en.length}`);
    assert.ok(page.path === "/" || /^\/[a-z-]+$/.test(page.path), `${page.path} is a flat lowercase path`);
    assert.ok(!NOINDEX_ROOTS.includes(page.path.slice(1)), `${page.path} is both public and noindex`);
    assert.match(canonicalUrl(page.path), /^https:\/\/www\.ksykmaps\.fi(\/|\/[a-z-]+)$/);
  }
  assert.equal(findPublicPage("/lunch/?utm=1#x")?.path, "/lunch", "query, hash and trailing slash normalise");
});

test("titles and descriptions: no em/en dashes, a title that says what the page is, finnish text where offered", () => {
  for (const page of PUBLIC_PAGES) {
    for (const lang of ["en", "fi"] as const) {
      for (const field of ["title", "description"] as const) {
        const text = page[field][lang];
        if (text === undefined) continue;
        assert.ok(!/[–—]/.test(text), `${page.path} ${field}.${lang} contains an em/en dash`);
      }
      const fi = page.title.fi;
      if (lang === "fi" && fi) assert.ok(fi.length >= 10 && fi.length <= 65, `${page.path} fi title length ${fi.length}`);
    }
  }
  // /download is what "ksyk maps" lands on: the title must say download, not just the brand.
  const dl = findPublicPage("/download")!;
  assert.match(dl.title.en, /^Download KSYK Maps/);
  assert.match(dl.description.en, /download/i);
  assert.match(findPublicPage("/faq")!.title.en, /FAQ/);
  // Each page carries its own description in Finnish too, where the page is offered in Finnish.
  for (const kind of ["/download", "/faq"]) {
    const p = findPublicPage(kind)!;
    assert.ok(p.title.fi && p.description.fi, `${kind} has finnish title and description`);
    assert.ok(p.description.fi!.length >= 70 && p.description.fi!.length <= 175, `${kind} fi description length`);
  }
});

test("no apex-domain URL is published anywhere search engines read: www is the only host", () => {
  const dir = path.join(ROOT, "public");
  const candidates = ["robots.txt", ".well-known/security.txt", "security.txt"];
  for (const rel of candidates) {
    const file = path.join(dir, rel);
    if (!fs.existsSync(file)) continue;
    assert.ok(!/https?:\/\/ksykmaps\.fi/i.test(fs.readFileSync(file, "utf8")), `${rel} names the apex host`);
  }
  const html = read("client/index.html");
  assert.ok(!/https?:\/\/ksykmaps\.fi/i.test(html), "index.html names the apex host");
  // The sitemap generator only ever emits canonical (www) URLs.
  for (const page of PUBLIC_PAGES) assert.ok(canonicalUrl(page.path).startsWith("https://www.ksykmaps.fi"));
  // And the apex is redirected permanently, not served.
  const redirects = (vercelConfig() as { redirects?: Array<{ has?: Array<{ value: string }>; destination: string; permanent?: boolean }> }).redirects ?? [];
  const apex = redirects.find((r) => r.has?.some((h) => h.value === "ksykmaps.fi"));
  assert.ok(apex, "vercel.json redirects the apex host");
  assert.equal(apex!.permanent, true);
  assert.ok(apex!.destination.startsWith("https://www.ksykmaps.fi/"));
});

test("the APK is served as a download: attachment, correct type, versioned name", () => {
  const headers = (vercelConfig() as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> }).headers;
  const rule = headers.find((h) => h.source.includes("releases") && h.source.includes("apk"));
  assert.ok(rule, "vercel.json has an /releases/*.apk header rule");
  const get = (k: string) => rule!.headers.find((h) => h.key.toLowerCase() === k.toLowerCase())?.value;
  assert.equal(get("Content-Type"), "application/vnd.android.package-archive");
  assert.equal(get("Content-Disposition"), "attachment");
});

test("every route the SPA defines is deliberately public or noindex", () => {
  const routes = appRoutePaths();
  assert.ok(routes.length > 10, "route extraction found App.tsx routes");
  for (const route of routes) {
    const root = route.split("/")[1] ?? "";
    const ok = route === "/" ? true : !!findPublicPage(route) || NOINDEX_ROOTS.includes(root);
    assert.ok(ok, `route ${route} is neither in PUBLIC_PAGES nor NOINDEX_ROOTS — decide which in shared/seo.ts`);
  }
  for (const page of PUBLIC_PAGES) {
    assert.ok(routes.includes(page.path), `${page.path} is in the registry but not a SPA route`);
  }
});

// ── vercel.json ─────────────────────────────────────────────────────────────

test("vercel.json: each public page rewrites to its static file and the catch-all is the noindex shell", () => {
  const { rewrites } = vercelConfig();
  for (const page of PUBLIC_PAGES.filter((p) => p.path !== "/")) {
    const rule = rewrites.find((r) => r.source === page.path);
    assert.equal(rule?.destination, `${page.path}/index.html`, `${page.path} rewrite`);
  }
  const last = rewrites[rewrites.length - 1];
  assert.deepEqual(last, { source: "/(.*)", destination: "/app-shell.html" });
  const apiIdx = rewrites.findIndex((r) => r.source === "/api/(.*)");
  assert.ok(apiIdx >= 0 && apiIdx < rewrites.length - 1, "API rewrite stays ahead of the catch-all");
});

test("vercel.json: X-Robots-Tag covers every noindex root and nothing public", () => {
  const rule = vercelConfig().headers.find((h) => h.headers.some((x) => x.key === "X-Robots-Tag"));
  assert.ok(rule, "X-Robots-Tag header rule exists");
  assert.match(rule.headers.find((x) => x.key === "X-Robots-Tag")!.value, /noindex/);
  const re = sourceToRegExp(rule.source);
  for (const root of NOINDEX_ROOTS) {
    assert.ok(re.test(`/${root}`), `/${root} is noindexed`);
  }
  for (const probe of ["/admin/users", "/grant/abc123", "/api/rooms", "/api/lunch-menu", "/builder/x"]) {
    assert.ok(re.test(probe), `${probe} is noindexed`);
  }
  for (const probe of ["/", "/lunch", "/download", "/faq", "/support", "/privacy", "/apple-touch-icon.png", "/assets/index.js", "/sitemap.xml", "/robots.txt"]) {
    assert.ok(!re.test(probe), `${probe} must stay indexable`);
  }
});

test("vercel.json is valid and keeps the existing security headers", () => {
  const all = vercelConfig().headers.flatMap((h) => h.headers.map((x) => x.key));
  for (const key of ["X-Frame-Options", "X-Content-Type-Options", "Strict-Transport-Security", "Content-Security-Policy"]) {
    assert.ok(all.includes(key), `${key} still configured`);
  }
});

// ── robots.txt ──────────────────────────────────────────────────────────────

// Adding a path here is a privacy decision: it lets crawlers fetch that API response.
const APPROVED_CRAWLABLE_API = [
  "/api/lunch-menu", "/api/buildings", "/api/rooms", "/api/pois", "/api/announcements",
  "/api/map-package/published", "/api/doors", "/api/elevators", "/api/hallways", "/api/layers",
  "/api/map-defaults", "/api/stairs", "/api/client-info",
];

test("robots.txt: public pages and render-time data crawlable, private areas not", () => {
  const rules = parseRobots(read("public/robots.txt"));
  for (const page of PUBLIC_PAGES) assert.ok(robotsAllows(rules, page.path), `${page.path} crawlable`);
  for (const p of ["/sitemap.xml", "/assets/index-abc.js", "/assets/index-abc.css", "/releases/ksykmaps-release-1.2.0.apk", "/icon-512.png"]) {
    assert.ok(robotsAllows(rules, p), `${p} crawlable (needed to render or reference pages)`);
  }
  assert.ok(robotsAllows(rules, "/api/lunch-menu"), "lunch data must be fetchable by Google's renderer");
  for (const p of ["/admin", "/admin/users", "/admin-login", "/admin-ksyk-management-portal", "/builder", "/grant/abc", "/secret-easter-egg",
    "/api/staff", "/api/users", "/api/tickets", "/api/settings", "/api/security-settings", "/api/auth/user", "/api/logs"]) {
    assert.ok(!robotsAllows(rules, p), `${p} must be disallowed`);
  }
  assert.deepEqual(rules.sitemaps, [`${SITE_ORIGIN}/sitemap.xml`]);
});

test("robots.txt: the API allow-list contains only approved read-only endpoints", () => {
  const rules = parseRobots(read("public/robots.txt"));
  const allowedApi = rules.allow.filter((r) => r.startsWith("/api/"));
  for (const entry of allowedApi) assert.ok(APPROVED_CRAWLABLE_API.includes(entry), `${entry} is not an approved crawlable API path`);
  assert.ok(allowedApi.includes("/api/lunch-menu"));
});

test("there is exactly one robots.txt and no hand-written sitemap to drift", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "public/robots.txt")));
  assert.ok(!fs.existsSync(path.join(ROOT, "client/public/robots.txt")), "client/public is not Vite's publicDir; a copy there only misleads");
  assert.ok(!fs.existsSync(path.join(ROOT, "client/public/sitemap.xml")));
  assert.ok(!fs.existsSync(path.join(ROOT, "public/sitemap.xml")), "sitemap.xml is generated from shared/seo.ts at build time");
});

test("source index.html carries no page-specific SEO that every route would inherit", () => {
  const html = read("client/index.html");
  assert.ok(!/rel="canonical"/.test(html), "a canonical here would be inherited by every URL");
  assert.ok(!/application\/ld\+json/.test(html), "structured data is emitted per page by the prerender");
  assert.ok(!html.includes("https://ksykmaps.fi"), "apex host redirects to www");
  assert.ok(html.includes('<div id="root"></div>'), "prerender needs the empty mount point");
});
