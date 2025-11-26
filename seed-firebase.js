// Quick Firebase seeding script
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedFirebase() {
  console.log('🌱 Seeding Firebase...');
  
  // Seed buildings
  const buildings = [
    { name: 'M', nameEn: 'Music Building', nameFi: 'Musiikkitalo', floors: 2, colorCode: '#8B5CF6', mapPositionX: 100, mapPositionY: 100, capacity: 200, isActive: true },
    { name: 'K', nameEn: 'Main Building', nameFi: 'Päärakennus', floors: 3, colorCode: '#3B82F6', mapPositionX: 300, mapPositionY: 100, capacity: 500, isActive: true },
    { name: 'L', nameEn: 'Sports Hall', nameFi: 'Liikuntahalli', floors: 2, colorCode: '#10B981', mapPositionX: 500, mapPositionY: 100, capacity: 300, isActive: true },
    { name: 'R', nameEn: 'Science Building', nameFi: 'Tiedetalo', floors: 2, colorCode: '#EF4444', mapPositionX: 100, mapPositionY: 300, capacity: 250, isActive: true },
    { name: 'U', nameEn: 'U-Wing', nameFi: 'U-siipi', floors: 3, colorCode: '#F59E0B', mapPositionX: 300, mapPositionY: 300, capacity: 400, isActive: true }
  ];
  
  for (const building of buildings) {
    await db.collection('buildings').add({ ...building, createdAt: new Date(), updatedAt: new Date() });
    console.log(`✅ Added building: ${building.name}`);
  }
  
  // Seed announcements
  const announcements = [
    { title: 'Welcome!', titleEn: 'Welcome to KSYK Map!', titleFi: 'Tervetuloa KSYK Karttaan!', content: 'Navigate campus easily', contentEn: 'Navigate campus easily', contentFi: 'Navigoi kampuksella helposti', priority: 'high', isActive: true, authorId: 'owner-admin-user' },
    { title: 'Library Hours', titleEn: 'Library Hours Extended', titleFi: 'Kirjaston aukioloajat', content: 'Open until 8 PM', contentEn: 'Open until 8 PM', contentFi: 'Avoinna klo 20 asti', priority: 'normal', isActive: true, authorId: 'owner-admin-user' }
  ];
  
  for (const announcement of announcements) {
    await db.collection('announcements').add({ ...announcement, createdAt: new Date(), updatedAt: new Date() });
    console.log(`✅ Added announcement: ${announcement.title}`);
  }
  
  console.log('🎉 Firebase seeded!');
  process.exit(0);
}

seedFirebase().catch(console.error);
