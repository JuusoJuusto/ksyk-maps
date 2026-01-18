// Script to delete all buildings from Firebase
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: "ksyk-maps",
});

const db = getFirestore();

async function deleteAllBuildings() {
  console.log('🗑️ Deleting all buildings from Firebase...\n');
  
  const buildings = await db.collection('buildings').get();
  console.log(`Found ${buildings.size} buildings to delete`);
  
  const deletePromises = buildings.docs.map(doc => {
    console.log(`  Deleting: ${doc.data().name} (${doc.id})`);
    return doc.ref.delete();
  });
  
  await Promise.all(deletePromises);
  
  console.log(`\n✅ Deleted ${buildings.size} buildings!`);
  
  // Verify
  const remaining = await db.collection('buildings').get();
  console.log(`📊 Remaining buildings: ${remaining.size}`);
  
  process.exit(0);
}

deleteAllBuildings().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
