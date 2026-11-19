/**
 * Pure HTML builders for the post-build prerender (see scripts/prerender.ts).
 *
 * The built SPA shell is the template.  Each public page gets its own <head>
 * (title, description, canonical, Open Graph, JSON-LD) and a crawler-visible
 * body inside #root.  The SPA mounts with createRoot, which replaces that
 * body — it is a no-JS / first-pass fallback, never a hydration target, so it
 * cannot cause hydration mismatches.
 */
import { FI_WEEKDAY_TO_EN, LUNCH_RESTAURANT_URL, type LunchDay } from "../../shared/lunchFeed";
import {
  PUBLIC_PAGES,
  SITE_NAME,
  SITE_ORIGIN,
  canonicalUrl,
  pageDescription,
  pageTitle,
  type PublicPage,
} from "../../shared/seo";
import { QUESTIONS } from "../../client/src/content/faq";
import { PRIVACY_UPDATED, SECTIONS } from "../../client/src/content/privacy";

export interface LunchSnapshot {
  days: LunchDay[];
  /** YYYY-MM-DD the feed was read (build day). */
  retrievedOn: string;
}

export interface PrerenderContext {
  /** Built dist/public/index.html. */
  template: string;
  /** null when the feed was unreachable or empty — the page then says so. */
  lunch: LunchSnapshot | null;
  androidVersion: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fiDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}.${m}.${y}`;
};

// ── head editing ───────────────────────────────────────────────────────────

function replaceOnce(html: string, pattern: RegExp, replacement: string, label: string): string {
  if (!pattern.test(html)) throw new Error(`prerender: template is missing ${label}`);
  return html.replace(pattern, () => replacement);
}

const metaPattern = (attr: "name" | "property", key: string) =>
  new RegExp(`<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`);

function setMeta(html: string, attr: "name" | "property", key: string, content: string): string {
  return replaceOnce(html, metaPattern(attr, key), `<meta ${attr}="${key}" content="${esc(content)}">`, `<meta ${attr}="${key}">`);
}

function dropMeta(html: string, attr: "name" | "property", key: string): string {
  return html.replace(metaPattern(attr, key), "");
}

const LD_PATTERN = /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/;

const SHARE_IMAGE = `${SITE_ORIGIN}/icon-512.png`;

function withShareImage(html: string): string {
  return setMeta(setMeta(html, "property", "og:image", SHARE_IMAGE), "name", "twitter:image", SHARE_IMAGE);
}

/** `<` is escaped so no string in the data can close the script element. */
const ldScript = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

// ── structured data ────────────────────────────────────────────────────────

const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const SCHOOL_ID = `${SITE_ORIGIN}/#school`;

const school = {
  "@type": "EducationalOrganization",
  "@id": SCHOOL_ID,
  name: "Kulosaaren yhteiskoulu",
  alternateName: "KSYK",
  url: "https://www.ksyk.fi",
  address: { "@type": "PostalAddress", addressLocality: "Helsinki", addressCountry: "FI" },
  geo: { "@type": "GeoCoordinates", latitude: 60.187, longitude: 25.006 },
  hasMap: `${SITE_ORIGIN}/`,
};

function structuredData(page: PublicPage, ctx: PrerenderContext) {
  const url = canonicalUrl(page.path);
  const webPage = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: pageTitle(page.path),
    description: pageDescription(page.path),
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
  };

  if (page.kind === "home") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": WEBSITE_ID,
          url: `${SITE_ORIGIN}/`,
          name: SITE_NAME,
          description: "Interactive campus map and navigation for Kulosaaren yhteiskoulu",
          inLanguage: ["en", "fi"],
        },
        { ...webPage, about: { "@id": SCHOOL_ID } },
        school,
      ],
    };
  }

  if (page.kind === "download") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        webPage,
        {
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          operatingSystem: "Android",
          applicationCategory: "EducationalApplication",
          softwareVersion: ctx.androidVersion,
          downloadUrl: `${SITE_ORIGIN}${apkHref(ctx.androidVersion)}`,
          url,
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        },
      ],
    };
  }

  return { "@context": "https://schema.org", ...webPage };
}

export const apkHref = (version: string) => `/releases/ksykmaps-release-${version}.apk`;

// ── body ───────────────────────────────────────────────────────────────────

const NAV: ReadonlyArray<{ path: string; label: string }> = [
  { path: "/", label: "Map" },
  { path: "/lunch", label: "Lunch menu" },
  { path: "/download", label: "Get the app" },
  { path: "/faq", label: "FAQ" },
  { path: "/support", label: "Support" },
  { path: "/privacy", label: "Privacy" },
];

function frame(page: PublicPage, main: string): string {
  const nav = NAV.map(
    (item) =>
      `<a href="${item.path}"${item.path === page.path ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`,
  ).join("\n      ");
  return `<div class="pre">
  <header>
    <a class="pre-brand" href="/">${SITE_NAME}</a>
    <nav aria-label="Main">
      ${nav}
    </nav>
  </header>
  <main>
${main}
  </main>
  <footer><p>${SITE_NAME} is a campus map and navigation app for Kulosaaren yhteiskoulu (KSYK), Helsinki.</p></footer>
</div>`;
}

function homeBody(): string {
  return `    <h1>KSYK Maps — campus map of Kulosaaren yhteiskoulu</h1>
    <p>KSYK Maps is an interactive map and navigation app for Kulosaaren yhteiskoulu (KSYK), a school in Helsinki. It shows the school's buildings and rooms so students and visitors can find their way around.</p>
    <h2>What you can do</h2>
    <ul>
      <li>Search for classrooms and other places on campus and open them on the map.</li>
      <li>Get directions between rooms, with floor and 3D views.</li>
      <li>See this week's school <a href="/lunch">lunch menu</a>.</li>
      <li>Check public transport departures near the school (HSL).</li>
      <li>Install the <a href="/download">Android app</a> for home-screen widgets and lesson reminders.</li>
    </ul>
    <p>Questions? Read the <a href="/faq">FAQ</a> or <a href="/support">contact support</a>.</p>
    <noscript><p>The interactive map needs JavaScript. The lunch menu, FAQ and other pages above work without it.</p></noscript>`;
}

function lunchBody(lunch: LunchSnapshot | null): string {
  const intro = `    <h1>Lunch menu <span lang="fi">(Ruokalista)</span></h1>
    <p>Weekly lunch menu of the Kulosaaren yhteiskoulu school restaurant. Menus are published by Amica / Compass Group Finland (restaurant Kulis) and can change without notice.</p>`;
  const source = `<a href="${LUNCH_RESTAURANT_URL}" rel="noopener">Amica / Compass Group Finland</a>`;

  if (!lunch || lunch.days.length === 0) {
    return `${intro}
    <p>The menu could not be loaded when this page was generated. It is published for Monday to Friday — see the latest menu at ${source}.</p>`;
  }

  const dated = lunch.days.map((d) => d.isoDate).filter((d): d is string => !!d);
  const range = dated.length ? ` for ${fiDate(dated[0])} – ${fiDate(dated[dated.length - 1])}` : "";
  const dish = (label: string, fi: string, value: string) =>
    `        <dt>${label} <span lang="fi">(${fi})</span></dt>\n        <dd${value ? ' lang="fi"' : ""}>${value ? esc(value) : "<em>Not available</em>"}</dd>`;

  const days = lunch.days
    .map((day) => {
      const weekday = FI_WEEKDAY_TO_EN[day.dayName.toLowerCase()] ?? day.dayName;
      const heading = day.isoDate
        ? `${esc(weekday)} <time datetime="${day.isoDate}">${fiDate(day.isoDate)}</time>`
        : esc(day.title);
      const rows = [dish("Lunch", "Lounas", day.regular), dish("Vegetarian", "Kasvislounas", day.vegetarian)];
      if (day.dessert) rows.push(dish("Dessert", "Jälkiruoka", day.dessert));
      return `      <article>\n        <h3>${heading}</h3>\n      <dl>\n${rows.join("\n")}\n      </dl>\n      </article>`;
    })
    .join("\n");

  return `${intro}
    <section aria-labelledby="menu-heading">
      <h2 id="menu-heading">Menu${esc(range)}</h2>
${days}
    </section>
    <p class="pre-meta">Snapshot taken on <time datetime="${lunch.retrievedOn}">${fiDate(lunch.retrievedOn)}</time> from ${source}. Dish names are in Finnish; the codes in brackets are the restaurant's allergen and diet markings.</p>`;
}

function downloadBody(androidVersion: string): string {
  return `    <h1>Get the KSYK Maps app</h1>
    <p>Faster than the browser, works offline, home-screen widgets for your schedule.</p>
    <section>
      <h2>Android <span class="pre-meta">v${esc(androidVersion)}</span></h2>
      <ul>
        <li>Home-screen widgets (Now / Next / Today)</li>
        <li>Lesson reminder notifications</li>
        <li>Material You dynamic colors (Android 12+)</li>
      </ul>
      <p><a href="${apkHref(androidVersion)}" download>Download APK</a> — signed release, direct install.</p>
    </section>
    <section>
      <h2>iOS <span class="pre-meta">Coming later</span></h2>
      <p>The iPhone / iPad app is still in design. Until then, install the web app from Safari: Share → Add to Home Screen. It works offline and gets a home icon.</p>
      <p>Want it sooner? <a href="/support">Let us know</a>.</p>
    </section>
    <p><a href="/">Or open the web app in your browser</a> · <a href="/privacy">Privacy policy</a></p>`;
}

function faqBody(): string {
  const items = QUESTIONS.map(
    (q) => `    <section>\n      <h2>${esc(q.qEn ?? q.q)}</h2>\n      <p class="pre-wrap">${esc(q.aEn ?? q.a)}</p>\n    </section>`,
  ).join("\n");
  return `    <h1>Frequently asked questions</h1>
    <p>${QUESTIONS.length} entries about the KSYK Maps app and web app.</p>
${items}
    <p>Didn't find your answer? <a href="/support">Contact support</a> · <a href="/privacy">Privacy</a></p>`;
}

function supportBody(): string {
  return `    <h1>Support and bug reports</h1>
    <p>Use the support form to reach the KSYK Maps team. Pick the kind of message that fits best:</p>
    <ul>
      <li><strong>Bug report</strong> — something broke or looks wrong.</li>
      <li><strong>Feature request</strong> — suggest a new capability.</li>
      <li><strong>Support request</strong> — you need help with something.</li>
      <li><strong>Question</strong> — you are curious about how something works.</li>
    </ul>
    <p>Name and email are optional; add an email address if you want a reply. See the <a href="/privacy">privacy policy</a> for how tickets are handled, or check the <a href="/faq">FAQ</a> first.</p>
    <noscript><p>The support form needs JavaScript.</p></noscript>`;
}

function privacyBody(): string {
  const sections = SECTIONS.map((s, i) => {
    const paragraphs = s.bodyEn
      .split("\n\n")
      .map((p) => `      <p>${esc(p)}</p>`)
      .join("\n");
    return `    <section id="section-${i}">\n      <h2>${esc(s.headingEn)}</h2>\n${paragraphs}\n    </section>`;
  }).join("\n");
  return `    <h1>Privacy policy</h1>
    <p class="pre-meta">${PRIVACY_UPDATED.en} · ${SITE_NAME}</p>
${sections}
    <p>Questions? <a href="/support">Contact support</a> · <a href="/faq">FAQ</a></p>`;
}

function bodyFor(page: PublicPage, ctx: PrerenderContext): string {
  switch (page.kind) {
    case "home": return homeBody();
    case "lunch": return lunchBody(ctx.lunch);
    case "download": return downloadBody(ctx.androidVersion);
    case "faq": return faqBody();
    case "support": return supportBody();
    case "privacy": return privacyBody();
  }
}

// Visible only without JS: with JS the preboot overlay covers it until React
// replaces #root.  Kept tiny and neutral — it is a fallback, not a theme.
const FALLBACK_CSS = `.pre{max-width:44rem;margin:0 auto;padding:1rem;font:16px/1.6 Inter,system-ui,sans-serif;color:#111827}
.pre header{display:flex;flex-wrap:wrap;gap:.5rem 1.25rem;align-items:baseline;border-bottom:1px solid #d5dae0;padding-bottom:.75rem}
.pre nav{display:flex;flex-wrap:wrap;gap:.25rem 1rem}
.pre a{color:#003d82}.pre-brand{font-weight:700;text-decoration:none}
.pre h1{font-size:1.5rem;line-height:1.2}.pre h2{font-size:1.15rem}.pre h3{font-size:1rem}
.pre dt{font-weight:600;margin-top:.5rem}.pre dd{margin:0}.pre-meta{color:#4b5563;font-size:.875rem}.pre-wrap{white-space:pre-line}
@media(prefers-color-scheme:dark){:root:has(.pre) body{background:#030712}.pre{color:#f3f4f6}.pre a{color:#4a90d9}.pre header{border-color:#2a3040}.pre-meta{color:#9ca3af}}`;

const FALLBACK_HEAD = `<noscript><style>#preboot{display:none}</style></noscript>\n    <style>${FALLBACK_CSS}</style>`;

// ── public API ─────────────────────────────────────────────────────────────

export function renderPage(page: PublicPage, ctx: PrerenderContext): string {
  const title = pageTitle(page.path);
  const description = pageDescription(page.path);
  const url = canonicalUrl(page.path);

  let html = ctx.template;
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`, "<title>");
  html = dropMeta(html, "name", "keywords");
  html = replaceOnce(
    html,
    metaPattern("name", "description"),
    `<meta name="description" content="${esc(description)}">\n    <link rel="canonical" href="${url}">`,
    '<meta name="description">',
  );
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = withShareImage(html).replace(LD_PATTERN, "");
  html = replaceOnce(
    html,
    /<\/head>/,
    `    ${ldScript(structuredData(page, ctx))}\n    ${FALLBACK_HEAD}\n  </head>`,
    "</head>",
  );
  html = replaceOnce(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">${frame(page, bodyFor(page, ctx))}</div>`,
    '<div id="root">',
  );
  return html;
}

/**
 * Fallback for every URL that is not a prerendered public page (private
 * screens, token URLs, aliases, unknown paths).  Same SPA, but explicitly
 * noindex and without page-specific claims (no canonical, og:url or JSON-LD).
 */
export function renderAppShell(template: string): string {
  let html = template;
  html = dropMeta(html, "name", "keywords");
  html = dropMeta(html, "property", "og:url");
  html = withShareImage(html).replace(LD_PATTERN, "");
  return replaceOnce(
    html,
    metaPattern("name", "description"),
    `<meta name="description" content="${esc("KSYK Maps — campus map and navigation for Kulosaaren yhteiskoulu.")}">\n    <meta name="robots" content="noindex, nofollow">`,
    '<meta name="description">',
  );
}

export function renderSitemap(): string {
  const urls = PUBLIC_PAGES.map((p) => `  <url>\n    <loc>${canonicalUrl(p.path)}</loc>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
