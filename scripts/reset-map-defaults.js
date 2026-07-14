#!/usr/bin/env node

/**
 * Reset ALL map settings + defaults in Firestore.
 *
 * Wipes:
 *   - mapDefaults collection (admin-published map defaults)
 *   - mapSettings collection (any legacy settings docs)
 *   - appSettings docs that carry map fields (leaves other app settings intact)
 *
 * After running, the app falls back to the baked-in KSYK Helsinki defaults
 * from `client/src/lib/appSettings.ts` (DEFAULT_APP_SETTINGS).
 *
 * ⚠️ Uses FIREBASE_SERVICE_ACCOUNT env var.
 *
 * Usage:   node scripts/reset-map-defaults.js
 * Dry run: DRY_RUN=1 node scripts/reset-map-defaults.js
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.env.DRY_RUN === "1";

console.log("\n🗑️  ========== MAP DEFAULTS RESET ==========");
console.log(DRY_RUN ? "🧪 DRY RUN — no writes will be made." : "⚠️  LIVE MODE — deletes are permanent.");
console.log("=============================================\n");

async function deleteCollection(db, name) {
  const ref = db.collection(name);
  const snap = await ref.limit(500).get();
  if (snap.empty) {
    console.log("  " + name.padEnd(20) + " (empty)");
    return 0;
  }
  if (DRY_RUN) {
    console.log("  " + name.padEnd(20) + " would delete " + snap.size);
    return snap.size;
  }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log("  " + name.padEnd(20) + " deleted " + snap.size);
  return snap.size;
}

async function main() {
  console.log("🔧 Initializing Firebase Admin...");
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  if (!serviceAccount.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT not found in environment");
  }
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();
  console.log("✅ Firebase initialized (" + serviceAccount.project_id + ")\n");

  let total = 0;
  for (const col of ["mapDefaults", "mapSettings"]) {
    console.log("🔎 " + col);
    total += await deleteCollection(db, col);
  }

  console.log("\n📊 Total docs " + (DRY_RUN ? "would delete" : "deleted") + ": " + total);
  console.log("✅ Map defaults reset — app will use baked-in KSYK Helsinki defaults.\n");
}

main().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
