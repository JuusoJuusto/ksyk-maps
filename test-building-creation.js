// Test script to create a sample building and verify it appears on the map
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

console.log('\n🏗️  ========== TESTING BUILDING CREATION ==========\n');

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

async function createTestBuilding() {
  try {
    console.log('📋 Creating test building...');
    
    const testBuilding = {
      name: "TEST",
      nameEn: "Test Building",
      nameFi: "Testirakennus",
      description: "Test building for verification",
      floors: 2,
      capacity: 100,
      colorCode: "#3B82F6",
      mapPositionX: 0,
      mapPositionY: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('buildings').add(testBuilding);
    console.log(`✅ Test building created with ID: ${docRef.id}`);
    console.log(`   Name: ${testBuilding.name}`);
    console.log(`   Position: (${testBuilding.mapPositionX}, ${testBuilding.mapPositionY})`);
    console.log(`   Color: ${testBuilding.colorCode}`);
    
    console.log('\n📋 Fetching all buildings...');
    const buildingsSnapshot = await db.collection('buildings').get();
    console.log(`✅ Total buildings in database: ${buildingsSnapshot.size}`);
    
    buildingsSnapshot.forEach(doc => {
      const building = doc.data();
      console.log(`   - ${building.name} (${building.nameEn}) at (${building.mapPositionX}, ${building.mapPositionY})`);
    });
    
    console.log('\n==========================================');
    console.log('✅ TEST COMPLETE!');
    console.log('==========================================\n');
    
    console.log('📝 Next steps:');
    console.log('   1. Go to your Vercel app main page');
    console.log('   2. You should see the TEST building at center (0, 0)');
    console.log('   3. If you see it, buildings are working correctly!');
    console.log('   4. Go to KSYK Builder to create real buildings');
    console.log('');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

createTestBuilding();
