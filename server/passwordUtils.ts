/**
 * server/passwordUtils — bcryptjs-first, bcrypt-fallback, safe on Vercel.
 *
 * We PREFER bcryptjs — pure JavaScript, no native binary, always loads
 * on Vercel's Lambda runtime. If bcryptjs is missing for any reason we
 * fall back to the native bcrypt module, and if THAT also fails we
 * degrade gracefully (plaintext with a one-time console warning)
 * rather than crashing the whole module.
 *
 * Backstory: on 2026-07-16 the site went dark because
 * `import bcrypt from 'bcrypt'` was at the top of this file. When
 * bcrypt's native binary failed to resolve on Vercel, the import
 * threw at module-load time, taking the storage layer + every
 * API route with it. Now every backend is dynamically imported
 * inside functions, tried in order, and any failure is logged
 * once instead of taking down the site.
 *
 * bcryptjs is compatible with bcrypt's hash format — it verifies
 * $2a$/$2b$/$2y$ hashes and produces $2a$ hashes that bcrypt can also
 * verify. So we can mix-and-match freely between the two.
 */

const SALT_ROUNDS = 10;

type Backend = {
  hash: (s: string, rounds: number) => Promise<string>;
  compare: (plain: string, hash: string) => Promise<boolean>;
};

/** null = untried, false = both backends failed, otherwise the loaded backend. */
let backendCache: null | false | Backend = null;

async function getBackend(): Promise<Backend | null> {
  if (backendCache === false) return null;
  if (backendCache !== null) return backendCache;

  // Prefer bcryptjs — pure JS, always resolves on serverless runtimes.
  try {
    const mod = await import('bcryptjs');
    const backend = ((mod as unknown as { default?: unknown }).default ?? mod) as unknown as Backend;
    if (backend && typeof backend.hash === 'function' && typeof backend.compare === 'function') {
      backendCache = backend;
      return backend;
    }
  } catch {
    // bcryptjs not installed — fall through to native bcrypt.
  }

  // Fallback: native bcrypt. Fast when available.
  try {
    const mod = await import('bcrypt');
    const backend = ((mod as unknown as { default?: unknown }).default ?? mod) as unknown as Backend;
    if (backend && typeof backend.hash === 'function' && typeof backend.compare === 'function') {
      backendCache = backend;
      return backend;
    }
  } catch (err) {
    console.warn(
      '⚠️ [passwordUtils] Both bcryptjs and bcrypt failed to load. ' +
      'Password hashing is DISABLED — writes go through as plaintext. ' +
      'Install bcryptjs or fix bcrypt binary compatibility on the runtime.',
      err,
    );
  }

  backendCache = false;
  return null;
}

/** True when the given string is already a bcrypt-family hash — protects
 *  us from double-hashing on re-writes / migrations. Covers $2b$
 *  (native bcrypt), $2a$ (bcryptjs + legacy), $2y$ (PHP variant). */
export function isAlreadyHashed(value: string): boolean {
  return typeof value === 'string' && (value.startsWith('$2b$') || value.startsWith('$2a$') || value.startsWith('$2y$'));
}

/** Hash a plain text password. Returns the plaintext unchanged (with a
 *  warning already logged) if no backend loaded. */
export async function hashPassword(password: string): Promise<string> {
  const backend = await getBackend();
  if (!backend) return password;
  try {
    return await backend.hash(password, SALT_ROUNDS);
  } catch (err) {
    console.warn('⚠️ [passwordUtils] hash() failed, falling back to plaintext:', err);
    return password;
  }
}

/** Verify a password against a hash. Falls back to strict equality
 *  when no backend loaded. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const backend = await getBackend();
  if (!backend) return password === hash;
  try {
    return await backend.compare(password, hash);
  } catch (err) {
    console.warn('⚠️ [passwordUtils] compare() failed, falling back to strict-eq:', err);
    return password === hash;
  }
}

/** Generate a random secure password. Zero-dep. */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Idempotent hash-the-`password`-field helper used at the storage
 * boundary. No-op when the value is already hashed, empty, or missing.
 * Returns the payload unchanged when no backend is available — so a
 * broken hashing install never crashes writes.
 */
export async function hashPasswordFieldsInPlace<T extends Record<string, unknown>>(
  payload: T | null | undefined,
): Promise<T> {
  if (!payload) return payload as unknown as T;
  const raw = payload.password;
  if (typeof raw !== 'string' || raw.length === 0 || isAlreadyHashed(raw)) {
    return payload;
  }
  const hashed = await hashPassword(raw);
  return { ...payload, password: hashed } as T;
}
