/**
 * Verifies the real build artifact (`npm run build`), not the generator:
 * what Vercel will actually serve, read the way a non-JS crawler reads it.
 * Run `npm run build` first; override the location with SEO_DIST.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PUBLIC_PAGES, NOINDEX_ROOTS, canonicalUrl, findPublicPage } from "../../shared/seo";
import {
  ROOT,
  appRoutePaths,
  assertPublicPage,
  bodyOf,
  internalLinks,
  parseRobots,
  resolveRoute,
  robotsAllows,
} from "./helpers";

const dist = path.resolve(process.env.SEO_DIST ?? path.join(ROOT, "dist", "public"));
const built = fs.existsSync(path.join(dist, "app-shell.html"));
const need = (rel: string) => path.join(dist, rel);
const html = (rel: string) => fs.readFileSync(need(rel), "utf8");

test("build output is present and prerendered (run `npm run build`)", () => {
  assert.ok(built, `${dist} has no app-shell.html — run "npm run build" (vite build + scripts/prerender.ts) first`);
});

if (built) {
  test("each public URL resolves, as Vercel would route it, to its own prerendered file", () => {
    for (const p of PUBLIC_PAGES) {
      const expected = need(p.path === "/" ? "index.html" : path.join(p.path.slice(1), "index.html"));
      for (const url of p.path === "/" ? ["/"] : [p.path, `${p.path}/`, `${p.path}?ref=x`]) {
        const r = resolveRoute(dist, url);
        assert.deepEqual(r, { kind: "file", file: expected }, `${url} -> prerendered page`);
      }
    }
  });

  test("direct navigation and refresh: every prerendered page still boots the SPA", () => {
    const shell = html("app-shell.html");
    const entry = /<script type="module"[^>]*src="(\/assets\/[^"]+)"/.exec(shell)![1];
    assert.ok(fs.existsSync(need(entry)), "entry bundle exists");
    for (const p of PUBLIC_PAGES) {
      const page = html(p.path === "/" ? "index.html" : `${p.path.slice(1)}/index.html`);
      assert.ok(page.includes(`src="${entry}"`), `${p.path} loads the same entry bundle`);
      assert.ok(page.includes("</body>") && page.includes('<div id="root">'), `${p.path} is a complete document`);
    }
  });

  test("private, aliased and unknown URLs get the noindex shell or the API function — never a prerendered page", () => {
    const shell = need("app-shell.html");
    for (const url of ["/admin", "/admin/users", "/admin/tickets/abc", "/builder", "/grant/some-token", "/hsl", "/app", "/report",
      "/secret-easter-egg", "/admin-login", "/directory", "/definitely-not-a-page", "/lunch/nested/deeper"]) {
      assert.deepEqual(resolveRoute(dist, url), { kind: "file", file: shell }, url);
    }
    assert.deepEqual(resolveRoute(dist, "/api/lunch-menu"), { kind: "function" });
    assert.deepEqual(resolveRoute(dist, "/api/staff"), { kind: "function" });
  });

  test("static resources crawlers need are served as files", () => {
    for (const url of ["/robots.txt", "/sitemap.xml", "/icon-512.png", "/favicon-32.png", "/googlevUBd9f2wMyl7J57qZ_eZCbgf6T5ELUYwrTPs-A-hl7I.html"]) {
      assert.equal(resolveRoute(dist, url).kind, "file", url);
    }
  });

  test("every prerendered page satisfies the public-page contract in the real build", () => {
    for (const p of PUBLIC_PAGES) assertPublicPage(html(p.path === "/" ? "index.html" : `${p.path.slice(1)}/index.html`), p);
  });

  test("lunch page has either the live menu or the honest fallback", () => {
    const body = bodyOf(html("lunch/index.html"));
    const hasMenu = /<article>[\s\S]*<dl>/.test(body);
    const hasFallback = /could not be loaded/.test(body);
    assert.ok(hasMenu !== hasFallback, "exactly one of menu / fallback");
    if (hasMenu) assert.match(body, /Snapshot taken on <time datetime="\d{4}-\d{2}-\d{2}">/);
  });

  test("internal links resolve, and none promotes a private or noindex route", () => {
    const appRoutes = appRoutePaths();
    for (const p of PUBLIC_PAGES) {
      const page = html(p.path === "/" ? "index.html" : `${p.path.slice(1)}/index.html`);
      const links = internalLinks(page);
      assert.ok(links.length > 0);
      for (const href of links) {
        const target = href.split(/[?#]/)[0] || "/";
        const isFile = /\.[a-z0-9]+$/i.test(target);
        if (isFile) {
          assert.equal(resolveRoute(dist, target).kind, "file", `${p.path} links to missing file ${href}`);
        } else {
          assert.ok(findPublicPage(target), `${p.path} links to ${href}, which is not an indexable page`);
          assert.ok(appRoutes.includes(target), `${p.path} links to ${href}, which is not an SPA route`);
          assert.ok(!NOINDEX_ROOTS.includes(target.split("/")[1] ?? ""), `${p.path} links to noindex route ${href}`);
        }
      }
    }
  });

  test("sitemap.xml in the build only lists pages that exist, resolve to themselves and are crawlable", () => {
    const xml = html("sitemap.xml");
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.deepEqual(locs, PUBLIC_PAGES.map((p) => canonicalUrl(p.path)));
    const robots = parseRobots(html("robots.txt"));
    for (const loc of locs) {
      const p = new URL(loc).pathname;
      assert.ok(robotsAllows(robots, p), `${loc} is blocked by robots.txt`);
      const r = resolveRoute(dist, p);
      assert.equal(r.kind, "file");
      assert.ok(!(r as { file: string }).file.endsWith("app-shell.html"), `${loc} would be served the noindex shell`);
    }
    assert.deepEqual(robots.sitemaps, [`${canonicalUrl("/sitemap.xml")}`]);
  });

  test("the build ships the repo's robots.txt unchanged", () => {
    assert.equal(html("robots.txt"), fs.readFileSync(path.join(ROOT, "public/robots.txt"), "utf8"));
  });
}
