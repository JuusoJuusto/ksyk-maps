// Quick test to check buildings in Firebase
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkBuildings() {
  console.log('🔍 Checking buildings in Firebase...\n');
  
  const snapshot = await db.collection('buildings').get();
  
  console.log(`📊 Total buildings: ${snapshot.size}\n`);
  
  if (snapshot.empty) {
    console.log('❌ No buildings found in Firebase!');
    console.log('💡 You need to create buildings using the KSYK Builder');
  } else {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`🏢 Building: ${data.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Position: (${data.mapPositionX}, ${data.mapPositionY})`);
      console.log(`   Color: ${data.colorCode}`);
      console.log(`   Floors: ${data.floors}`);
      if (data.description) {
        try {
          const desc = JSON.parse(data.description);
          if (desc.customShape) {
            console.log(`   Custom Shape: ${desc.customShape.length} points`);
          }
        } catch {}
      }
      console.log('');
    });
  }
  
  process.exit(0);
}

checkBuildings().catch(console.error);
