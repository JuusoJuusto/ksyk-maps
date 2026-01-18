// Script to seed buildings into Firebase with proper isActive flag
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: "ksyk-maps",
});

const db = getFirestore();

// KSYK Campus Buildings with proper data
const buildings = [
  {
    name: "M",
    nameEn: "Music Building",
    nameFi: "Musiikkitalo",
    description: null,
    descriptionEn: "Music and arts education",
    descriptionFi: "Musiikin ja taiteen opetus",
    floors: 3,
    mapPositionX: 200,
    mapPositionY: 150,
    colorCode: "#9333EA",
    isActive: true,
    capacity: null,
    facilities: null,
    accessInfo: null,
  },
  {
    name: "K",
    nameEn: "Central Hall",
    nameFi: "Keskushalli",
    description: null,
    descriptionEn: "Main building",
    descriptionFi: "Päärakennus",
    floors: 3,
    mapPositionX: 500,
    mapPositionY: 100,
    colorCode: "#DC2626",
    isActive: true,
    capacity: null,
    facilities: null,
    accessInfo: null,
  },
  {
    name: "L",
    nameEn: "Gymnasium",
    nameFi: "Liikuntahalli",
    description: null,
    descriptionEn: "Sports and physical education",
    descriptionFi: "Urheilu ja liikuntakasvatus",
    floors: 2,
    mapPositionX: 750,
    mapPositionY: 180,
    colorCode: "#059669",
    isActive: true,
    capacity: null,
    facilities: null,
    accessInfo: null,
  },
  {
    name: "R",
    nameEn: "R Building",
    nameFi: "R-rakennus",
    description: null,
    descriptionEn: "Research and laboratories",
    descriptionFi: "Tutkimus ja laboratoriot",
    floors: 3,
    mapPositionX: 350,
    mapPositionY: 300,
    colorCode: "#F59E0B",
    isActive: true,
    capacity: null,
    facilities: null,
    accessInfo: null,
  },
  {
    name: "A",
    nameEn: "A Building",
    nameFi: "A-rakennus",
    description: null,
    descriptionEn: "Administration and offices",
    descriptionFi: "Hallinto ja toimistot",
    floors: 3,
    mapPositionX: 650,
    mapPositionY: 280,
    colorCode: "#8B5CF6",
    isActive: true,
    capacity: null,
    facilities: null,
    accessInfo: null,
  },
  {
    name: "U",
    nameEn: "U Building",
    nameFi: "U-rakennus",
    description: null,
    descriptionEn: "University programs",
    descriptionFi: "Yliopisto-ohjelmat",
    floors: 3,
    mapPositionX: 300,
    mapPositionY: 480,
    colorCode: "#3B82F6",
    isActive: true,
    capacity: null,
    facilities: null,
    accessInfo: null,
  },
  {
    name: "OG",
    nameEn: "Old Gymnasium",
    nameFi: "Vanha liikuntahalli",
    description: null,
    descriptionEn: "Historic sports facility",
    descriptionFi: "Historiallinen liikuntapaikka",
    floors: 2,
    mapPositionX: 600,
    mapPositionY: 420,
    colorCode: "#06B6D4",
    isActive: true,
    capacity: null,
    facilities: null,
    accessInfo: null,
  },
];

async function seedBuildings() {
  console.log('🌱 Seeding buildings to Firebase...\n');
  
  // First, delete all existing buildings
  console.log('🗑️ Deleting existing buildings...');
  const existingBuildings = await db.collection('buildings').get();
  const deletePromises = existingBuildings.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);
  console.log(`✅ Deleted ${existingBuildings.size} existing buildings\n`);
  
  // Add new buildings
  console.log('➕ Adding new buildings...');
  for (const building of buildings) {
    const buildingData = {
      ...building,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await db.collection('buildings').add(buildingData);
    console.log(`✅ Added ${building.name} (${building.nameEn}) - ID: ${docRef.id}`);
  }
  
  console.log(`\n🎉 Successfully seeded ${buildings.length} buildings!`);
  
  // Verify
  console.log('\n🔍 Verifying...');
  const allBuildings = await db.collection('buildings').get();
  console.log(`📊 Total buildings in database: ${allBuildings.size}`);
  
  const activeBuildings = await db.collection('buildings').where('isActive', '==', true).get();
  console.log(`✅ Active buildings: ${activeBuildings.size}`);
  
  process.exit(0);
}

seedBuildings().catch(error => {
  console.error('❌ Error seeding buildings:', error);
  process.exit(1);
});
