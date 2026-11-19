/**
 * Post-build prerender: `vite build && tsx scripts/prerender.ts`.
 *
 * Turns dist/public/index.html (the SPA shell) into one static HTML file per
 * public route, an app-shell.html fallback for everything else, and the
 * sitemap — all driven by shared/seo.ts.  No database access: the only data
 * pulled in is the public lunch feed, which is optional (the page says so when
 * it is unreachable).  Env overrides exist for tests:
 *   PRERENDER_DIST            build directory (default dist/public)
 *   PRERENDER_LUNCH_FEED_FILE read the feed from a file instead of the network
 *   PRERENDER_SKIP_LUNCH=1    behave as if the feed were unreachable
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LUNCH_FEED_URL, parseLunchFeed } from "../shared/lunchFeed";
import { PUBLIC_PAGES } from "../shared/seo";
import { ANDROID_APP_VERSION } from "../client/src/lib/changelog";
import {
  apkHref,
  renderAppShell,
  renderPage,
  renderSitemap,
  type LunchSnapshot,
} from "./prerender/render";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.resolve(process.env.PRERENDER_DIST ?? path.join(root, "dist", "public"));

async function loadLunch(): Promise<LunchSnapshot | null> {
  try {
    let xml: string;
    if (process.env.PRERENDER_LUNCH_FEED_FILE) {
      xml = fs.readFileSync(process.env.PRERENDER_LUNCH_FEED_FILE, "utf8");
    } else if (process.env.PRERENDER_SKIP_LUNCH === "1") {
      return null;
    } else {
      const res = await fetch(LUNCH_FEED_URL, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    }
    const days = parseLunchFeed(xml);
    if (days.length === 0) throw new Error("feed contained no menu items");
    const retrievedOn = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Helsinki" });
    return { days, retrievedOn };
  } catch (err) {
    // Never fail a deploy over third-party data — the page degrades to a note.
    console.warn(`[prerender] lunch feed unavailable, /lunch will show the fallback: ${(err as Error).message}`);
    return null;
  }
}

function writePage(relative: string, html: string) {
  const file = path.join(dist, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

async function main() {
  const templatePath = path.join(dist, "index.html");
  if (!fs.existsSync(templatePath)) throw new Error(`no ${templatePath} — run vite build first`);
  const template = fs.readFileSync(templatePath, "utf8");
  if (!template.includes('<div id="root"></div>')) {
    throw new Error("index.html is already prerendered (or has no empty #root) — rebuild with vite build");
  }

  // The structured data advertises this file, so a missing APK is a broken release.
  const apk = path.join(dist, apkHref(ANDROID_APP_VERSION));
  if (!fs.existsSync(apk)) throw new Error(`ANDROID_APP_VERSION ${ANDROID_APP_VERSION} has no ${apkHref(ANDROID_APP_VERSION)} in the build`);

  const ctx = { template, lunch: await loadLunch(), androidVersion: ANDROID_APP_VERSION };

  // Shell first: "/" overwrites index.html below.
  writePage("app-shell.html", renderAppShell(template));
  for (const page of PUBLIC_PAGES) {
    writePage(page.path === "/" ? "index.html" : path.join(page.path.slice(1), "index.html"), renderPage(page, ctx));
  }
  writePage("sitemap.xml", renderSitemap());

  console.log(
    `[prerender] ${PUBLIC_PAGES.length} pages + app-shell.html + sitemap.xml written to ${path.relative(root, dist) || "."}` +
      ` (lunch: ${ctx.lunch ? `${ctx.lunch.days.length} days` : "fallback"})`,
  );
}

main().catch((err) => {
  console.error(`[prerender] ${(err as Error).message}`);
  process.exit(1);
});
