/**
 * @ksyk/shared/search — indexed, fuzzy, weighted search.
 *
 * Zero-dependency full-text search over arbitrary documents. Designed for
 * the KSYK Maps room-search bar but generic enough to index any keyed
 * text corpus. Optimises for:
 *
 *  - **Prefix + substring matches** — "9" finds "912", "phy" finds
 *    "Physics Lab", "au" finds "Auditorium".
 *  - **Typo tolerance** — one edit (add/remove/swap/replace a letter)
 *    still scores on tokens ≥ 4 chars, two edits on tokens ≥ 6.
 *  - **Token-order independence** — "lab 105" and "105 lab" both hit
 *    "Room 105 Lab".
 *  - **Weighted fields** — title beats subtitle beats body; explicit
 *    keywords/aliases weigh the same as the title.
 *  - **Highlights** — result includes the exact character ranges that
 *    matched so the UI can render `<mark>` spans.
 *
 * We use a lightweight inverted index (token → docs) to shortlist
 * candidates so `search()` doesn't scan every doc for every query. The
 * scorer only runs against shortlisted docs.
 */

/** A single document in the index. */
export interface SearchDoc<D = unknown> {
  id: string;
  /** Free-form category — used to filter (e.g. "room", "building"). */
  kind?: string;
  /** Primary text — heaviest weighted field. */
  title: string;
  /** Secondary text — e.g. "Building A · Floor 2". */
  subtitle?: string;
  /** Free-form searchable text — description, address, etc. */
  body?: string;
  /** Explicit alias/tag tokens — weighted same as `title`. Order-insensitive. */
  keywords?: string[];
  /** Payload returned in `SearchHit.doc.data`. */
  data?: D;
}

/** Options for `search()`. */
export interface SearchOptions {
  /** Max hits returned. Default 20. */
  limit?: number;
  /** Restrict to one or more kinds. */
  kind?: string | string[];
  /** Minimum acceptable score, 0..1. Default 0.15. */
  minScore?: number;
  /** Enable single-edit typo matches (default true). */
  fuzzy?: boolean;
}

/** A single highlight range inside one of the doc's text fields. */
export interface SearchHighlight {
  field: "title" | "subtitle" | "body" | "keywords";
  /** Zero-based character offset into the (untokenized, raw) field. */
  start: number;
  end: number;
}

/** A ranked search result. */
export interface SearchHit<D = unknown> {
  id: string;
  score: number;
  doc: SearchDoc<D>;
  highlights: SearchHighlight[];
}

/** Field weight table — higher = matches in that field push a doc up.
 *
 *  Title is now WAY heavier than keywords so the actual displayed name
 *  always outranks tag/alias matches. Keywords used to tie with title
 *  which caused "search hits everything except the name I typed"
 *  behaviour — a room aliased with "computer" would beat a building
 *  literally named "Computer Wing". */
const WEIGHT_TITLE = 3.0;
const WEIGHT_KEYWORDS = 0.8;
const WEIGHT_SUBTITLE = 0.7;
const WEIGHT_BODY = 0.4;

/** Per-match kind scores. Multiplied by field weight, then summed and
 *  normalised by the query token count. */
const SCORE_EXACT = 1.0;
const SCORE_PREFIX = 0.85;
const SCORE_SUBSTRING = 0.65;
const SCORE_EDIT1 = 0.45;
const SCORE_EDIT2 = 0.25;

/**
 * Normalise text for matching: lowercase, strip diacritics, collapse
 * whitespace. Keeps digits + letters + spaces; drops everything else.
 * We keep the RAW string alongside so highlights point at original
 * offsets — the normaliser must produce a string of the SAME length as
 * the input for that to work.
 */
function normalizeSameLength(s: string): string {
  // NFD decomposition splits `ä` into `a` + combining mark. `stripCombining`
  // then drops the combining mark, so we'd end up shorter than the input.
  // We use a per-char lookup instead — same length in, same length out.
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const lo = ch.toLowerCase();
    // ASCII fast path
    if (lo >= "a" && lo <= "z") { out.push(lo); continue; }
    if (lo >= "0" && lo <= "9") { out.push(lo); continue; }
    // Common accented forms → ASCII. We only handle single-char folds
    // here because we must preserve length.
    const folded = FOLD_MAP[lo];
    if (folded && folded.length === 1) { out.push(folded); continue; }
    // Whitespace + punctuation → space (still 1 char).
    out.push(" ");
  }
  return out.join("");
}

/** Per-char accent fold. Kept small — covers the Nordic + common Latin
 *  characters KSYK's data actually uses. */
const FOLD_MAP: Record<string, string> = {
  "ä": "a", "å": "a", "á": "a", "à": "a", "â": "a", "ã": "a",
  "ö": "o", "ó": "o", "ò": "o", "ô": "o", "õ": "o", "ø": "o",
  "é": "e", "è": "e", "ê": "e", "ë": "e",
  "í": "i", "ì": "i", "î": "i", "ï": "i",
  "ú": "u", "ù": "u", "û": "u", "ü": "u",
  "ý": "y", "ÿ": "y",
  "ñ": "n",
  "ç": "c",
  "ß": "s",
};

/** Tokenise on whitespace runs. Returns tokens + their character offsets
 *  in the normalised (and thus also the raw) string. */
function tokenize(normalised: string): Array<{ tok: string; start: number; end: number }> {
  const out: Array<{ tok: string; start: number; end: number }> = [];
  let i = 0;
  while (i < normalised.length) {
    while (i < normalised.length && normalised[i] === " ") i++;
    const start = i;
    while (i < normalised.length && normalised[i] !== " ") i++;
    if (i > start) out.push({ tok: normalised.slice(start, i), start, end: i });
  }
  return out;
}

/** Levenshtein distance capped at `maxDist` — returns Infinity above the
 *  cap so callers can early-out. Two-row DP, O(n) memory. */
function editDistanceCapped(a: string, b: string, maxDist: number): number {
  if (Math.abs(a.length - b.length) > maxDist) return Infinity;
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    // If the whole row exceeds the cap, no completion can be under it.
    if (rowMin > maxDist) return Infinity;
    [prev, curr] = [curr, prev];
  }
  return prev[m];
}

/** Best score for matching one query token against one indexed token,
 *  plus the substring range (in the indexed token) that matched. */
interface TokenMatch {
  score: number;
  /** Character range inside the raw string this token came from. */
  start: number;
  end: number;
}

/** Prefix score = SCORE_PREFIX * (queryLen / targetLen) clamped in
 *  [SCORE_PREFIX * 0.4, SCORE_PREFIX]. Longer prefix of the target =
 *  stronger match. */
function prefixScore(queryLen: number, targetLen: number): number {
  const raw = SCORE_PREFIX * (queryLen / targetLen);
  const min = SCORE_PREFIX * 0.4;
  return Math.max(min, Math.min(SCORE_PREFIX, raw));
}

/** Internal — precomputed per doc. */
interface IndexedDoc<D> {
  doc: SearchDoc<D>;
  /** For each field, the normalised string + its tokens. */
  fields: Array<{
    field: SearchHighlight["field"];
    weight: number;
    normalized: string;
    tokens: Array<{ tok: string; start: number; end: number }>;
  }>;
  /** Every unique token substring (length ≥ 2) that appears anywhere in
   *  the doc — used for inverted-index shortlisting. Also includes every
   *  full token for exact lookups. */
  tokenSet: Set<string>;
}

/** The public search index. */
export class SearchIndex<D = unknown> {
  private docs = new Map<string, IndexedDoc<D>>();
  /** Inverted index: 2-3-4-char shingles + full tokens → doc ids. */
  private inverted = new Map<string, Set<string>>();

  constructor(initial?: Array<SearchDoc<D>>) {
    if (initial) this.addMany(initial);
  }

  get size(): number { return this.docs.size; }

  add(doc: SearchDoc<D>): void {
    if (this.docs.has(doc.id)) this.remove(doc.id);
    const indexed = this.buildIndexedDoc(doc);
    this.docs.set(doc.id, indexed);
    for (const shingle of indexed.tokenSet) {
      let bucket = this.inverted.get(shingle);
      if (!bucket) {
        bucket = new Set();
        this.inverted.set(shingle, bucket);
      }
      bucket.add(doc.id);
    }
  }

  addMany(docs: Array<SearchDoc<D>>): void {
    for (const d of docs) this.add(d);
  }

  remove(id: string): void {
    const existing = this.docs.get(id);
    if (!existing) return;
    for (const shingle of existing.tokenSet) {
      const bucket = this.inverted.get(shingle);
      if (bucket) {
        bucket.delete(id);
        if (bucket.size === 0) this.inverted.delete(shingle);
      }
    }
    this.docs.delete(id);
  }

  clear(): void {
    this.docs.clear();
    this.inverted.clear();
  }

  search(query: string, opts: SearchOptions = {}): SearchHit<D>[] {
    const limit = opts.limit ?? 20;
    const minScore = opts.minScore ?? 0.15;
    const fuzzy = opts.fuzzy ?? true;
    const kindFilter = opts.kind
      ? (Array.isArray(opts.kind) ? new Set(opts.kind) : new Set([opts.kind]))
      : null;

    const qNorm = normalizeSameLength(query.trim());
    if (!qNorm) return [];
    const qTokens = tokenize(qNorm).map((t) => t.tok);
    if (qTokens.length === 0) return [];

    // Shortlist: union of doc ids that contain at least one shingle of at
    // least one query token. For 1-char query tokens we scan everything —
    // there's no useful shingle.
    const candidates = new Set<string>();
    for (const qt of qTokens) {
      if (qt.length < 2) {
        for (const id of this.docs.keys()) candidates.add(id);
        break;
      }
      const shingles = shinglesFor(qt);
      let matched = false;
      for (const s of shingles) {
        const bucket = this.inverted.get(s);
        if (bucket) {
          matched = true;
          for (const id of bucket) candidates.add(id);
        }
      }
      // If a token has no shingle bucket, only fuzzy matches can save it.
      // We conservatively widen to all docs so the fuzzy pass can find
      // near-misses. This is O(n) but only when the query has weird tokens.
      if (!matched && fuzzy) {
        for (const id of this.docs.keys()) candidates.add(id);
        break;
      }
    }

    const hits: SearchHit<D>[] = [];
    for (const id of candidates) {
      const idx = this.docs.get(id)!;
      if (kindFilter && !kindFilter.has(idx.doc.kind ?? "")) continue;
      const scored = scoreDoc(idx, qTokens, fuzzy);
      if (!scored) continue;
      if (scored.score < minScore) continue;
      hits.push({
        id: idx.doc.id,
        score: scored.score,
        doc: idx.doc,
        highlights: scored.highlights,
      });
    }
    hits.sort((a, b) => (b.score - a.score) || a.doc.title.localeCompare(b.doc.title));
    if (hits.length > limit) hits.length = limit;
    return hits;
  }

  private buildIndexedDoc(doc: SearchDoc<D>): IndexedDoc<D> {
    const fields: IndexedDoc<D>["fields"] = [];
    const tokenSet = new Set<string>();

    const push = (
      field: SearchHighlight["field"],
      raw: string | undefined,
      weight: number,
    ) => {
      if (!raw) return;
      const normalized = normalizeSameLength(raw);
      const tokens = tokenize(normalized);
      fields.push({ field, weight, normalized, tokens });
      for (const t of tokens) {
        tokenSet.add(t.tok);
        for (const s of shinglesFor(t.tok)) tokenSet.add(s);
      }
    };

    push("title", doc.title, WEIGHT_TITLE);
    push("subtitle", doc.subtitle, WEIGHT_SUBTITLE);
    push("body", doc.body, WEIGHT_BODY);
    if (doc.keywords && doc.keywords.length) {
      // Keywords are a virtual field; each keyword is treated as its own
      // 1-token string with the KEYWORDS weight. Highlights point into
      // the joined string with " " separators so the UI can locate them.
      const joined = doc.keywords.join(" ");
      push("keywords", joined, WEIGHT_KEYWORDS);
    }

    return { doc, fields, tokenSet };
  }
}

/** Produce 2- and 3-char shingles of a token, plus the token itself. Used
 *  by the inverted index. Short tokens (< 2 chars) become their raw form. */
function shinglesFor(tok: string): string[] {
  if (tok.length < 2) return [tok];
  const out: string[] = [tok];
  for (let i = 0; i <= tok.length - 2; i++) out.push(tok.slice(i, i + 2));
  if (tok.length >= 3) {
    for (let i = 0; i <= tok.length - 3; i++) out.push(tok.slice(i, i + 3));
  }
  return out;
}

/** Score one doc against all query tokens. Returns null if no field
 *  matched at all. All query tokens must contribute for the doc to
 *  score positively (AND semantics). */
function scoreDoc<D>(
  idx: IndexedDoc<D>,
  qTokens: string[],
  fuzzy: boolean,
): { score: number; highlights: SearchHighlight[] } | null {
  const highlights: SearchHighlight[] = [];
  let totalScore = 0;
  let matchedTokens = 0;

  for (const qt of qTokens) {
    // For this query token, find the best-scoring match across all fields.
    let bestScore = 0;
    let bestField: SearchHighlight["field"] | null = null;
    let bestStart = 0;
    let bestEnd = 0;

    for (const f of idx.fields) {
      for (const t of f.tokens) {
        const m = matchTokens(qt, t.tok, t.start, fuzzy);
        if (!m) continue;
        const weighted = m.score * f.weight;
        if (weighted > bestScore) {
          bestScore = weighted;
          bestField = f.field;
          bestStart = m.start;
          bestEnd = m.end;
        }
      }
      // Also try matching the query token as a substring across the whole
      // field — catches multi-token queries like "phys lab" against a
      // field "physics lab" where individual tokens already handle it,
      // but also "phys" against "biophysics" which wouldn't shingle-hit
      // any single token.
      if (qt.length >= 3) {
        const idxOf = f.normalized.indexOf(qt);
        if (idxOf >= 0) {
          const substringScore = SCORE_SUBSTRING * (qt.length / Math.max(qt.length, f.normalized.length)) * f.weight;
          if (substringScore > bestScore) {
            bestScore = substringScore;
            bestField = f.field;
            bestStart = idxOf;
            bestEnd = idxOf + qt.length;
          }
        }
      }
    }

    if (bestScore > 0 && bestField) {
      totalScore += bestScore;
      matchedTokens += 1;
      highlights.push({ field: bestField, start: bestStart, end: bestEnd });
    }
  }

  if (matchedTokens === 0) return null;

  // All query tokens must contribute — partial matches drop the score
  // sharply so exact hits win.
  const coverage = matchedTokens / qTokens.length;
  const normalised = (totalScore / qTokens.length) * coverage;
  // Clamp to [0, 1]. Max per-token contribution is SCORE_EXACT * max weight = 1.5.
  const clamped = Math.min(1, normalised / (SCORE_EXACT * WEIGHT_TITLE));
  return { score: clamped, highlights };
}

/** Match one query token against one indexed token. Wraps
 *  scoreTokenMatch to fix the earlier prefix formula. */
function matchTokens(
  query: string,
  target: string,
  targetStart: number,
  fuzzy: boolean,
): TokenMatch | null {
  if (query === target) {
    return { score: SCORE_EXACT, start: targetStart, end: targetStart + target.length };
  }
  if (target.startsWith(query)) {
    return {
      score: prefixScore(query.length, target.length),
      start: targetStart,
      end: targetStart + query.length,
    };
  }
  const idx = target.indexOf(query);
  if (idx >= 0) {
    return {
      score: SCORE_SUBSTRING * (query.length / target.length),
      start: targetStart + idx,
      end: targetStart + idx + query.length,
    };
  }
  if (fuzzy) {
    if (query.length >= 4 && target.length >= 3) {
      const d = editDistanceCapped(query, target, 1);
      if (d <= 1) {
        return { score: SCORE_EDIT1, start: targetStart, end: targetStart + target.length };
      }
    }
    if (query.length >= 6 && target.length >= 5) {
      const d = editDistanceCapped(query, target, 2);
      if (d <= 2) {
        return { score: SCORE_EDIT2, start: targetStart, end: targetStart + target.length };
      }
    }
  }
  return null;
}
