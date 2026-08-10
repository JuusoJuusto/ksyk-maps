/**
 * Firebase Firestore → Supabase/Postgres migration script.
 *
 * Usage:
 *   DATABASE_URL=<supabase-url> npx tsx server/migrateFirebaseToPostgres.ts
 *
 * Reads from Firebase (using existing FIREBASE_SERVICE_ACCOUNT or
 * serviceAccountKey.json) and writes to the Postgres database at
 * DATABASE_URL.  Safe to re-run — it uses INSERT … ON CONFLICT DO NOTHING
 * for most tables so existing rows won't be overwritten.
 *
 * Tables migrated: buildings, floors, rooms, hallways, staff, events,
 *                  announcements, users, app_settings
 */

import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, type DocumentData } from "firebase-admin/firestore";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  buildings,
  floors,
  rooms,
  hallways,
  staff,
  events,
  announcements,
  users,
  appSettings,
} from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

// ── Firebase init ────────────────────────────────────────────────────────────
if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } else {
    const keyPath = path.join(process.cwd(), "serviceAccountKey.json");
    if (!fs.existsSync(keyPath)) throw new Error("No Firebase credentials found");
    initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, "utf8"))) });
  }
}
const firestoreDb = getFirestore();

// ── Postgres init ────────────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const pgClient = postgres(process.env.DATABASE_URL, { prepare: false, max: 3 });
const db = drizzle(pgClient, {
  schema: { buildings, floors, rooms, hallways, staff, events, announcements, users, appSettings },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function toDate(v: any): Date | null {
  if (!v) return null;
  if (v._seconds) return new Date(v._seconds * 1000);
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function pick<T>(obj: DocumentData, keys: string[]): Partial<T> {
  const out: any = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

async function all(collection: string): Promise<DocumentData[]> {
  const snap = await firestoreDb.collection(collection).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Migration functions ──────────────────────────────────────────────────────
async function migrateBuildings() {
  const rows = await all("buildings");
  console.log(`buildings: ${rows.length} documents`);
  for (const r of rows) {
    await db
      .insert(buildings)
      .values({
        id: r.id,
        name: r.name ?? "Unnamed",
        nameEn: r.nameEn ?? null,
        nameFi: r.nameFi ?? null,
        description: r.description ?? null,
        descriptionEn: r.descriptionEn ?? null,
        descriptionFi: r.descriptionFi ?? null,
        floors: r.floors ?? 1,
        floorMin: r.floorMin ?? null,
        floorMax: r.floorMax ?? null,
        capacity: r.capacity ?? null,
        colorCode: r.colorCode ?? "#3B82F6",
        address: r.address ?? null,
        postalCode: r.postalCode ?? null,
        city: r.city ?? "Helsinki",
        coordinates: r.coordinates ?? null,
        openingHours: r.openingHours ?? null,
        entrances: r.entrances ?? null,
        parkingInfo: r.parkingInfo ?? null,
        photos: r.photos ?? [],
        isActive: r.isActive ?? true,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any)
      .onConflictDoNothing();
  }
}

async function migrateFloors() {
  const rows = await all("floors");
  console.log(`floors: ${rows.length} documents`);
  for (const r of rows) {
    await db
      .insert(floors)
      .values({
        id: r.id,
        buildingId: r.buildingId,
        level: r.level ?? r.floorNumber ?? 1,
        name: r.name ?? null,
        planUrl: r.planUrl ?? null,
        isActive: r.isActive ?? true,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any)
      .onConflictDoNothing();
  }
}

async function migrateRooms() {
  const rows = await all("rooms");
  console.log(`rooms: ${rows.length} documents`);
  for (const r of rows) {
    await db
      .insert(rooms)
      .values({
        id: r.id,
        buildingId: r.buildingId,
        roomNumber: r.roomNumber ?? r.id.slice(0, 8),
        name: r.name ?? null,
        nameEn: r.nameEn ?? null,
        nameFi: r.nameFi ?? null,
        description: r.description ?? null,
        type: r.type ?? "classroom",
        floor: r.floor ?? 1,
        capacity: r.capacity ?? null,
        features: r.features ?? [],
        isAccessible: r.isAccessible ?? false,
        isActive: r.isActive ?? true,
        colorCode: r.colorCode ?? null,
        coordinates: r.coordinates ?? null,
        photoUrl: r.photoUrl ?? r.metadata?.photoUrl ?? r.metadata?.imageUrl ?? null,
        scheduleUrl: r.scheduleUrl ?? r.metadata?.scheduleUrl ?? null,
        scheduleLabel: r.scheduleLabel ?? r.metadata?.scheduleLabel ?? null,
        department: r.department ?? null,
        metadata: r.metadata ?? null,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any)
      .onConflictDoNothing();
  }
}

async function migrateHallways() {
  const rows = await all("hallways");
  console.log(`hallways: ${rows.length} documents`);
  for (const r of rows) {
    await db
      .insert(hallways)
      .values({
        id: r.id,
        buildingId: r.buildingId ?? null,
        name: r.name ?? null,
        floor: r.floor ?? 1,
        surface: r.surface ?? null,
        width: r.width ?? null,
        coordinates: r.coordinates ?? null,
        connectedRooms: r.connectedRooms ?? [],
        isActive: r.isActive ?? true,
        fillColor: r.fillColor ?? null,
        fillOpacity: r.fillOpacity ?? null,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any)
      .onConflictDoNothing();
  }
}

async function migrateStaff() {
  const rows = await all("staff");
  console.log(`staff: ${rows.length} documents`);
  for (const r of rows) {
    await db
      .insert(staff)
      .values({
        id: r.id,
        name: r.name ?? "Staff",
        title: r.title ?? null,
        department: r.department ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        roomId: r.roomId ?? null,
        buildingId: r.buildingId ?? null,
        photoUrl: r.photoUrl ?? null,
        isActive: r.isActive ?? true,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any)
      .onConflictDoNothing();
  }
}

async function migrateEvents() {
  const rows = await all("events");
  console.log(`events: ${rows.length} documents`);
  for (const r of rows) {
    await db
      .insert(events)
      .values({
        id: r.id,
        title: r.title ?? "Event",
        titleEn: r.titleEn ?? null,
        titleFi: r.titleFi ?? null,
        description: r.description ?? null,
        startDate: toDate(r.startDate) ?? new Date(),
        endDate: toDate(r.endDate) ?? null,
        location: r.location ?? null,
        buildingId: r.buildingId ?? null,
        roomId: r.roomId ?? null,
        isPublic: r.isPublic ?? true,
        category: r.category ?? null,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any)
      .onConflictDoNothing();
  }
}

async function migrateAnnouncements() {
  const rows = await all("announcements");
  console.log(`announcements: ${rows.length} documents`);
  for (const r of rows) {
    await db
      .insert(announcements)
      .values({
        id: r.id,
        title: r.title ?? r.titleEn ?? "Announcement",
        titleEn: r.titleEn ?? null,
        titleFi: r.titleFi ?? null,
        content: r.content ?? r.contentEn ?? "",
        contentEn: r.contentEn ?? null,
        contentFi: r.contentFi ?? null,
        priority: r.priority ?? "normal",
        isActive: r.isActive ?? true,
        expiresAt: toDate(r.expiresAt) ?? null,
        buildingId: r.buildingId ?? null,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any)
      .onConflictDoNothing();
  }
}

async function migrateUsers() {
  const rows = await all("users");
  console.log(`users: ${rows.length} documents`);
  for (const r of rows) {
    if (!r.email) continue; // users without email can't be inserted (unique constraint)
    await db
      .insert(users)
      .values({
        id: r.id,
        email: r.email,
        username: r.username ?? r.email.split("@")[0],
        password: r.password ?? "MIGRATED_FROM_FIREBASE",
        role: r.role ?? "user",
        firstName: r.firstName ?? null,
        lastName: r.lastName ?? null,
        profilePicture: r.profilePicture ?? null,
        isActive: r.isActive ?? true,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any)
      .onConflictDoNothing();
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Starting Firebase → Postgres migration...\n");
  try {
    await migrateBuildings();
    await migrateFloors();
    await migrateRooms();
    await migrateHallways();
    await migrateStaff();
    await migrateEvents();
    await migrateAnnouncements();
    await migrateUsers();
    console.log("\n✅ Migration complete!");
    console.log("Next: set DATABASE_URL to your Supabase URL in Vercel, remove USE_FIREBASE=true");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await pgClient.end();
    process.exit(0);
  }
}

main();
