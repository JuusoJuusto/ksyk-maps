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

const defaultClasses = [
  { name: '7A', grade: '7', homeroom: 'A201', teacher: 'Matti Virtanen' },
  { name: '7B', grade: '7', homeroom: 'A202', teacher: 'Anna Korhonen' },
  { name: '8A', grade: '8', homeroom: 'B301', teacher: 'Pekka Mäkinen' },
  { name: '8B', grade: '8', homeroom: 'B302', teacher: 'Liisa Nieminen' },
  { name: '9A', grade: '9', homeroom: 'C401', teacher: 'Kari Laine' },
  { name: '9B', grade: '9', homeroom: 'C402', teacher: 'Kaisa Koskinen' },
];

async function seedClasses() {
  console.log('\n🎓 Seeding Wilma Classes...\n');
  
  for (const classData of defaultClasses) {
    const docRef = db.collection('wilmaClasses').doc();
    const data = {
      ...classData,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await docRef.set(data);
    console.log(`✅ Created class: ${classData.name} (${classData.grade}. luokka)`);
  }
  
  console.log(`\n✅ Created ${defaultClasses.length} classes successfully!`);
}

seedClasses()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
