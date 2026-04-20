import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "ksyk-maps",
  });
}

const db = getFirestore();

async function verifyAndFix() {
  console.log('\n🔍 Verifying Wilma Data...\n');
  
  // Check students
  const studentsSnapshot = await db.collection('wilmaUsers').doc('students').collection('list').get();
  console.log(`📊 Found ${studentsSnapshot.size} students in Firebase`);
  
  if (studentsSnapshot.size > 0) {
    console.log('\n👥 Students:');
    studentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.firstName} ${data.lastName} (ID: ${doc.id})`);
    });
  }
  
  // Check parents
  const parentsSnapshot = await db.collection('wilmaUsers').doc('parents').collection('list').get();
  console.log(`\n📊 Found ${parentsSnapshot.size} parents in Firebase`);
  
  // Check specific student ID
  const testId = '1WQvBRruhcNrBbKSFbXq';
  console.log(`\n🔍 Checking for student ID: ${testId}`);
  const testDoc = await db.collection('wilmaUsers').doc('students').collection('list').doc(testId).get();
  
  if (testDoc.exists) {
    console.log('✅ Student found!');
    console.log(JSON.stringify(testDoc.data(), null, 2));
  } else {
    console.log('❌ Student NOT found in Firebase');
    console.log('🔍 Searching all students for similar ID...');
    
    studentsSnapshot.docs.forEach(doc => {
      if (doc.id.includes('1WQv') || doc.id.includes('BbKS')) {
        console.log(`  Found similar: ${doc.id}`);
      }
    });
  }
  
  console.log('\n✅ Verification complete');
}

verifyAndFix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
