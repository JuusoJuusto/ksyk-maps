import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LUNCH_FEED_URL, parseLunchFeed } from "../../shared/lunchFeed";
import { ROOT, read } from "./helpers";

const feed = fs.readFileSync(path.join(ROOT, "tests/seo/fixtures/lunch-feed.xml"), "utf8");

test("parses one entry per feed item from a real Amica feed", () => {
  const days = parseLunchFeed(feed);
  assert.equal(days.length, 5);
  assert.deepEqual(days.map((d) => d.dayName), ["Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai"]);
  assert.deepEqual(days.map((d) => d.isoDate), ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]);
});

test("extracts lunch and vegetarian courses and collapses the feed's line breaks", () => {
  const [monday] = parseLunchFeed(feed);
  assert.equal(monday.regular, "Tonnikalakastiketta (*, A, G, ILM, L) Luomutäysjyväpastaa (*, A, ILM, L, M, Veg)");
  assert.equal(monday.vegetarian, "Soija-kasviskastiketta (*, A, ILM, L, M, Veg, VS) Luomutäysjyväpastaa (*, A, ILM, L, M, Veg)");
  assert.equal(monday.dessert, "");
});

test("never invents a course the feed does not label (Friday carries no course labels)", () => {
  const friday = parseLunchFeed(feed)[4];
  assert.equal(friday.regular, "");
  assert.equal(friday.vegetarian, "");
});

test("reads CDATA and numeric entities the same as escaped markup", () => {
  const xml = `<rss><channel><item>
    <title><![CDATA[Maanantai, 02-11-2026]]></title>
    <description><![CDATA[Kasvislounas:
Kaalikääryleitä<br>Lounas:
Kala &amp; peruna<br>Jälkiruoka:
Omena]]></description></item>
  <item><title>Tiistai, 03-11-2026</title><description>Lounas: Keitto &#228;&lt;br&gt;Kasvislounas: Pasta</description></item></channel></rss>`;
  const [a, b] = parseLunchFeed(xml);
  assert.equal(a.vegetarian, "Kaalikääryleitä");
  assert.equal(a.regular, "Kala &amp; peruna", "CDATA content is taken verbatim");
  assert.equal(a.dessert, "Omena");
  assert.equal(b.isoDate, "2026-11-03");
  assert.equal(b.regular, "Keitto ä");
  assert.equal(b.vegetarian, "Pasta");
});

test("returns [] for anything that is not a feed so callers can show their fallback", () => {
  assert.deepEqual(parseLunchFeed(""), []);
  assert.deepEqual(parseLunchFeed("<html><body>502 Bad Gateway</body></html>"), []);
  assert.deepEqual(parseLunchFeed('{"error":"Failed to fetch lunch menu"}'), []);
});

test("the feed URL has a single definition: no handler or page repeats it", () => {
  assert.match(LUNCH_FEED_URL, /^https:\/\/www\.compass-group\.fi\/menuapi\/feed\/rss\//);
  for (const file of ["api/index.ts", "server/routes.ts", "client/src/pages/lunch.tsx"]) {
    assert.ok(!read(file).includes("compass-group.fi/menuapi"), `${file} must import LUNCH_FEED_URL, not copy it`);
  }
});
