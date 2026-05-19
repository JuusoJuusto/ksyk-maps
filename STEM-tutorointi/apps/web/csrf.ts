import { randomUUID } from 'crypto';

export function generateCsrfToken() {
  return randomUUID();
}

export function verifyCsrf(headerToken?: string | null, cookieToken?: string | null) {
  if (!headerToken || !cookieToken) return false;
  return headerToken === cookieToken;
}
