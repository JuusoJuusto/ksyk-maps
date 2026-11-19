import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import {
  NOINDEX_ROOTS,
  PUBLIC_PAGES,
  SITE_ORIGIN,
  canonicalUrl,
  pageDescription,
  pageTitle,
  type PublicPage,
} from "../../shared/seo";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
export const vercelConfig = () =>
  JSON.parse(read("vercel.json")) as {
    rewrites: { source: string; destination: string }[];
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };

const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const attr = (html: string, tagRe: RegExp) => tagRe.exec(html)?.[1];

export const titleOf = (html: string) => attr(html, /<title>([\s\S]*?)<\/title>/);
export const metaOf = (html: string, kind: "name" | "property", key: string) =>
  attr(html, new RegExp(`<meta\\s+${kind}="${key}"\\s+content="([^"]*)"`));
export const canonicalsOf = (html: string) => [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
export const jsonLdOf = (html: string): unknown[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

/** The prerendered body only (what a crawler sees without running JS). */
export function bodyOf(html: string): string {
  const start = html.indexOf('<div id="root">');
  assert.ok(start >= 0, "no #root");
  return html.slice(start, html.indexOf("<script", start));
}

export const unescapeHtml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** Root-relative internal links in the prerendered body. */
export function internalLinks(html: string): string[] {
  return [...bodyOf(html).matchAll(/<a\s[^>]*href="(\/[^"]*)"/g)].map((m) => m[1]);
}

/** Everything a prerendered public page must satisfy, regardless of how it was produced. */
export function assertPublicPage(html: string, page: PublicPage) {
  const url = canonicalUrl(page.path);
  const label = page.path;

  assert.equal(count(html, /<title>/g), 1, `${label}: exactly one <title>`);
  assert.equal(titleOf(html), pageTitle(page.path), `${label}: title`);
  assert.equal(metaOf(html, "name", "description"), pageDescription(page.path), `${label}: description`);
  assert.deepEqual(canonicalsOf(html), [url], `${label}: exactly one canonical, absolute https on the canonical host`);
  assert.equal(metaOf(html, "property", "og:url"), url, `${label}: og:url matches canonical`);
  assert.equal(metaOf(html, "property", "og:title"), pageTitle(page.path), `${label}: og:title`);
  assert.equal(metaOf(html, "name", "twitter:title"), pageTitle(page.path), `${label}: twitter:title`);
  assert.equal(metaOf(html, "property", "og:image"), `${SITE_ORIGIN}/icon-512.png`, `${label}: og:image host`);
  assert.equal(count(html, /<meta\s+name="robots"/g), 0, `${label}: public pages carry no robots meta (default is index)`);
  assert.equal(count(html, /noindex/gi), 0, `${label}: nothing says noindex`);
  assert.ok(!html.includes("https://ksykmaps.fi"), `${label}: no apex-host URLs (apex redirects to www)`);

  const body = bodyOf(html);
  assert.equal(count(body, /<h1[\s>]/g), 1, `${label}: exactly one <h1>`);
  assert.ok(count(body, /<a\s[^>]*href="\//g) >= 4, `${label}: crawlable navigation links`);
  assert.ok(html.includes('<script type="module"'), `${label}: SPA entry script kept so client navigation still boots`);

  const ld = jsonLdOf(html);
  assert.equal(ld.length, 1, `${label}: one JSON-LD block`);
  const graph = JSON.stringify(ld[0]);
  assert.ok(graph.includes(`"url":"${url}"`), `${label}: JSON-LD names the canonical url`);
}

// ── robots.txt ──────────────────────────────────────────────────────────────

export interface RobotsRules {
  allow: string[];
  disallow: string[];
  sitemaps: string[];
}

export function parseRobots(txt: string): RobotsRules {
  const rules: RobotsRules = { allow: [], disallow: [], sitemaps: [] };
  let inStar = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, value] = m;
    const k = key.toLowerCase();
    if (k === "user-agent") inStar = value === "*";
    else if (k === "sitemap") rules.sitemaps.push(value);
    else if (inStar && k === "allow" && value) rules.allow.push(value);
    else if (inStar && k === "disallow" && value) rules.disallow.push(value);
  }
  return rules;
}

/** Google semantics: the longest matching rule wins; Allow wins a tie. */
export function robotsAllows(rules: RobotsRules, urlPath: string): boolean {
  const longest = (list: string[]) =>
    list.filter((r) => urlPath.startsWith(r)).reduce((n, r) => Math.max(n, r.length), -1);
  return longest(rules.allow) >= longest(rules.disallow);
}

// ── vercel.json routing ─────────────────────────────────────────────────────

/** Converts the path-to-regexp subset used in vercel.json to a RegExp. */
export function sourceToRegExp(source: string): RegExp {
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === ".") out += source[i + 1] === "*" ? "." : "\\.";
    else if (c === ":") {
      const m = /^:\w+\*/.exec(source.slice(i));
      if (!m) throw new Error(`unsupported source syntax: ${source}`);
      out += "(.*)";
      i += m[0].length - 1;
    } else out += c;
  }
  return new RegExp(`^${out}$`);
}

export type Resolved = { kind: "file"; file: string } | { kind: "function" } | { kind: "miss" };

/** Mirrors Vercel's order: filesystem first, then rewrites in file order. */
export function resolveRoute(dist: string, urlPath: string): Resolved {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const fileFor = (p: string): string | null => {
    const abs = path.join(dist, p);
    if (!abs.startsWith(dist)) return null;
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
    const index = path.join(abs, "index.html");
    return fs.existsSync(index) && fs.statSync(abs).isDirectory() ? index : null;
  };
  const direct = fileFor(clean);
  if (direct) return { kind: "file", file: direct };

  for (const rule of vercelConfig().rewrites) {
    if (!sourceToRegExp(rule.source).test(clean)) continue;
    if (rule.destination === "/api") return { kind: "function" };
    const dest = rule.destination.includes(":") ? clean : rule.destination;
    const file = fileFor(dest);
    return file ? { kind: "file", file } : { kind: "miss" };
  }
  return { kind: "miss" };
}

// ── app routes ──────────────────────────────────────────────────────────────

export const appRoutePaths = () =>
  [...read("client/src/App.tsx").matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);

export const publicPaths = () => PUBLIC_PAGES.map((p) => p.path);
export const noindexRoots = () => [...NOINDEX_ROOTS];
