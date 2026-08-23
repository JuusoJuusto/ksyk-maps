/**
 * Multi-stage classroom matcher for Wilma location strings.
 *
 * Pipeline (highest priority first):
 *   1. Alias match — pre-approved manual mappings
 *   2. Exact roomNumber match (case-insensitive)
 *   3. Normalized match (remove spaces, dots, dashes)
 *   4. Room name / Finnish name full-text match
 *   5. Token match — extracted room-code candidates vs roomNumber
 *   6. Fuzzy string similarity (Levenshtein ≥ 80 %)
 *   7. No match
 *
 * Deterministic stages always win over fuzzy. ML is explicitly NOT used
 * because it would produce false positives on unrelated room names.
 *
 * Confidence thresholds:
 *   ≥ 90 → HIGH (auto-attach, show to user)
 *   70–89 → MEDIUM (show with note, allow correction)
 *   < 70  → LOW (do not auto-attach)
 */

export interface MatchableRoom {
  id: string;
  roomNumber: string;
  name?: string | null;
  nameFi?: string | null;
  nameEn?: string | null;
}

export interface RoomAlias {
  id: string;
  wilmaString: string;
  roomId: string;
}

export interface RoomMatch {
  roomId: string | null;
  roomNumber: string | null;
  confidence: number;      // 0–100
  method: MatchMethod;
}

export type MatchMethod =
  | 'alias'
  | 'exact'
  | 'normalized'
  | 'name'
  | 'token'
  | 'fuzzy'
  | 'none';

// -------------------------------------------------------------------
// Main entry point
// -------------------------------------------------------------------

export function matchRoom(
  wilmaLocation: string,
  rooms: MatchableRoom[],
  aliases: RoomAlias[],
): RoomMatch {
  const loc = wilmaLocation?.trim() ?? '';
  if (!loc) return noMatch();

  // 1. Alias match
  const normLoc = norm(loc);
  for (const alias of aliases) {
    if (norm(alias.wilmaString) === normLoc) {
      const room = rooms.find(r => r.id === alias.roomId);
      if (room) return hit(room, 99, 'alias');
    }
  }

  // 2. Exact roomNumber match
  for (const room of rooms) {
    if (room.roomNumber.toUpperCase() === loc.toUpperCase()) {
      return hit(room, 98, 'exact');
    }
  }

  // 3. Normalized match (collapse all non-alphanum)
  for (const room of rooms) {
    if (norm(room.roomNumber) === normLoc) return hit(room, 95, 'normalized');
    if (room.name && norm(room.name) === normLoc) return hit(room, 92, 'name');
    if (room.nameFi && norm(room.nameFi) === normLoc) return hit(room, 92, 'name');
    if (room.nameEn && norm(room.nameEn) === normLoc) return hit(room, 90, 'name');
  }

  // Extract room-code candidates from the Wilma location string
  const candidates = extractRoomCodes(loc);

  // 4. Exact candidate match
  for (const c of candidates) {
    for (const room of rooms) {
      if (room.roomNumber.toUpperCase() === c.toUpperCase()) {
        return hit(room, 95, 'exact');
      }
    }
  }

  // 5. Normalized candidate match
  for (const c of candidates) {
    const nc = norm(c);
    for (const room of rooms) {
      if (norm(room.roomNumber) === nc) return hit(room, 88, 'token');
      if (room.name && norm(room.name) === nc) return hit(room, 85, 'token');
      if (room.nameFi && norm(room.nameFi) === nc) return hit(room, 85, 'token');
    }
  }

  // 6. Fuzzy match — Levenshtein on each candidate vs each roomNumber
  let best: RoomMatch = noMatch();
  for (const c of candidates) {
    for (const room of rooms) {
      const sim = similarity(c, room.roomNumber);
      if (sim >= 80 && sim > best.confidence) {
        best = { roomId: room.id, roomNumber: room.roomNumber, confidence: sim, method: 'fuzzy' };
      }
      // Also fuzzy against room name
      if (room.name) {
        const ns = similarity(c, room.name);
        if (ns >= 80 && ns > best.confidence) {
          best = { roomId: room.id, roomNumber: room.roomNumber, confidence: ns, method: 'fuzzy' };
        }
      }
    }
  }
  if (best.roomId) return best;

  return noMatch();
}

// -------------------------------------------------------------------
// Room-code extraction
// -------------------------------------------------------------------

/**
 * Extract plausible room-code tokens from a Wilma location string.
 * Handles formats like:
 *   "K27 K27 Liikuntasali"  → ["K27"]
 *   "Luokka K27 - Sala"     → ["K27"]
 *   "312"                   → ["312"]
 *   "C1.01"                 → ["C1.01"]
 *   "Liikuntasali"          → ["Liikuntasali"]
 */
export function extractRoomCodes(location: string): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];

  const add = (s: string) => {
    const t = s.trim();
    if (t && !seen.has(t.toUpperCase())) {
      seen.add(t.toUpperCase());
      codes.push(t);
    }
  };

  // Pattern 1: Alphanumeric room codes like K27, A101, C1.01, B-203
  const codePattern = /\b([A-Z][A-Z0-9.]{0,2}[0-9]{1,3}(?:\.[0-9]{1,2})?)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = codePattern.exec(location)) !== null) {
    add(m[1]);
  }

  // Pattern 2: Numeric-only room numbers 3+ digits
  const numPattern = /\b(\d{3,4})\b/g;
  while ((m = numPattern.exec(location)) !== null) {
    add(m[1]);
  }

  // Remove obvious Finnish prepositions that got captured
  const skip = /^(luokka|sala|huone|room|aula|hall)$/i;
  const filtered = codes.filter(c => !skip.test(c));

  // If nothing extracted, use the whole string (for named rooms like "Liikuntasali")
  if (filtered.length === 0) {
    // Split by common separators and use each word
    const tokens = location
      .split(/[\s\-/,]+/)
      .map(t => t.trim())
      .filter(t => t.length >= 3);
    // Deduplicate (Wilma often repeats room codes: "K27 K27 Liikuntasali")
    const deduped = [...new Set(tokens.map(t => t.toLowerCase()))].map(t =>
      tokens.find(orig => orig.toLowerCase() === t) ?? t
    );
    return deduped;
  }

  // Deduplicate the extracted codes too (handles "K27 K27 Liikuntasali")
  const unique = [...new Set(filtered.map(c => c.toUpperCase()))].map(u =>
    filtered.find(c => c.toUpperCase() === u) ?? u
  );
  return unique;
}

// -------------------------------------------------------------------
// String normalization
// -------------------------------------------------------------------

/** Lowercase, collapse non-alphanumeric to empty, trim. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (ä→a etc.)
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// -------------------------------------------------------------------
// Levenshtein distance → similarity %
// -------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const dp: number[][] = Array.from({ length: an + 1 }, (_, i) =>
    Array.from({ length: bn + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[an][bn];
}

/** Returns 0–100 similarity score between two strings. */
function similarity(a: string, b: string): number {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return Math.round((1 - dist / maxLen) * 100);
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function hit(room: MatchableRoom, confidence: number, method: MatchMethod): RoomMatch {
  return { roomId: room.id, roomNumber: room.roomNumber, confidence, method };
}

function noMatch(): RoomMatch {
  return { roomId: null, roomNumber: null, confidence: 0, method: 'none' };
}
