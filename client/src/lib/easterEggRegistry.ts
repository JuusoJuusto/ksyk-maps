/**
 * KSYK Maps — canonical registry of every easter egg.
 *
 * Every consumer (the ambient hook that watches for triggers, the
 * admin stats card, the server-side counter aggregation) reads from
 * this one file, so adding a new egg is a one-line change here plus
 * whichever trigger you need in `useKsykEasterEggs`.
 *
 * `id` is the stable identifier that appears in:
 *   - localStorage key (`ksyk_egg_found:<id>`)
 *   - the server's counter document (`easterEggs/counts.<id>`)
 *   - analytics events (`easter_egg:<id>`)
 * Never rename an `id` — pick a new one and mark the old one legacy.
 */
import { Award, Code, Disc3, Flame, Flag, Gamepad2, Globe, Ham, Monitor, Pizza, Radio, RotateCw, Snowflake, Sparkles, Star, Terminal, Trophy, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type EggRarity = "common" | "rare" | "epic" | "legendary";

export interface EasterEgg {
  id: string;
  name: string;
  description: string;
  /** How to find it — surfaced in the admin panel behind a "Reveal" click. */
  hint: string;
  /** What the user gets when they find it. */
  reward: string;
  icon: LucideIcon;
  /** Tailwind text colour class. */
  color: string;
  /** Tailwind background colour class. */
  bgColor: string;
  rarity: EggRarity;
}

/** Ordered by roughly increasing rarity. Newest additions at the top of
 *  their rarity bucket so the admin's "what's new" is easy to spot. */
export const EASTER_EGGS: EasterEgg[] = [
  {
    id: "ksyk-typed",
    name: "KSYK Whisperer",
    description: "Typed 'ksyk' anywhere on the site.",
    hint: "Just type k · s · y · k.",
    reward: "Unlocks a secret page.",
    icon: Award,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-500/20",
    rarity: "common",
  },
  {
    id: "sisu-typed",
    name: "Sisu",
    description: "Typed 'sisu' — the untranslatable Finnish grit.",
    hint: "Type s · i · s · u anywhere.",
    reward: "Finnish flag confetti burst.",
    icon: Flag,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-500/20",
    rarity: "common",
  },
  {
    id: "party-typed",
    name: "Party Mode",
    description: "Typed 'party' — because sometimes you need a party.",
    hint: "Type p · a · r · t · y anywhere.",
    reward: "Rainbow confetti explosion for 3 seconds.",
    icon: Sparkles,
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-500/20",
    rarity: "common",
  },
  {
    id: "logo-clicks",
    name: "Logo Puncher",
    description: "Clicked the KSYK Maps wordmark 10 times.",
    hint: "Rapid-fire clicks on the top-of-page KSYK Maps wordmark.",
    reward: "Unlocks Dev Mode secret page.",
    icon: Trophy,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-500/20",
    rarity: "rare",
  },
  {
    id: "barrel-roll",
    name: "Do a Barrel Roll",
    description: "Told the map to do a barrel roll.",
    hint: "Type b · a · r · r · e · l anywhere.",
    reward: "The whole map spins 360° in 1.5 seconds.",
    icon: RotateCw,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
    rarity: "rare",
  },
  {
    id: "retro-crt",
    name: "1985 Called",
    description: "Typed 'retro' or '1985'.",
    hint: "Type r · e · t · r · o (or 1 · 9 · 8 · 5) anywhere.",
    reward: "Green-on-black CRT theme for 15 seconds.",
    icon: Radio,
    color: "text-lime-600",
    bgColor: "bg-lime-100 dark:bg-lime-500/20",
    rarity: "rare",
  },
  {
    id: "konami",
    name: "Konami Code",
    description: "Entered the classic ↑↑↓↓←→←→BA cheat.",
    hint: "The one from every 8-bit game.",
    reward: "30 lives + CRT theme overlay.",
    icon: Gamepad2,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-500/20",
    rarity: "epic",
  },
  {
    id: "debug-combo",
    name: "Debug Combo",
    description: "Ctrl+Shift+K then Ctrl+Shift+D within 3 seconds.",
    hint: "Two keyboard chords, back-to-back.",
    reward: "Dev banner in the console + telemetry pip.",
    icon: Code,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-500/20",
    rarity: "epic",
  },
  {
    id: "snow-typed",
    name: "First Snow",
    description: "Typed 'snow' and it started snowing inside the browser.",
    hint: "Type s · n · o · w anywhere.",
    reward: "Gentle snowfall for 6 seconds.",
    icon: Snowflake,
    color: "text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-500/20",
    rarity: "common",
  },
  {
    id: "matrix-typed",
    name: "Wake Up, Neo",
    description: "Found the rabbit hole — typed the forbidden word.",
    hint: "Type m · a · t · r · i · x anywhere.",
    reward: "Matrix rain cascade for 8 seconds.",
    icon: Terminal,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-500/20",
    rarity: "epic",
  },
  {
    id: "zoom-lord",
    name: "Zoom Lord",
    description: "Zoomed in 10 times in a row.",
    hint: "The + button, mashed.",
    reward: "Adds a hidden 'Zoom Lord' badge to the Overview.",
    icon: Flame,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-500/20",
    rarity: "legendary",
  },
  // ── New eggs added 2026-08-13 ─────────────────────────────────
  {
    id: "juuso-typed",
    name: "The Creator",
    description: "Typed the name of the person who built all this.",
    hint: "Type the first name of KSYK Maps' creator.",
    reward: "Legendary fireworks, confetti, and a personal tribute.",
    icon: Trophy,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-500/20",
    rarity: "legendary",
  },
  {
    id: "pizza-typed",
    name: "Pizza Time",
    description: "Summoned the sacred triangles from the sky.",
    hint: "Type p · i · z · z · a anywhere.",
    reward: "It rains pizza. Obviously.",
    icon: Pizza,
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-500/20",
    rarity: "common",
  },
  {
    id: "perkele-typed",
    name: "Perkele!",
    description: "Expressed peak Finnishness.",
    hint: "Type the most Finnish word there is.",
    reward: "Finnish flag confetti + a small national celebration.",
    icon: Flag,
    color: "text-blue-700",
    bgColor: "bg-blue-100 dark:bg-blue-500/20",
    rarity: "rare",
  },
  {
    id: "sauna-typed",
    name: "Löyly!",
    description: "Typed the holiest Finnish word: sauna.",
    hint: "Type s · a · u · n · a anywhere.",
    reward: "Heat rises. Steam fills the screen. Very cozy.",
    icon: Flame,
    color: "text-red-500",
    bgColor: "bg-red-100 dark:bg-red-500/20",
    rarity: "rare",
  },
  {
    id: "disco-typed",
    name: "Disco Inferno",
    description: "Brought the dance floor to the campus map.",
    hint: "Type d · i · s · c · o anywhere.",
    reward: "Full disco mode — lights, beams, and confetti for 8 seconds.",
    icon: Disc3,
    color: "text-fuchsia-600",
    bgColor: "bg-fuchsia-100 dark:bg-fuchsia-500/20",
    rarity: "rare",
  },
  {
    id: "boom-typed",
    name: "BOOM",
    description: "Made things go boom.",
    hint: "Type b · o · o · m anywhere.",
    reward: "Blinding flash + fireworks explosion.",
    icon: Zap,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-500/20",
    rarity: "rare",
  },
  {
    id: "neon-typed",
    name: "Neon Lights",
    description: "Swept a rainbow neon beam across the screen.",
    hint: "Type n · e · o · n anywhere.",
    reward: "Rainbow neon light sweep across the whole page.",
    icon: Sparkles,
    color: "text-pink-500",
    bgColor: "bg-pink-100 dark:bg-pink-500/20",
    rarity: "rare",
  },
  {
    id: "hauki-typed",
    name: "Hauki on kala",
    description: "Invoked the sacred Northern pike.",
    hint: "Type the Finnish word for pike (the fish).",
    reward: "Fish rain — totally unexpected.",
    icon: Globe,
    color: "text-teal-600",
    bgColor: "bg-teal-100 dark:bg-teal-500/20",
    rarity: "common",
  },
  {
    id: "42-typed",
    name: "The Answer",
    description: "Found the answer to life, the universe, and everything.",
    hint: "Type 4 · 2 anywhere.",
    reward: "Achievement card + the truth revealed.",
    icon: Star,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-500/20",
    rarity: "epic",
  },
  {
    id: "lumiukko-typed",
    name: "Lumiukko",
    description: "Built a snowman inside the browser.",
    hint: "Type l · u · m · i · u · k · k · o anywhere.",
    reward: "An extended blizzard — much snow, very Finnish.",
    icon: Snowflake,
    color: "text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-500/20",
    rarity: "rare",
  },
  {
    id: "glitch-typed",
    name: "Reality Glitch",
    description: "Broke the fourth wall.",
    hint: "Type g · l · i · t · c · h anywhere.",
    reward: "The whole page glitches out for 3 seconds.",
    icon: Monitor,
    color: "text-violet-600",
    bgColor: "bg-violet-100 dark:bg-violet-500/20",
    rarity: "epic",
  },
  {
    id: "rage-quit",
    name: "Rage Quit",
    description: "Pressed Escape 7 times in rapid succession.",
    hint: "Hammer the Escape key — fast.",
    reward: "A fake BSOD appears. You tried to quit but couldn't.",
    icon: Monitor,
    color: "text-blue-700",
    bgColor: "bg-blue-100 dark:bg-blue-500/20",
    rarity: "epic",
  },
  {
    id: "midnight-bonus",
    name: "Night Owl",
    description: "Used KSYK Maps at midnight (00:00–00:30).",
    hint: "Visit between midnight and half past — you'll know.",
    reward: "Star confetti + a special greeting from the void.",
    icon: Star,
    color: "text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-500/20",
    rarity: "legendary",
  },
  {
    id: "hamburger-typed",
    name: "Hungry?",
    description: "Ordered a hamburger through the wrong app.",
    hint: "Type h · a · m · b · u · r · g · e · r anywhere.",
    reward: "Burger rain — it's not a food delivery app, but OK.",
    icon: Ham,
    color: "text-amber-700",
    bgColor: "bg-amber-100 dark:bg-amber-500/20",
    rarity: "common",
  },
  {
    id: "full-hunter",
    name: "Full Hunter",
    description: "Found every other easter egg on this list.",
    hint: "This one unlocks itself once you've discovered all the others.",
    reward: "Permanent gold ring on the Overview total-discoveries badge.",
    icon: Star,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-500/20",
    rarity: "legendary",
  },
];

/** Look up by id. Returns undefined if not found. */
export function eggById(id: string): EasterEgg | undefined {
  return EASTER_EGGS.find((e) => e.id === id);
}

/** localStorage key for a per-browser "found" flag. */
export function eggLocalKey(id: string): string {
  return `ksyk_egg_found:${id}`;
}

/** Wipe the per-browser "found" flags AND the legacy pre-registry
 *  keys. Called by the admin reset button (below) and by boot-cleanup
 *  when the epoch changes. */
export function resetLocalEggFlags(): void {
  for (const e of EASTER_EGGS) localStorage.removeItem(eggLocalKey(e.id));
  // Legacy keys from the pre-registry era — clean them up too.
  for (const k of ["ksyk_ksyk_typed_found", "ksyk_logo_clicks_found", "ksyk_debug_combo_found"]) {
    localStorage.removeItem(k);
  }
}

/**
 * Reset epoch — bumping this constant wipes every browser's flags on
 * next mount. Useful when you want to give everyone a fresh treasure
 * hunt without waiting for them to click a reset button.
 */
export const EGG_RESET_EPOCH = "2026-08-13";

/** Rarity → weight (0..1). Used by the admin panel to sort. */
export const RARITY_WEIGHT: Record<EggRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};
