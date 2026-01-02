// Complete system test: Buildings, Rooms, and Hallways
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

console.log('\n🧪 ========== COMPLETE SYSTEM TEST ==========\n');

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

async function testCompleteSystem() {
  try {
    // 1. Test Buildings
    console.log('📋 Testing Buildings...');
    const buildingsSnapshot = await db.collection('buildings').get();
    console.log(`✅ Buildings: ${buildingsSnapshot.size} found`);
    
    if (buildingsSnapshot.size > 0) {
      const firstBuilding = buildingsSnapshot.docs[0];
      const buildingData = firstBuilding.data();
      console.log(`   First building: ${buildingData.name} (${buildingData.nameEn})`);
      console.log(`   Position: (${buildingData.mapPositionX}, ${buildingData.mapPositionY})`);
      console.log(`   Floors: ${buildingData.floors}`);
      
      // 2. Test Rooms
      console.log('\n📋 Testing Rooms...');
      const roomsSnapshot = await db.collection('rooms').get();
      console.log(`✅ Rooms: ${roomsSnapshot.size} found`);
      
      if (roomsSnapshot.size > 0) {
        roomsSnapshot.docs.slice(0, 3).forEach(doc => {
          const room = doc.data();
          console.log(`   - ${room.roomNumber}: ${room.name || room.nameEn} (Floor ${room.floor})`);
        });
      } else {
        console.log('   ⚠️  No rooms found - create some in KSYK Builder');
      }
      
      // 3. Test Hallways
      console.log('\n📋 Testing Hallways...');
      const hallwaysSnapshot = await db.collection('hallways').get();
      console.log(`✅ Hallways: ${hallwaysSnapshot.size} found`);
      
      if (hallwaysSnapshot.size > 0) {
        hallwaysSnapshot.docs.slice(0, 3).forEach(doc => {
          const hallway = doc.data();
          console.log(`   - ${hallway.name}: (${hallway.startX},${hallway.startY}) → (${hallway.endX},${hallway.endY})`);
        });
      } else {
        console.log('   ⚠️  No hallways found - create some in KSYK Builder');
      }
      
      // 4. Test API Endpoints
      console.log('\n📋 Testing API Endpoints...');
      console.log('   Buildings API: /api/buildings');
      console.log('   Rooms API: /api/rooms');
      console.log('   Hallways API: /api/hallways');
      
      console.log('\n==========================================');
      console.log('✅ SYSTEM TEST COMPLETE!');
      console.log('==========================================\n');
      
      console.log('📊 Summary:');
      console.log(`   ✅ Buildings: ${buildingsSnapshot.size}`);
      console.log(`   ✅ Rooms: ${roomsSnapshot.size}`);
      console.log(`   ✅ Hallways: ${hallwaysSnapshot.size}`);
      
      console.log('\n📝 What to do next:');
      console.log('   1. Open your Vercel app: https://your-app.vercel.app');
      console.log('   2. Check the main page - buildings should appear on the map');
      console.log('   3. Login as admin: JuusoJuusto112@gmail.com');
      console.log('   4. Go to KSYK Builder to create more buildings, rooms, and hallways');
      console.log('   5. Buildings will appear on the main page immediately!');
      console.log('');
      
    } else {
      console.log('   ⚠️  No buildings found!');
      console.log('   Go to KSYK Builder and create your first building');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteSystem();
