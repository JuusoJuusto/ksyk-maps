import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** True when the given string is already a bcrypt hash — protects us
 *  from double-hashing on re-writes / migrations. Covers both the $2b$
 *  (modern) and $2a$ (legacy) prefixes. */
export function isAlreadyHashed(value: string): boolean {
  return typeof value === "string" && (value.startsWith("$2b$") || value.startsWith("$2a$") || value.startsWith("$2y$"));
}

/**
 * Ensure any `password` field on a payload is bcrypt-hashed before it
 * hits the database. No-op if the value is already hashed. Idempotent
 * so it's safe to layer at every write boundary.
 *
 * Returns a shallow-cloned copy so callers can't accidentally mutate
 * the argument mid-request.
 */
export async function hashPasswordFieldsInPlace<T extends Record<string, unknown>>(
  payload: T | null | undefined,
): Promise<T> {
  if (!payload) return payload as unknown as T;
  const clone: Record<string, unknown> = { ...payload };
  const raw = clone.password;
  if (typeof raw === "string" && raw.length > 0 && !isAlreadyHashed(raw)) {
    clone.password = await bcrypt.hash(raw, SALT_ROUNDS);
  }
  return clone as T;
}

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate a random secure password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
