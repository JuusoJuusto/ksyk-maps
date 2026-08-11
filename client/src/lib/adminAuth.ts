export function getAdminToken(): string | null {
  return localStorage.getItem('ksyk_admin_token');
}

export function getAdminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearAdminSession(): void {
  localStorage.removeItem('ksyk_admin_logged_in');
  localStorage.removeItem('ksyk_admin_user');
  localStorage.removeItem('ksyk_admin_login_at');
  localStorage.removeItem('ksyk_admin_token');
}
