import { firebaseStorage } from './firebaseStorage.js';

// KSYK Campus buildings data
const buildings = [
  { name: "M", nameEn: "Music Building", nameFi: "Musiikkitalo", descriptionEn: "Music and arts education", descriptionFi: "Musiikin ja taiteen opetus", floors: 3, mapPositionX: -200, mapPositionY: 50, colorCode: "#9333EA", isActive: true },
  { name: "K", nameEn: "Central Hall", nameFi: "Keskushalli", descriptionEn: "Main building", descriptionFi: "Päärakennus", floors: 3, mapPositionX: 100, mapPositionY: 0, colorCode: "#DC2626", isActive: true },
  { name: "L", nameEn: "Gymnasium", nameFi: "Liikuntahalli", descriptionEn: "Sports and physical education", descriptionFi: "Urheilu ja liikuntakasvatus", floors: 2, mapPositionX: 350, mapPositionY: 80, colorCode: "#059669", isActive: true },
  { name: "R", nameEn: "R Building", nameFi: "R-rakennus", descriptionEn: "Research and laboratories", descriptionFi: "Tutkimus ja laboratoriot", floors: 3, mapPositionX: -50, mapPositionY: 200, colorCode: "#F59E0B", isActive: true },
  { name: "A", nameEn: "A Building", nameFi: "A-rakennus", descriptionEn: "Administration and offices", descriptionFi: "Hallinto ja toimistot", floors: 3, mapPositionX: 250, mapPositionY: 180, colorCode: "#8B5CF6", isActive: true },
  { name: "U", nameEn: "U Building", nameFi: "U-rakennus", descriptionEn: "University programs", descriptionFi: "Yliopisto-ohjelmat", floors: 3, mapPositionX: -100, mapPositionY: -120, colorCode: "#3B82F6", isActive: true },
  { name: "OG", nameEn: "Old Gymnasium", nameFi: "Vanha liikuntahalli", descriptionEn: "Historic sports facility", descriptionFi: "Historiallinen liikuntapaikka", floors: 2, mapPositionX: 200, mapPositionY: -80, colorCode: "#06B6D4", isActive: true },
];

async function seedFirebase() {
  console.log('🌱 Seeding Firebase with KSYK campus data...');
  
  try {
    // Check if buildings already exist
    const existingBuildings = await firebaseStorage.getBuildings();
    
    if (existingBuildings.length > 0) {
      console.log(`✅ Firebase already has ${existingBuildings.length} buildings`);
      console.log('Buildings:', existingBuildings.map(b => b.name).join(', '));
      return;
    }
    
    // Add buildings
    console.log('Adding buildings...');
    for (const building of buildings) {
      const created = await firebaseStorage.createBuilding(building as any);
      console.log(`✅ Created building: ${created.name}`);
    }
    
    console.log('🎉 Firebase seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding Firebase:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFirebase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedFirebase };
