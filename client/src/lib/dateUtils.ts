/**
 * Date Utilities - Finnish Format (day/month/year)
 * ALL dates MUST be in Finnish format: DD.MM.YYYY or DD/MM/YYYY
 */

/**
 * Format date to Finnish format: DD.MM.YYYY
 */
export function formatDateFinnish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Format date with time to Finnish format: DD.MM.YYYY HH:MM
 */
export function formatDateTimeFinnish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatDateFinnish(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Format time only: HH:MM
 */
export function formatTimeFinnish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get relative time in Finnish (e.g., "5 minuuttia sitten")
 */
export function getRelativeTimeFinnish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Juuri nyt';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minuutti' : 'minuuttia'} sitten`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'tunti' : 'tuntia'} sitten`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'päivä' : 'päivää'} sitten`;
  return formatDateFinnish(d);
}

/**
 * Get day name in Finnish
 */
export function getDayNameFinnish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai'];
  return days[d.getDay()];
}

/**
 * Get short day name in Finnish
 */
export function getShortDayNameFinnish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];
  return days[d.getDay()];
}

/**
 * Get month name in Finnish
 */
export function getMonthNameFinnish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = [
    'Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu',
    'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'
  ];
  return months[d.getMonth()];
}

/**
 * Parse Finnish date format (DD.MM.YYYY) to Date object
 */
export function parseFinnishDate(dateStr: string): Date {
  const parts = dateStr.split('.');
  if (parts.length !== 3) throw new Error('Invalid Finnish date format');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < new Date().getTime();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() > new Date().getTime();
}
