import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import path from "path";

if (!getApps().length) {
  const sa = JSON.parse(readFileSync(path.join(process.cwd(), "serviceAccountKey.json"), "utf8"));
  initializeApp({ credential: cert(sa) });
}
const db = getFirestore();
const snap = await db.collection("hallways").limit(3).get();
console.log("Total docs:", snap.size);
snap.docs.forEach((d) => {
  const data = d.data();
  console.log("---");
  console.log("ID:", d.id);
  console.log("Keys:", Object.keys(data).join(", "));
  console.log("buildingId:", data.buildingId);
  console.log("surface:", data.surface);
  console.log("coordinates type:", typeof data.coordinates);
  if (data.coordinates) console.log("coordinates sample:", JSON.stringify(data.coordinates).slice(0, 120));
});
process.exit(0);
