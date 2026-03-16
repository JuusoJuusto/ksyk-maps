import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: "ksyk-maps",
});

const db = getFirestore(app);

async function deleteAllRooms() {
  try {
    console.log('🗑️  Starting to delete all rooms from Firebase...');
    
    const roomsRef = db.collection('rooms');
    const snapshot = await roomsRef.get();
    
    console.log(`📊 Found ${snapshot.size} rooms to delete`);
    
    if (snapshot.size === 0) {
      console.log('✅ No rooms to delete');
      process.exit(0);
      return;
    }
    
    let deleted = 0;
    for (const roomDoc of snapshot.docs) {
      await roomDoc.ref.delete();
      deleted++;
      console.log(`🗑️  Deleted room ${deleted}/${snapshot.size}: ${roomDoc.data().roomNumber || roomDoc.id}`);
    }
    
    console.log(`✅ Successfully deleted all ${deleted} rooms!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting rooms:', error);
    process.exit(1);
  }
}

deleteAllRooms();
