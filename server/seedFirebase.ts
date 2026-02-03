import { firebaseStorage } from './firebaseStorage.js';

// KSYK Campus buildings data - EVEN BIGGER AND MORE SPREAD OUT
const buildings = [
  { name: "M", nameEn: "Music Building", nameFi: "Musiikkitalo", descriptionEn: "Music and arts education", descriptionFi: "Musiikin ja taiteen opetus", floors: 3, mapPositionX: 50, mapPositionY: 50, colorCode: "#9333EA", isActive: true },
  { name: "K", nameEn: "Central Hall", nameFi: "Keskushalli", descriptionEn: "Main building", descriptionFi: "Päärakennus", floors: 3, mapPositionX: 550, mapPositionY: 50, colorCode: "#DC2626", isActive: true },
  { name: "L", nameEn: "Gymnasium", nameFi: "Liikuntahalli", descriptionEn: "Sports and physical education", descriptionFi: "Urheilu ja liikuntakasvatus", floors: 2, mapPositionX: 1050, mapPositionY: 50, colorCode: "#059669", isActive: true },
  { name: "R", nameEn: "R Building", nameFi: "R-rakennus", descriptionEn: "Research and laboratories", descriptionFi: "Tutkimus ja laboratoriot", floors: 3, mapPositionX: 50, mapPositionY: 450, colorCode: "#F59E0B", isActive: true },
  { name: "A", nameEn: "A Building", nameFi: "A-rakennus", descriptionEn: "Administration and offices", descriptionFi: "Hallinto ja toimistot", floors: 3, mapPositionX: 550, mapPositionY: 450, colorCode: "#8B5CF6", isActive: true },
  { name: "U", nameEn: "U Building", nameFi: "U-rakennus", descriptionEn: "University programs", descriptionFi: "Yliopisto-ohjelmat", floors: 3, mapPositionX: 1050, mapPositionY: 450, colorCode: "#3B82F6", isActive: true },
];

async function seedFirebase() {
  console.log('🌱 Seeding Firebase with KSYK campus data...');
  
  try {
    // Get all existing buildings
    const existingBuildings = await firebaseStorage.getBuildings();
    
    console.log(`📊 Found ${existingBuildings.length} existing buildings`);
    
    // Update existing buildings to ensure they have isActive=true
    for (const existing of existingBuildings) {
      if (existing.isActive !== true) {
        console.log(`🔄 Updating building ${existing.name} to set isActive=true`);
        await firebaseStorage.updateBuilding(existing.id, { ...existing, isActive: true });
      }
    }
    
    // Check which buildings need to be added
    const existingNames = new Set(existingBuildings.map(b => b.name));
    const buildingsToAdd = buildings.filter(b => !existingNames.has(b.name));
    
    if (buildingsToAdd.length === 0) {
      console.log(`✅ All ${buildings.length} buildings already exist`);
      console.log('Buildings:', existingBuildings.map(b => b.name).join(', '));
      return;
    }
    
    // Add missing buildings
    console.log(`➕ Adding ${buildingsToAdd.length} new buildings...`);
    for (const building of buildingsToAdd) {
      const created = await firebaseStorage.createBuilding(building as any);
      console.log(`✅ Created building: ${created.name}`);
    }
    
    console.log('🎉 Firebase seeding complete!');
    console.log(`📊 Total buildings: ${existingBuildings.length + buildingsToAdd.length}`);
  } catch (error) {
    console.error('❌ Error seeding Firebase:', error);
    throw error;
  }
}

// Run seed function immediately
console.log('🚀 Starting seed process...');
seedFirebase()
  .then(() => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });

export { seedFirebase };
