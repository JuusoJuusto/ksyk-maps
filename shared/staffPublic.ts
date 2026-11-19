/**
 * What an unauthenticated caller may see of a staff row.  Contact details
 * (email, phone), bio, photo, linked user, office and timestamps are
 * admin-only — GET /api/staff used to return the whole row to anyone.
 */
export const PUBLIC_STAFF_FIELDS = [
  "id",
  "firstName",
  "lastName",
  "position",
  "positionEn",
  "positionFi",
  "department",
  "departmentEn",
  "departmentFi",
  "abbrev",
  "isActive",
] as const;

export function toPublicStaff(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PUBLIC_STAFF_FIELDS) {
    if (key in row) out[key] = row[key];
  }
  return out;
}
