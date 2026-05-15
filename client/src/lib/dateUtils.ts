/**
 * Date Utilities - DD/MM/YYYY Format
 * Standardized date formatting across the entire application
 */

/**
 * Format a date to DD/MM/YYYY
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format a date to DD/MM/YYYY HH:MM
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format a date to DD/MM/YYYY HH:MM:SS
 */
export function formatDateTimeFull(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format time only (HH:MM)
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Parse DD/MM/YYYY string to Date object
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  
  if (isNaN(date.getTime())) return null;
  
  return date;
}

/**
 * Get relative time (e.g., "2 hours ago", "yesterday")
 */
export function getRelativeTime(date: Date | string | null | undefined, locale: 'fi' | 'en' = 'fi'): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (locale === 'fi') {
    if (diffSec < 60) return 'juuri nyt';
    if (diffMin < 60) return `${diffMin} minuuttia sitten`;
    if (diffHour < 24) return `${diffHour} tuntia sitten`;
    if (diffDay === 1) return 'eilen';
    if (diffDay < 7) return `${diffDay} päivää sitten`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} viikkoa sitten`;
    if (diffDay < 365) return `${Math.floor(diffDay / 30)} kuukautta sitten`;
    return `${Math.floor(diffDay / 365)} vuotta sitten`;
  } else {
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} weeks ago`;
    if (diffDay < 365) return `${Math.floor(diffDay / 30)} months ago`;
    return `${Math.floor(diffDay / 365)} years ago`;
  }
}

/**
 * Get day name (e.g., "Monday", "Maanantai")
 */
export function getDayName(date: Date | string | null | undefined, locale: 'fi' | 'en' = 'fi'): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const dayNames = {
    fi: ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };
  
  return dayNames[locale][d.getDay()];
}

/**
 * Get short day name (e.g., "Mon", "Ma")
 */
export function getShortDayName(date: Date | string | null | undefined, locale: 'fi' | 'en' = 'fi'): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const dayNames = {
    fi: ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };
  
  return dayNames[locale][d.getDay()];
}

/**
 * Get month name (e.g., "January", "Tammikuu")
 */
export function getMonthName(date: Date | string | null | undefined, locale: 'fi' | 'en' = 'fi'): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const monthNames = {
    fi: ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 
         'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'],
    en: ['January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December']
  };
  
  return monthNames[locale][d.getMonth()];
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return false;
  
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return false;
  
  return d.getTime() < new Date().getTime();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return false;
  
  return d.getTime() > new Date().getTime();
}

/**
 * Get week number
 */
export function getWeekNumber(date: Date | string | null | undefined): number {
  if (!date) return 0;
  
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  
  if (isNaN(d.getTime())) return 0;
  
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return weekNo;
}

/**
 * Format date range (e.g., "01/01/2026 - 31/01/2026")
 */
export function formatDateRange(startDate: Date | string | null | undefined, endDate: Date | string | null | undefined): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  if (start === '-' && end === '-') return '-';
  if (start === '-') return end;
  if (end === '-') return start;
  
  return `${start} - ${end}`;
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get start of week (Monday)
 */
export function getStartOfWeek(date: Date | string | null | undefined): Date {
  if (!date) return new Date();
  
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  
  if (isNaN(d.getTime())) return new Date();
  
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get end of week (Sunday)
 */
export function getEndOfWeek(date: Date | string | null | undefined): Date {
  const start = getStartOfWeek(date);
  return addDays(start, 6);
}
