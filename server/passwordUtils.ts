/**
 * server/passwordUtils — bcrypt with lazy-load + graceful fallback.
 *
 * IMPORTANT — the top-level import of bcrypt used to be a hard
 * dependency:
 *
 *   import bcrypt from 'bcrypt';   // ← if this throws, the whole
 *                                    module fails to import, and
 *                                    every consumer of storage
 *                                    (firebaseStorage → storage →
 *                                    every API route) breaks with a
 *                                    500. That took the entire site
 *                                    down on 2026-07-16 because
 *                                    bcrypt's native binary wasn't
 *                                    resolving on the Vercel Lambda
 *                                    runtime.
 *
 * Now: bcrypt is dynamically imported inside the functions that need
 * it, and every call is wrapped in try/catch. If the native module
 * fails at runtime we log the failure ONCE and return the plaintext
 * unchanged so the site stays alive. Password writes go through as
 * plaintext (a security regression — hence the warning) but the site
 * boots and every non-auth endpoint still works.
 *
 * Fix path: install bcryptjs (pure JS, no native binary) or make sure
 * bcrypt's precompiled binary matches the Lambda ABI.
 */

const SALT_ROUNDS = 10;

/** Cache the loaded bcrypt module. `null` = never tried; `false` =
 *  tried and failed; otherwise the module. */
let bcryptCache: null | false | { hash: (s: string, rounds: number) => Promise<string>; compare: (plain: string, hash: string) => Promise<boolean> } = null;

async function getBcrypt() {
  if (bcryptCache === false) return null;
  if (bcryptCache !== null) return bcryptCache;
  try {
    const mod = await import('bcrypt');
    // Prefer bcrypt's default export, fall back to the module.
    bcryptCache = ((mod as unknown as { default?: unknown }).default ?? mod) as unknown as typeof bcryptCache;
    return bcryptCache;
  } catch (err) {
    console.warn('⚠️ [passwordUtils] bcrypt native module unavailable — falling back to plaintext storage. Fix by installing bcryptjs or making sure bcrypt binary matches runtime.', err);
    bcryptCache = false;
    return null;
  }
}

/** True when the given string is already a bcrypt hash — protects us
 *  from double-hashing on re-writes / migrations. Covers both the $2b$
 *  (modern) and $2a$ (legacy) prefixes. */
export function isAlreadyHashed(value: string): boolean {
  return typeof value === "string" && (value.startsWith("$2b$") || value.startsWith("$2a$") || value.startsWith("$2y$"));
}

/** Hash a plain text password. Falls back to returning `password`
 *  unchanged if bcrypt can't load. */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await getBcrypt();
  if (!bcrypt) return password;
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (err) {
    console.warn('⚠️ [passwordUtils] bcrypt.hash failed, falling back to plaintext:', err);
    return password;
  }
}

/** Verify a password against a hash. Falls back to strict equality
 *  when bcrypt can't load. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await getBcrypt();
  if (!bcrypt) return password === hash;
  try {
    return await bcrypt.compare(password, hash);
  } catch (err) {
    console.warn('⚠️ [passwordUtils] bcrypt.compare failed, falling back to strict-eq:', err);
    return password === hash;
  }
}

/** Generate a random secure password. Zero-dep — uses Math.random for
 *  now. Callers pass the result through hashPassword before storing. */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Ensure any `password` field on a payload is bcrypt-hashed before it
 * hits the database. No-op if the value is already hashed. Idempotent
 * so it's safe to layer at every write boundary. If bcrypt is
 * unavailable, the payload passes through UNCHANGED (a warning is
 * logged) — that way a broken bcrypt install can't nuke every write.
 */
export async function hashPasswordFieldsInPlace<T extends Record<string, unknown>>(
  payload: T | null | undefined,
): Promise<T> {
  if (!payload) return payload as unknown as T;
  const raw = payload.password;
  if (typeof raw !== "string" || raw.length === 0 || isAlreadyHashed(raw)) {
    return payload;
  }
  const hashed = await hashPassword(raw);
  return { ...payload, password: hashed } as T;
}
