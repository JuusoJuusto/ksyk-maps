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

// Demo student data with Finnish names
const demoStudents = [
  {
    firstName: 'Mikko',
    lastName: 'Virtanen',
    class: '7A',
    dateOfBirth: '2010-03-15',
    email: 'mikko.virtanen@ksyk.fi',
    parent1FirstName: 'Matti',
    parent1LastName: 'Virtanen',
    parent1Email: 'matti.virtanen@email.fi',
    parent1Phone: '+358 40 123 4567',
    parent2FirstName: 'Maria',
    parent2LastName: 'Virtanen',
    parent2Email: 'maria.virtanen@email.fi',
    parent2Phone: '+358 40 234 5678'
  },
  {
    firstName: 'Emma',
    lastName: 'Korhonen',
    class: '7A',
    dateOfBirth: '2010-05-22',
    email: 'emma.korhonen@ksyk.fi',
    parent1FirstName: 'Jukka',
    parent1LastName: 'Korhonen',
    parent1Email: 'jukka.korhonen@email.fi',
    parent1Phone: '+358 40 345 6789',
    parent2FirstName: 'Anna',
    parent2LastName: 'Korhonen',
    parent2Email: 'anna.korhonen@email.fi',
    parent2Phone: '+358 40 456 7890'
  },
  {
    firstName: 'Ville',
    lastName: 'Mäkinen',
    class: '7B',
    dateOfBirth: '2010-08-10',
    email: 'ville.makinen@ksyk.fi',
    parent1FirstName: 'Pekka',
    parent1LastName: 'Mäkinen',
    parent1Email: 'pekka.makinen@email.fi',
    parent1Phone: '+358 40 567 8901',
    parent2FirstName: 'Liisa',
    parent2LastName: 'Mäkinen',
    parent2Email: 'liisa.makinen@email.fi',
    parent2Phone: '+358 40 678 9012'
  },
  {
    firstName: 'Sofia',
    lastName: 'Nieminen',
    class: '7B',
    dateOfBirth: '2010-11-03',
    email: 'sofia.nieminen@ksyk.fi',
    parent1FirstName: 'Timo',
    parent1LastName: 'Nieminen',
    parent1Email: 'timo.nieminen@email.fi',
    parent1Phone: '+358 40 789 0123',
    parent2FirstName: 'Sari',
    parent2LastName: 'Nieminen',
    parent2Email: 'sari.nieminen@email.fi',
    parent2Phone: '+358 40 890 1234'
  },
  {
    firstName: 'Aleksi',
    lastName: 'Laine',
    class: '8A',
    dateOfBirth: '2009-02-18',
    email: 'aleksi.laine@ksyk.fi',
    parent1FirstName: 'Kari',
    parent1LastName: 'Laine',
    parent1Email: 'kari.laine@email.fi',
    parent1Phone: '+358 40 901 2345',
    parent2FirstName: 'Kaisa',
    parent2LastName: 'Laine',
    parent2Email: 'kaisa.laine@email.fi',
    parent2Phone: '+358 40 012 3456'
  },
  {
    firstName: 'Aino',
    lastName: 'Koskinen',
    class: '8A',
    dateOfBirth: '2009-06-25',
    email: 'aino.koskinen@ksyk.fi',
    parent1FirstName: 'Juha',
    parent1LastName: 'Koskinen',
    parent1Email: 'juha.koskinen@email.fi',
    parent1Phone: '+358 40 123 4560',
    parent2FirstName: 'Hanna',
    parent2LastName: 'Koskinen',
    parent2Email: 'hanna.koskinen@email.fi',
    parent2Phone: '+358 40 234 5601'
  },
  {
    firstName: 'Eetu',
    lastName: 'Salo',
    class: '8B',
    dateOfBirth: '2009-09-12',
    email: 'eetu.salo@ksyk.fi',
    parent1FirstName: 'Mikael',
    parent1LastName: 'Salo',
    parent1Email: 'mikael.salo@email.fi',
    parent1Phone: '+358 40 345 6012',
    parent2FirstName: 'Laura',
    parent2LastName: 'Salo',
    parent2Email: 'laura.salo@email.fi',
    parent2Phone: '+358 40 456 0123'
  },
  {
    firstName: 'Olivia',
    lastName: 'Rantanen',
    class: '8B',
    dateOfBirth: '2009-12-08',
    email: 'olivia.rantanen@ksyk.fi',
    parent1FirstName: 'Antti',
    parent1LastName: 'Rantanen',
    parent1Email: 'antti.rantanen@email.fi',
    parent1Phone: '+358 40 567 0124',
    parent2FirstName: 'Minna',
    parent2LastName: 'Rantanen',
    parent2Email: 'minna.rantanen@email.fi',
    parent2Phone: '+358 40 678 0125'
  },
  {
    firstName: 'Onni',
    lastName: 'Heikkinen',
    class: '9A',
    dateOfBirth: '2008-04-20',
    email: 'onni.heikkinen@ksyk.fi',
    parent1FirstName: 'Petri',
    parent1LastName: 'Heikkinen',
    parent1Email: 'petri.heikkinen@email.fi',
    parent1Phone: '+358 40 789 0126',
    parent2FirstName: 'Päivi',
    parent2LastName: 'Heikkinen',
    parent2Email: 'paivi.heikkinen@email.fi',
    parent2Phone: '+358 40 890 0127'
  },
  {
    firstName: 'Helmi',
    lastName: 'Järvinen',
    class: '9A',
    dateOfBirth: '2008-07-14',
    email: 'helmi.jarvinen@ksyk.fi',
    parent1FirstName: 'Markku',
    parent1LastName: 'Järvinen',
    parent1Email: 'markku.jarvinen@email.fi',
    parent1Phone: '+358 40 901 0128',
    parent2FirstName: 'Merja',
    parent2LastName: 'Järvinen',
    parent2Email: 'merja.jarvinen@email.fi',
    parent2Phone: '+358 40 012 0129'
  }
];

async function cleanupOldStudents() {
  console.log('🗑️  Cleaning up old students...');
  
  try {
    // Delete from students subcollection
    const studentsSnapshot = await db.collection('wilmaUsers').doc('students').collection('list').get();
    console.log(`Found ${studentsSnapshot.size} students to delete`);
    
    const deletePromises = studentsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    console.log('✅ Old students deleted');
  } catch (error) {
    console.error('❌ Error cleaning up students:', error);
  }
}

async function cleanupOldParents() {
  console.log('🗑️  Cleaning up old parents...');
  
  try {
    // Delete from parents subcollection
    const parentsSnapshot = await db.collection('wilmaUsers').doc('parents').collection('list').get();
    console.log(`Found ${parentsSnapshot.size} parents to delete`);
    
    const deletePromises = parentsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    console.log('✅ Old parents deleted');
  } catch (error) {
    console.error('❌ Error cleaning up parents:', error);
  }
}

async function createParent(parentData: any): Promise<string> {
  const parentRef = db.collection('wilmaUsers').doc('parents').collection('list').doc();
  
  const parent = {
    id: parentRef.id,
    firstName: parentData.firstName,
    lastName: parentData.lastName,
    email: parentData.email,
    phone: parentData.phone,
    username: parentData.email.split('@')[0],
    password: 'parent123',
    role: 'parent',
    isActive: true,
    isTemporaryPassword: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await parentRef.set(parent);
  console.log(`  ✅ Created parent: ${parent.firstName} ${parent.lastName} (${parent.id})`);
  
  return parentRef.id;
}

async function createStudent(studentData: any, parent1Id: string, parent2Id: string) {
  const studentRef = db.collection('wilmaUsers').doc('students').collection('list').doc();
  
  const student = {
    id: studentRef.id,
    firstName: studentData.firstName,
    lastName: studentData.lastName,
    email: studentData.email,
    username: studentData.email.split('@')[0],
    password: 'student123',
    role: 'student',
    class: studentData.class,
    dateOfBirth: studentData.dateOfBirth,
    studentId: Math.floor(100000 + Math.random() * 900000).toString(),
    
    // Parent 1 info
    parent1FirstName: studentData.parent1FirstName,
    parent1LastName: studentData.parent1LastName,
    parent1Email: studentData.parent1Email,
    parent1Phone: studentData.parent1Phone,
    parent1Id: parent1Id,
    
    // Parent 2 info
    parent2FirstName: studentData.parent2FirstName,
    parent2LastName: studentData.parent2LastName,
    parent2Email: studentData.parent2Email,
    parent2Phone: studentData.parent2Phone,
    parent2Id: parent2Id,
    
    isActive: true,
    isTemporaryPassword: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await studentRef.set(student);
  console.log(`✅ Created student: ${student.firstName} ${student.lastName} (${student.class}) - ID: ${student.id}`);
  
  return studentRef.id;
}

async function seedDemoData() {
  console.log('\n🌱 Starting Wilma demo data seeding...\n');
  
  // Step 1: Cleanup
  await cleanupOldStudents();
  await cleanupOldParents();
  
  console.log('\n📝 Creating demo students and parents...\n');
  
  // Step 2: Create students with parents
  for (const studentData of demoStudents) {
    console.log(`\n👨‍👩‍👧 Creating family: ${studentData.lastName}`);
    
    // Create parent 1
    const parent1Id = await createParent({
      firstName: studentData.parent1FirstName,
      lastName: studentData.parent1LastName,
      email: studentData.parent1Email,
      phone: studentData.parent1Phone
    });
    
    // Create parent 2
    const parent2Id = await createParent({
      firstName: studentData.parent2FirstName,
      lastName: studentData.parent2LastName,
      email: studentData.parent2Email,
      phone: studentData.parent2Phone
    });
    
    // Create student with parent links
    await createStudent(studentData, parent1Id, parent2Id);
  }
  
  console.log('\n✅ Demo data seeding complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Students created: ${demoStudents.length}`);
  console.log(`   - Parents created: ${demoStudents.length * 2}`);
  console.log(`   - Classes: 7A, 7B, 8A, 8B, 9A`);
  console.log(`\n🔑 Login credentials:`);
  console.log(`   Students: username = email prefix, password = student123`);
  console.log(`   Parents: username = email prefix, password = parent123`);
  console.log(`\n📧 Example logins:`);
  console.log(`   Student: mikko.virtanen / student123`);
  console.log(`   Parent: matti.virtanen / parent123`);
}

// Run the seed script
seedDemoData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
