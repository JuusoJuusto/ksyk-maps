/**
 * @ksyk/shared/poi/categories — Shape B category tree for POIs.
 *
 * A POI category is identified by a slash-delimited path
 * ("amenity/food/cafe"). Each category can override its parent's
 * display name, icon, color, and search aliases; anything left unset
 * inherits from the nearest ancestor with a value.
 *
 * Rationale (from the design sketch in v3.30.1):
 *
 * - **Nested inheritance** — every restroom variant shares a base
 *   style (pink chip, 🚻 glyph) unless the variant overrides it
 *   (M chip blue with ♂). Adding a new variant is a one-line
 *   subcategory registration, not another `["match"]` arm in the
 *   paint expression.
 *
 * - **Search aliases** — typing "gents" resolves to
 *   `amenity/restroom/m` even though the display name is
 *   "Men's restroom." Aliases live on the category so search behaves
 *   consistently regardless of which POI you're looking at.
 *
 * - **Backward compat** — the existing flat `kind: string` field on
 *   Firestore `campus_pois` still works. On load we treat the kind
 *   as a category path when it contains a slash, or look it up in
 *   the legacy alias table otherwise. Existing rooms with
 *   `kind: "restroom_m"` resolve to `amenity/restroom/m` via the
 *   LEGACY_KIND_MAP below.
 *
 * The registry itself lives here for now (code-authored, editable via
 * PR). A follow-up wave moves it into Firestore + adds an admin CRUD
 * UI so non-engineers can register new categories.
 */

/** A node in the category tree. */
export interface PoiCategory {
  /** Slash path. Root categories have no slash ("amenity"). */
  path: string;
  /** Human-readable display name shown in the info drawer + search. */
  displayName: string;
  /** Optional English display name; falls back to displayName. */
  displayNameEn?: string;
  /** Optional Finnish display name; falls back to displayName. */
  displayNameFi?: string;
  /** Single glyph rendered inside the pin. Emojis or unicode. */
  icon?: string;
  /** Chip fill color (light tint). */
  chipColor?: string;
  /** Chip stroke + tail color (bold accent). */
  strokeColor?: string;
  /** Alternative search terms. Typing any of these finds this
   *  category in the POI picker + the global search. */
  searchAliases?: string[];
}

/** The category registry. Every category with a defined style lives
 *  here; leaf categories inherit their ancestor's fields via
 *  {@link resolveCategoryStyle}. */
export const POI_CATEGORIES: readonly PoiCategory[] = [
  // ── amenity/ ─────────────────────────────────────────────────────
  { path: "amenity",           displayName: "Amenity",
    icon: "•", chipColor: "#f3f4f6", strokeColor: "#6b7280" },

  { path: "amenity/restroom",  displayName: "Restroom",
    displayNameFi: "WC",
    icon: "🚻", chipColor: "#fce7f3", strokeColor: "#be185d",
    searchAliases: ["toilet", "wc", "vessa", "bathroom"] },
  { path: "amenity/restroom/m", displayName: "Men's restroom",
    displayNameFi: "Miesten WC",
    icon: "♂", chipColor: "#dbeafe", strokeColor: "#2563eb",
    searchAliases: ["mens", "gents", "miesten"] },
  { path: "amenity/restroom/f", displayName: "Women's restroom",
    displayNameFi: "Naisten WC",
    icon: "♀", chipColor: "#fce7f3", strokeColor: "#be185d",
    searchAliases: ["womens", "ladies", "naisten"] },
  { path: "amenity/restroom/a", displayName: "Accessible restroom",
    displayNameFi: "Esteetön WC",
    icon: "♿", chipColor: "#e9d5ff", strokeColor: "#7c3aed",
    searchAliases: ["disabled", "wheelchair", "esteetön"] },

  { path: "amenity/food",      displayName: "Food",
    icon: "🍴", chipColor: "#fef3c7", strokeColor: "#a16207" },
  { path: "amenity/food/cafe", displayName: "Café",
    displayNameFi: "Kahvila",
    icon: "☕", searchAliases: ["coffee"] },
  { path: "amenity/food/vending", displayName: "Vending",
    displayNameFi: "Myyntiautomaatti",
    icon: "🍫" },
  { path: "amenity/food/canteen", displayName: "Canteen",
    displayNameFi: "Ruokala",
    icon: "🍽" },

  { path: "amenity/water",     displayName: "Drinking fountain",
    displayNameFi: "Juoma-automaatti",
    icon: "💧", chipColor: "#cffafe", strokeColor: "#0891b2",
    searchAliases: ["fountain", "drinking"] },

  { path: "amenity/parking",   displayName: "Parking",
    displayNameFi: "Pysäköinti",
    icon: "Ⓟ", chipColor: "#e0f2fe", strokeColor: "#0369a1" },
  { path: "amenity/parking/bike", displayName: "Bike parking",
    displayNameFi: "Pyöräparkki",
    icon: "🚲", chipColor: "#dcfce7", strokeColor: "#16a34a" },

  // ── info/ ────────────────────────────────────────────────────────
  { path: "info",              displayName: "Information",
    icon: "ⓘ", chipColor: "#e0f2fe", strokeColor: "#0ea5e9" },
  { path: "info/reception",    displayName: "Reception",
    displayNameFi: "Vastaanotto",
    icon: "☎", searchAliases: ["desk"] },
  { path: "info/meeting_point", displayName: "Meeting point",
    displayNameFi: "Kokoontumispaikka",
    icon: "⚑", chipColor: "#dcfce7", strokeColor: "#059669" },

  // ── safety/ ──────────────────────────────────────────────────────
  { path: "safety",            displayName: "Safety",
    icon: "＋", chipColor: "#fee2e2", strokeColor: "#dc2626" },
  { path: "safety/first_aid",  displayName: "First aid",
    displayNameFi: "Ensiapu",
    icon: "＋" },
  { path: "safety/defibrillator", displayName: "Defibrillator",
    displayNameFi: "Defibrillaattori",
    icon: "⚡", chipColor: "#ffe4e6", strokeColor: "#e11d48",
    searchAliases: ["aed"] },

  // ── transit/ ─────────────────────────────────────────────────────
  { path: "transit",           displayName: "Transit",
    icon: "⇕", chipColor: "#fef3c7", strokeColor: "#b45309" },
  { path: "transit/stairs",    displayName: "Stairs",
    displayNameFi: "Portaat",
    icon: "⇕" },
  { path: "transit/elevator",  displayName: "Elevator",
    displayNameFi: "Hissi",
    icon: "⇳", chipColor: "#dbeafe", strokeColor: "#2563eb" },
  { path: "transit/door",      displayName: "Door",
    displayNameFi: "Ovi",
    icon: "◫", chipColor: "#f3f4f6", strokeColor: "#4b5563" },
  { path: "transit/entrance",  displayName: "Entrance",
    displayNameFi: "Sisäänkäynti",
    icon: "▶", chipColor: "#dcfce7", strokeColor: "#15803d" },
  { path: "transit/exit",      displayName: "Exit",
    displayNameFi: "Uloskäynti",
    icon: "◄", chipColor: "#fee2e2", strokeColor: "#b91c1c" },

  // ── services/ ────────────────────────────────────────────────────
  { path: "services",          displayName: "Services",
    icon: "🖨", chipColor: "#f3f4f6", strokeColor: "#4b5563" },
  { path: "services/printer",  displayName: "Printer",
    displayNameFi: "Tulostin",
    icon: "🖨" },
];

/** Legacy flat `kind` strings mapped to their category paths so the
 *  existing Firestore data keeps working during migration. */
export const LEGACY_KIND_MAP: Readonly<Record<string, string>> = {
  restroom:      "amenity/restroom",
  bathroom:      "amenity/restroom",
  restroom_m:    "amenity/restroom/m",
  restroom_f:    "amenity/restroom/f",
  restroom_a:    "amenity/restroom/a",
  cafe:          "amenity/food/cafe",
  vending:       "amenity/food/vending",
  canteen:       "amenity/food/canteen",
  water:         "amenity/water",
  parking:       "amenity/parking",
  bike:          "amenity/parking/bike",
  info:          "info",
  reception:     "info/reception",
  meeting_point: "info/meeting_point",
  first_aid:     "safety/first_aid",
  defibrillator: "safety/defibrillator",
  stairs:        "transit/stairs",
  elevator:      "transit/elevator",
  door:          "transit/door",
  entrance:      "transit/entrance",
  exit:          "transit/exit",
  printer:       "services/printer",
};

const BY_PATH = new Map<string, PoiCategory>();
for (const c of POI_CATEGORIES) BY_PATH.set(c.path, c);

/** Look up a category by its exact path. Returns null when unknown. */
export function findCategory(path: string): PoiCategory | null {
  return BY_PATH.get(path) ?? null;
}

/** Resolve a `kind` string (legacy flat OR new slash path) to a
 *  category path. Unknown values are returned as-is so callers can
 *  fall through to defaults. */
export function resolveKindToPath(kind: string | null | undefined): string | null {
  if (!kind) return null;
  if (kind.includes("/")) return kind;
  return LEGACY_KIND_MAP[kind.toLowerCase()] ?? kind;
}

/** Walk the parent chain to build a merged style. Later ancestors
 *  override earlier ones for any field they define. Root fields fill
 *  in whatever a leaf leaves unset. */
export interface ResolvedCategoryStyle {
  path: string;
  displayName: string;
  displayNameEn: string;
  displayNameFi: string;
  icon: string;
  chipColor: string;
  strokeColor: string;
  searchAliases: string[];
}
export function resolveCategoryStyle(path: string | null | undefined): ResolvedCategoryStyle {
  const resolved = resolveKindToPath(path);
  const parts = resolved ? resolved.split("/") : [];
  // Build ancestor chain from root → leaf.
  const chain: PoiCategory[] = [];
  for (let i = 1; i <= parts.length; i++) {
    const c = BY_PATH.get(parts.slice(0, i).join("/"));
    if (c) chain.push(c);
  }
  const merged: ResolvedCategoryStyle = {
    path: resolved ?? "unknown",
    displayName: "POI",
    displayNameEn: "POI",
    displayNameFi: "POI",
    icon: "•",
    chipColor: "#ffffff",
    strokeColor: "#111827",
    searchAliases: [],
  };
  for (const c of chain) {
    if (c.displayName) {
      merged.displayName = c.displayName;
      merged.displayNameEn = c.displayNameEn ?? c.displayName;
      merged.displayNameFi = c.displayNameFi ?? c.displayName;
    }
    if (c.icon)         merged.icon = c.icon;
    if (c.chipColor)    merged.chipColor = c.chipColor;
    if (c.strokeColor)  merged.strokeColor = c.strokeColor;
    if (c.searchAliases?.length) merged.searchAliases = [...merged.searchAliases, ...c.searchAliases];
  }
  return merged;
}
