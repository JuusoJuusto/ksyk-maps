#!/usr/bin/env node

/**
 * Script to delete ALL Wilma-related data from Firebase.
 *
 * Removes every Wilma collection: users, schedules, grades, assignments,
 * messages, attendance, exams, courses, lesson journals, notifications,
 * dashboard preferences, calendar events, analytics, AI interactions,
 * desktop settings/apps/config, detentions, extended homework/exams,
 * behavior notes, exam results.
 *
 * Also drills into the wilmaUsers document's subcollections
 * (students/list, parents/list).
 *
 * ⚠️ This action CANNOT be undone. Run it against production ONLY when
 *    you're certain. Uses FIREBASE_SERVICE_ACCOUNT env var for auth.
 *
 * Usage:  node scripts/delete-all-wilma-data.js
 * Dry run:  DRY_RUN=1 node scripts/delete-all-wilma-data.js
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.env.DRY_RUN === "1";

// All top-level Wilma collections in the Firestore.
const WILMA_COLLECTIONS = [
  "wilmaUsers",
  "wilmaSchedules",
  "wilmaSettings",
  "wilmaGrades",
  "wilmaAssignments",
  "wilmaMessages",
  "wilmaAttendance",
  "wilmaExams",
  "wilmaClasses",
  "wilmaCourses",
  "wilmaLessonJournal",
  "wilmaHomeworkExtended",
  "wilmaHomeworkSubmissions",
  "wilmaExamsExtended",
  "wilmaExamResults",
  "wilmaBehaviorNotes",
  "wilmaNotifications",
  "wilmaDashboardPreferences",
  "wilmaCalendarEvents",
  "wilmaAnalytics",
  "wilmaAiInteractions",
  "wilmaDesktopSettings",
  "wilmaDesktopApps",
  "wilmaUserDesktopConfig",
  "wilmaDetentions",
];

// Known subcollections on specific wilmaUsers docs.
const WILMA_USER_SUBCOLLECTIONS = [
  { docId: "students", subcol: "list" },
  { docId: "parents", subcol: "list" },
];

console.log("\n🗑️  ========== WILMA DATA CLEANUP ==========");
console.log(DRY_RUN ? "🧪 DRY RUN — no writes will be made." : "⚠️  LIVE MODE — deletes are permanent.");
console.log("📚 " + WILMA_COLLECTIONS.length + " collections + " + WILMA_USER_SUBCOLLECTIONS.length + " subcollections");
console.log("🔥 This action CANNOT be undone in live mode.");
console.log("=============================================\n");

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

  // 1. Drill into wilmaUsers/{students,parents}/list first.
  for (const { docId, subcol } of WILMA_USER_SUBCOLLECTIONS) {
    const path = "wilmaUsers/" + docId + "/" + subcol;
    console.log("🔎 " + path);
    const ref = db.collection("wilmaUsers").doc(docId).collection(subcol);
    const deleted = await deleteCollectionBatched(db, ref, path);
    stats[path] = deleted;
    grandTotal += deleted;
  }

  // 2. Wipe every top-level wilma collection.
  for (const col of WILMA_COLLECTIONS) {
    console.log("🔎 " + col);
    const ref = db.collection(col);
    const deleted = await deleteCollectionBatched(db, ref, col);
    stats[col] = deleted;
    grandTotal += deleted;
  }

  console.log("\n📊 ========== SUMMARY ==========");
  for (const [k, v] of Object.entries(stats)) {
    if (v > 0) console.log("  " + k.padEnd(48) + " " + v);
  }
  console.log("  ─────────────────────────────────────────────────");
  console.log("  TOTAL " + (DRY_RUN ? "(would-delete)" : "(deleted)") + ": " + grandTotal + "\n");
  if (DRY_RUN) {
    console.log("🧪 Dry run complete. Re-run without DRY_RUN=1 to actually delete.\n");
  } else {
    console.log("✅ Wilma cleanup complete.\n");
  }
}

main().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
