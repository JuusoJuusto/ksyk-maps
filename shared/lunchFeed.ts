/**
 * Amica / Compass Group lunch feed — the one place that knows the feed URL
 * and how to read it.  Pure TypeScript (no DOM) so the same code runs in the
 * browser (lunch page), the API handlers and the build-time prerender.
 */

export const LUNCH_FEED_URL =
  "https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3026&language=fi";

/** Public restaurant page the feed belongs to (also the feed's own <link>). */
export const LUNCH_RESTAURANT_URL =
  "https://www.compass-group.fi/ravintolat-ja-ruokalistat/amica/kaupungit/helsinki/kulis/";

export const FI_WEEKDAY_TO_EN: Record<string, string> = {
  ma: "Monday", maanantai: "Monday",
  ti: "Tuesday", tiistai: "Tuesday",
  ke: "Wednesday", keskiviikko: "Wednesday",
  to: "Thursday", torstai: "Thursday",
  pe: "Friday", perjantai: "Friday",
};

export interface LunchDay {
  /** Feed title verbatim, e.g. "Maanantai, 26-10-2026". */
  title: string;
  /** Weekday as published (Finnish), e.g. "Maanantai". */
  dayName: string;
  /** YYYY-MM-DD, or null when the title carries no DD-MM-YYYY date. */
  isoDate: string | null;
  /** Empty string = the feed had no entry for that course. */
  regular: string;
  vegetarian: string;
  dessert: string;
}

const XML_ENTITIES: Record<string, string> = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&" };

/** Unwraps CDATA or decodes entities in a single pass (no double-decoding). */
function xmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  if (cdata) return cdata[1];
  return raw.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|amp);/gi, (match, entity: string) => {
    if (entity[0] !== "#") return XML_ENTITIES[entity.toLowerCase()] ?? match;
    const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

function childText(block: string, tag: string): string {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return m ? xmlText(m[1]) : "";
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Reads the RSS body into one entry per feed <item>.  Returns [] for anything
 * that is not a feed (HTML error pages, empty bodies) so callers can show their
 * "menu unavailable" state instead of throwing.
 */
export function parseLunchFeed(xml: string): LunchDay[] {
  if (!xml || !/<item\b/i.test(xml)) return [];
  const days: LunchDay[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const title = childText(block, "title");
    const description = childText(block, "description");

    const dateMatch = title.match(/(\d{2})-(\d{2})-(\d{4})/);
    const isoDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
    const dayName = (title.split(",")[0] || "").trim().split(/\s+/)[0];

    let regular = "";
    let vegetarian = "";
    let dessert = "";
    description
      .split(/<br\s*\/?>/i)
      .map((line) => line.replace(/<[^>]*>/g, "").trim())
      .filter((line) => line.length > 0)
      .forEach((line) => {
        if (line.includes("Kasvislounas:")) vegetarian = collapse(line.replace("Kasvislounas:", ""));
        else if (line.includes("Lounas:")) regular = collapse(line.replace("Lounas:", ""));
        else if (line.includes("Jälkiruoka:")) dessert = collapse(line.replace("Jälkiruoka:", ""));
      });

    days.push({ title, dayName, isoDate, regular, vegetarian, dessert });
  }
  return days;
}
