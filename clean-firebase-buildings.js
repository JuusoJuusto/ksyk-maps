// Clean all buildings from Firebase
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

console.log('\n🧹 ========== CLEANING FIREBASE BUILDINGS ==========\n');

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "ksyk-maps",
  });
  console.log('✅ Firebase Admin initialized\n');
}

const db = getFirestore();

async function cleanBuildings() {
  try {
    console.log('📋 Fetching all buildings...');
    const buildingsSnapshot = await db.collection('buildings').get();
    
    if (buildingsSnapshot.empty) {
      console.log('✅ No buildings found - already clean!');
      return;
    }
    
    console.log(`Found ${buildingsSnapshot.size} building(s) to delete:\n`);
    
    // List buildings before deleting
    buildingsSnapshot.forEach(doc => {
      const building = doc.data();
      console.log(`   - ${building.name} (${doc.id})`);
    });
    
    console.log('\n🗑️  Deleting buildings...');
    
    // Delete all buildings
    const batch = db.batch();
    buildingsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`✅ Successfully deleted ${buildingsSnapshot.size} building(s)!`);
    console.log('\n==========================================');
    console.log('✅ CLEANUP COMPLETE!');
    console.log('==========================================\n');
    
    console.log('📝 Next steps:');
    console.log('   1. Go to KSYK Builder in admin panel');
    console.log('   2. Create real buildings for your campus');
    console.log('   3. Add rooms, hallways, and other features');
    console.log('');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanBuildings();
