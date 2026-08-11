/**
 * Export Firebase Firestore → Supabase SQL INSERT statements.
 *
 * Usage:  npx tsx server/exportFirebaseToSQL.ts
 * Output: migrations/firebase_data.sql  (run this in Supabase SQL Editor)
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.production" });

function initFirebase() {
  if (!getApps().length) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT not set");
    initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  return getFirestore();
}

// ── SQL helpers ────────────────────────────────────────────────────────────

function esc(v: string): string {
  return v.replace(/'/g, "''");
}

function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return isFinite(v) ? String(v) : "NULL";
  if (typeof v === "string") return `'${esc(v)}'`;
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === "object" && "_seconds" in (v as any)) {
    const d = new Date((v as any)._seconds * 1000);
    return `'${d.toISOString()}'`;
  }
  // Arrays of strings → text[]
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    return `ARRAY[${v.map((x) => `'${esc(x)}'`).join(",")}]::text[]`;
  }
  // Everything else → jsonb
  return `'${esc(JSON.stringify(v))}'::jsonb`;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === "object" && "_seconds" in (v as any)) return new Date((v as any)._seconds * 1000);
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function insert(table: string, cols: string[], vals: unknown[]): string {
  return `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${vals.map(sqlVal).join(", ")}) ON CONFLICT DO NOTHING;`;
}

async function main() {
  const db = initFirebase();
  const lines: string[] = [
    "-- ============================================================",
    "-- KSYK Maps — Firebase data export",
    `-- Generated: ${new Date().toISOString()}`,
    "-- Run this in Supabase SQL Editor AFTER running 0000_fresh_start.sql",
    "-- ============================================================",
    "",
  ];

  let total = 0;

  // ── BUILDINGS ────────────────────────────────────────────────────────────
  lines.push("-- BUILDINGS");
  const bSnap = await db.collection("buildings").get();
  for (const d of bSnap.docs) {
    const r = d.data();
    lines.push(insert("buildings", [
      "id", "name", "name_en", "name_fi",
      "description", "description_en", "description_fi",
      "floors", "floor_min", "floor_max", "default_floor",
      "capacity", "color_code", "is_active",
      "address", "postal_code", "city",
      "coordinates", "points", "rotation_deg",
      "campus", "metadata",
      "opening_hours", "entrances", "parking_info",
      "photos",
      "created_at", "updated_at",
    ], [
      d.id,
      r.name ?? r.nameFi ?? r.nameEn ?? "Building",
      r.nameEn ?? null,
      r.nameFi ?? null,
      r.description ?? r.descriptionFi ?? r.descriptionEn ?? null,
      r.descriptionEn ?? null,
      r.descriptionFi ?? null,
      typeof r.floors === "number" ? r.floors : (typeof r.floorMax === "number" && typeof r.floorMin === "number" ? r.floorMax - r.floorMin + 1 : 1),
      r.floorMin ?? null,
      r.floorMax ?? null,
      r.defaultFloor ?? null,
      r.capacity ?? null,
      r.colorCode ?? "#3B82F6",
      r.isActive ?? true,
      r.address ?? null,
      r.postalCode ?? null,
      r.city ?? "Helsinki",
      r.coordinates ? JSON.stringify(r.coordinates) : null,
      r.points ? JSON.stringify(r.points) : null,
      r.rotationDeg ?? null,
      r.campus ?? null,
      r.metadata ? JSON.stringify(r.metadata) : null,
      r.openingHours ? JSON.stringify(r.openingHours) : null,
      r.entrances ? JSON.stringify(r.entrances) : null,
      r.parkingInfo ? JSON.stringify(r.parkingInfo) : null,
      r.photos ?? [],
      toDate(r.createdAt) ?? new Date(),
      toDate(r.updatedAt) ?? new Date(),
    ]));
    total++;
  }
  lines.push(`-- buildings: ${bSnap.docs.length}`, "");

  // ── FLOORS ───────────────────────────────────────────────────────────────
  lines.push("-- FLOORS");
  const fSnap = await db.collection("floors").get();
  for (const d of fSnap.docs) {
    const r = d.data();
    if (!r.buildingId) continue;
    lines.push(insert("floors", [
      "id", "building_id", "floor_number",
      "name", "name_en", "name_fi",
      "description", "map_image_url", "is_active",
      "created_at", "updated_at",
    ], [
      d.id,
      r.buildingId,
      r.level ?? r.floorNumber ?? r.floor ?? 1,
      r.name ?? null,
      r.nameEn ?? null,
      r.nameFi ?? null,
      r.description ?? null,
      r.planUrl ?? r.mapImageUrl ?? null,
      r.isActive ?? true,
      toDate(r.createdAt) ?? new Date(),
      toDate(r.updatedAt) ?? new Date(),
    ]));
    total++;
  }
  lines.push(`-- floors: ${fSnap.docs.length}`, "");

  // ── ROOMS ────────────────────────────────────────────────────────────────
  lines.push("-- ROOMS");
  const rSnap = await db.collection("rooms").get();
  let roomsOk = 0, roomsSkipped = 0;
  for (const d of rSnap.docs) {
    const r = d.data();
    if (!r.buildingId) { roomsSkipped++; continue; }
    lines.push(insert("rooms", [
      "id", "building_id", "room_number",
      "name", "name_en", "name_fi",
      "description",
      "floor", "capacity", "type", "sub_type",
      "color_code", "is_public", "is_accessible", "is_active",
      "points", "rotation_deg",
      "map_position_x", "map_position_y", "width", "height",
      "department", "teacher",
      "schedule_url", "schedule_label",
      "photo_url", "coordinates",
      "features", "equipment", "amenities",
      "emergency_info", "accessibility_info",
      "metadata",
      "created_at", "updated_at",
    ], [
      d.id,
      r.buildingId,
      r.roomNumber ?? r.number ?? d.id.slice(0, 10),
      r.name ?? r.nameFi ?? r.nameEn ?? null,
      r.nameEn ?? null,
      r.nameFi ?? null,
      r.description ?? r.descriptionFi ?? r.descriptionEn ?? null,
      typeof r.floor === "number" ? r.floor : 1,
      r.capacity ?? null,
      r.type ?? "classroom",
      r.subType ?? null,
      r.colorCode ?? "#6B7280",
      r.isPublic ?? true,
      r.isAccessible ?? false,
      r.isActive ?? true,
      r.points ? JSON.stringify(r.points) : null,
      r.rotationDeg ?? null,
      r.mapPositionX ?? null,
      r.mapPositionY ?? null,
      r.width ?? null,
      r.height ?? null,
      r.department ?? null,
      r.teacher ?? null,
      r.scheduleUrl ?? r.metadata?.scheduleUrl ?? null,
      r.scheduleLabel ?? r.metadata?.scheduleLabel ?? null,
      r.photoUrl ?? r.metadata?.photoUrl ?? r.metadata?.imageUrl ?? null,
      r.coordinates ? JSON.stringify(r.coordinates) : null,
      Array.isArray(r.features) ? r.features : [],
      Array.isArray(r.equipment) ? r.equipment : [],
      Array.isArray(r.amenities) ? r.amenities : [],
      r.emergencyInfo ?? null,
      r.accessibilityInfo ?? null,
      r.metadata ? JSON.stringify(r.metadata) : null,
      toDate(r.createdAt) ?? new Date(),
      toDate(r.updatedAt) ?? new Date(),
    ]));
    roomsOk++;
    total++;
  }
  lines.push(`-- rooms: ${roomsOk} inserted, ${roomsSkipped} skipped (no buildingId)`, "");

  // ── HALLWAYS ─────────────────────────────────────────────────────────────
  lines.push("-- HALLWAYS");
  const hSnap = await db.collection("hallways").get();
  for (const d of hSnap.docs) {
    const r = d.data();
    lines.push(insert("hallways", [
      "id", "building_id",
      "name",
      "start_x", "start_y", "end_x", "end_y",
      "points", "width",
      "color_code",
      "surface", "floor",
      "directions",
      "is_public", "is_active",
      "emergency_route", "accessibility_info",
      "metadata",
      "created_at", "updated_at",
    ], [
      d.id,
      r.buildingId ?? null,
      r.name ?? null,
      r.startX != null ? Math.round(r.startX) : null,
      r.startY != null ? Math.round(r.startY) : null,
      r.endX != null ? Math.round(r.endX) : null,
      r.endY != null ? Math.round(r.endY) : null,
      r.points ? JSON.stringify(r.points) : null,
      r.width ?? 2,
      r.fillColor ?? r.colorCode ?? "#9CA3AF",
      r.surface ?? r.kind ?? null,
      typeof r.floor === "number" ? r.floor : null,
      r.directions ?? null,
      r.isPublic ?? true,
      r.isActive ?? true,
      r.emergencyRoute ?? false,
      r.accessibilityInfo ?? null,
      r.metadata ? JSON.stringify(r.metadata) : null,
      toDate(r.createdAt) ?? new Date(),
      toDate(r.updatedAt) ?? new Date(),
    ]));
    total++;
  }
  lines.push(`-- hallways: ${hSnap.docs.length}`, "");

  // ── STAFF ─────────────────────────────────────────────────────────────────
  lines.push("-- STAFF");
  const sSnap = await db.collection("staff").get();
  for (const d of sSnap.docs) {
    const r = d.data();
    const fullName: string = (r.name ?? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()) || "Staff";
    const parts = fullName.split(" ");
    const firstName = parts[0] ?? fullName;
    const lastName = parts.slice(1).join(" ") || "-";
    lines.push(insert("staff", [
      "id", "first_name", "last_name",
      "email", "phone",
      "position", "department",
      "profile_image_url",
      "is_active",
      "created_at", "updated_at",
    ], [
      d.id,
      firstName,
      lastName,
      r.email ?? null,
      r.phone ?? null,
      r.title ?? r.position ?? null,
      r.department ?? null,
      r.photoUrl ?? r.profileImageUrl ?? null,
      r.isActive ?? true,
      toDate(r.createdAt) ?? new Date(),
      toDate(r.updatedAt) ?? new Date(),
    ]));
    total++;
  }
  lines.push(`-- staff: ${sSnap.docs.length}`, "");

  // ── ANNOUNCEMENTS ────────────────────────────────────────────────────────
  lines.push("-- ANNOUNCEMENTS");
  const aSnap = await db.collection("announcements").get();
  for (const d of aSnap.docs) {
    const r = d.data();
    lines.push(insert("announcements", [
      "id", "title", "title_en", "title_fi",
      "content", "content_en", "content_fi",
      "priority", "is_active",
      "expires_at",
      "created_at", "updated_at",
    ], [
      d.id,
      r.title ?? r.titleEn ?? r.titleFi ?? "Announcement",
      r.titleEn ?? null,
      r.titleFi ?? null,
      r.content ?? r.contentEn ?? r.contentFi ?? "",
      r.contentEn ?? null,
      r.contentFi ?? null,
      r.priority ?? "normal",
      r.isActive ?? true,
      toDate(r.expiresAt) ?? null,
      toDate(r.createdAt) ?? new Date(),
      toDate(r.updatedAt) ?? new Date(),
    ]));
    total++;
  }
  lines.push(`-- announcements: ${aSnap.docs.length}`, "");

  // ── EVENTS ───────────────────────────────────────────────────────────────
  lines.push("-- EVENTS");
  const eSnap = await db.collection("events").get();
  for (const d of eSnap.docs) {
    const r = d.data();
    const start = toDate(r.startDate ?? r.startTime) ?? new Date();
    const end = toDate(r.endDate ?? r.endTime) ?? new Date(start.getTime() + 3600000);
    lines.push(insert("events", [
      "id", "title", "title_en", "title_fi",
      "description",
      "start_time", "end_time",
      "location",
      "is_public", "is_active",
      "created_at", "updated_at",
    ], [
      d.id,
      r.title ?? r.titleEn ?? "Event",
      r.titleEn ?? null,
      r.titleFi ?? null,
      r.description ?? null,
      start,
      end,
      r.location ?? null,
      r.isPublic ?? true,
      r.isActive ?? true,
      toDate(r.createdAt) ?? new Date(),
      toDate(r.updatedAt) ?? new Date(),
    ]));
    total++;
  }
  lines.push(`-- events: ${eSnap.docs.length}`, "");

  lines.push("", `-- Total rows: ${total}`);

  const outPath = path.join("migrations", "firebase_data.sql");
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`\n✅ Written to ${outPath}`);
  console.log(`   Total rows: ${total}`);
  console.log(`\nRun that file in Supabase SQL Editor after the fresh_start.sql migration.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
