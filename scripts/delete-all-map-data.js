#!/usr/bin/env node

/**
 * Deletes ALL buildings and rooms (and related map geometry) from Firebase.
 *
 * Removes the following top-level collections:
 *   - buildings   (all campus buildings)
 *   - rooms       (all rooms across every building)
 *   - hallways    (map corridors)
 *   - stairs      (staircase markers)
 *   - floors      (per-building floor definitions)
 *   - roomShapes  (freeform room polygons, if any)
 *
 * ⚠️ This action CANNOT be undone. Uses FIREBASE_SERVICE_ACCOUNT env var.
 *
 * Usage:  node scripts/delete-all-map-data.js
 * Dry run:  DRY_RUN=1 node scripts/delete-all-map-data.js
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.env.DRY_RUN === "1";

const MAP_COLLECTIONS = [
  "buildings",
  "rooms",
  "hallways",
  "stairs",
  "floors",
  "roomShapes",
];

console.log("\n🗑️  ========== MAP DATA CLEANUP ==========");
console.log(DRY_RUN ? "🧪 DRY RUN — no writes will be made." : "⚠️  LIVE MODE — deletes are permanent.");
console.log("📚 " + MAP_COLLECTIONS.length + " collections targeted");
console.log("🔥 This action CANNOT be undone in live mode.");
console.log("==========================================\n");

async function deleteCollectionBatched(db, collectionRef, path) {
  const BATCH = 400;
  let total = 0;
  while (true) {
    const snapshot = await collectionRef.limit(BATCH).get();
    if (snapshot.empty) break;
    if (DRY_RUN) {
      total += snapshot.size;
      console.log("  [dry-run] would delete " + snapshot.size + " docs from " + path);
      break;
    }
    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snapshot.size;
    console.log("  ✂️  deleted " + snapshot.size + " docs from " + path + " (running total " + total + ")");
    if (snapshot.size < BATCH) break;
  }
  return total;
}

async function main() {
  console.log("🔧 Initializing Firebase Admin...");
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  if (!serviceAccount.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT not found in environment");
  }
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();
  console.log("✅ Firebase initialized (project: " + serviceAccount.project_id + ")\n");

  const stats = {};
  let grandTotal = 0;

  for (const col of MAP_COLLECTIONS) {
    console.log("🔎 " + col);
    const ref = db.collection(col);
    const deleted = await deleteCollectionBatched(db, ref, col);
    stats[col] = deleted;
    grandTotal += deleted;
  }

  console.log("\n📊 ========== SUMMARY ==========");
  for (const [k, v] of Object.entries(stats)) {
    console.log("  " + k.padEnd(28) + " " + v);
  }
  console.log("  ─────────────────────────────────────");
  console.log("  TOTAL " + (DRY_RUN ? "(would-delete)" : "(deleted)") + ": " + grandTotal + "\n");
  if (DRY_RUN) {
    console.log("🧪 Dry run complete. Re-run without DRY_RUN=1 to actually delete.\n");
  } else {
    console.log("✅ Map data cleanup complete.\n");
  }
}

main().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
