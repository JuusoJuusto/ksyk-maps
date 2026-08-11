/**
 * Firebase Firestore → Supabase/Postgres migration.
 *
 * Can be called two ways:
 *   1. Via POST /api/admin/migrate-from-firebase (admin token required)
 *   2. CLI: DATABASE_URL=<url> npx tsx server/migrateFirebaseToPostgres.ts
 *
 * Safe to re-run — uses INSERT … ON CONFLICT DO NOTHING so existing rows
 * are never overwritten.
 *
 * Tables migrated: buildings, floors, rooms, hallways, staff, events,
 *                  announcements, app_settings
 */

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
  appSettings,
} from "../shared/schema.js";
import * as fs from "fs";
import * as path from "path";

function initFirebase() {
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    } else {
      const keyPath = path.join(process.cwd(), "serviceAccountKey.json");
      if (!fs.existsSync(keyPath)) throw new Error("No Firebase credentials found");
      initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, "utf8"))) });
    }
  }
  return getFirestore();
}

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v._seconds) return new Date(v._seconds * 1000);
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function all(firestoreDb: ReturnType<typeof getFirestore>, collection: string): Promise<DocumentData[]> {
  const snap = await firestoreDb.collection(collection).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function runMigration(): Promise<Record<string, number>> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL not set");

  const firestoreDb = initFirebase();
  const pgClient = postgres(url, { prepare: false, max: 3 });
  const db = drizzle(pgClient, {
    schema: { buildings, floors, rooms, hallways, staff, events, announcements, appSettings },
  });

  const counts: Record<string, number> = {};

  try {
    // Buildings
    const bRows = await all(firestoreDb, "buildings");
    counts.buildings = bRows.length;
    for (const r of bRows) {
      await db.insert(buildings).values({
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
      } as any).onConflictDoNothing();
    }
    console.log(`✅ buildings: ${bRows.length}`);

    // Floors
    const fRows = await all(firestoreDb, "floors");
    counts.floors = fRows.length;
    for (const r of fRows) {
      await db.insert(floors).values({
        id: r.id,
        buildingId: r.buildingId,
        level: r.level ?? r.floorNumber ?? 1,
        name: r.name ?? null,
        planUrl: r.planUrl ?? null,
        isActive: r.isActive ?? true,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any).onConflictDoNothing();
    }
    console.log(`✅ floors: ${fRows.length}`);

    // Rooms
    const rRows = await all(firestoreDb, "rooms");
    counts.rooms = 0;
    counts.roomsSkipped = 0;
    for (const r of rRows) {
      if (!r.buildingId) { counts.roomsSkipped!++; continue; }
      await db.insert(rooms).values({
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
      } as any).onConflictDoNothing();
      counts.rooms!++;
    }
    console.log(`✅ rooms: ${counts.rooms} (skipped ${counts.roomsSkipped} without buildingId)`);

    // Hallways
    const hRows = await all(firestoreDb, "hallways");
    counts.hallways = hRows.length;
    for (const r of hRows) {
      await db.insert(hallways).values({
        id: r.id,
        buildingId: r.buildingId ?? null,
        name: r.name ?? null,
        surface: r.surface ?? null,
        startX: r.startX != null ? Math.round(r.startX) : null,
        startY: r.startY != null ? Math.round(r.startY) : null,
        endX: r.endX != null ? Math.round(r.endX) : null,
        endY: r.endY != null ? Math.round(r.endY) : null,
        points: r.points ?? null,
        width: r.width ?? 2,
        colorCode: r.fillColor ?? r.colorCode ?? "#9CA3AF",
        isActive: r.isActive ?? true,
        isPublic: r.isPublic ?? true,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      } as any).onConflictDoNothing();
    }
    console.log(`✅ hallways: ${hRows.length}`);

    // Staff
    const sRows = await all(firestoreDb, "staff");
    counts.staff = sRows.length;
    for (const r of sRows) {
      await db.insert(staff).values({
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
      } as any).onConflictDoNothing();
    }
    console.log(`✅ staff: ${sRows.length}`);

    // Events
    const eRows = await all(firestoreDb, "events");
    counts.events = eRows.length;
    for (const r of eRows) {
      await db.insert(events).values({
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
      } as any).onConflictDoNothing();
    }
    console.log(`✅ events: ${eRows.length}`);

    // Announcements
    const aRows = await all(firestoreDb, "announcements");
    counts.announcements = aRows.length;
    for (const r of aRows) {
      await db.insert(announcements).values({
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
      } as any).onConflictDoNothing();
    }
    console.log(`✅ announcements: ${aRows.length}`);

  } finally {
    await pgClient.end();
  }

  return counts;
}

// CLI entry point
if (process.argv[1]?.endsWith("migrateFirebaseToPostgres.ts") ||
    process.argv[1]?.endsWith("migrateFirebaseToPostgres.js")) {
  import("dotenv/config").then(() => {
    runMigration()
      .then((counts) => { console.log("\n✅ Done:", counts); process.exit(0); })
      .catch((err) => { console.error("❌", err); process.exit(1); });
  });
}
