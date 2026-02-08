import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function cleanRoomsAndHallways() {
  console.log('🧹 Starting cleanup of rooms and hallways...\n');
  
  try {
    // Delete all rooms
    console.log('📦 Deleting all rooms...');
    const roomsSnapshot = await db.collection('rooms').get();
    const roomDeletePromises = roomsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(roomDeletePromises);
    console.log(`✅ Deleted ${roomsSnapshot.size} rooms\n`);
    
    // Delete all hallways
    console.log('🚪 Deleting all hallways...');
    const hallwaysSnapshot = await db.collection('hallways').get();
    const hallwayDeletePromises = hallwaysSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(hallwayDeletePromises);
    console.log(`✅ Deleted ${hallwaysSnapshot.size} hallways\n`);
    
    // Delete all connectors (if they exist)
    console.log('🔗 Deleting all connectors...');
    const connectorsSnapshot = await db.collection('connectors').get();
    const connectorDeletePromises = connectorsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(connectorDeletePromises);
    console.log(`✅ Deleted ${connectorsSnapshot.size} connectors\n`);
    
    console.log('🎉 Cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Rooms deleted: ${roomsSnapshot.size}`);
    console.log(`   - Hallways deleted: ${hallwaysSnapshot.size}`);
    console.log(`   - Connectors deleted: ${connectorsSnapshot.size}`);
    console.log(`   - Total items deleted: ${roomsSnapshot.size + hallwaysSnapshot.size + connectorsSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanRoomsAndHallways()
  .then(() => {
    console.log('\n✨ All done! Database is now clean.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });
