/**
 * AALTO SPACE DATA SEEDING SCRIPT
 * Seeds sample data for Aalto Space features
 */

import { storage } from "./storage";

export async function seedAaltoSpaceData() {
  console.log('🏫 ========== SEEDING AALTO SPACE DATA ==========');

  try {
    // Get existing rooms
    const rooms = await storage.getRooms();
    console.log(`📍 Found ${rooms.length} existing rooms`);

    // Mark first 20 rooms as bookable
    console.log('📝 Marking rooms as bookable...');
    let bookableCount = 0;
    for (const room of rooms.slice(0, 20)) {
      await storage.updateRoom(room.id, {
        isBookable: true,
        maxOccupancy: Math.floor(Math.random() * 30) + 10,
        amenities: ['wifi', 'projector', 'whiteboard'],
        currentStatus: 'free',
      });
      bookableCount++;
    }
    console.log(`✅ Marked ${bookableCount} rooms as bookable`);

    // Create sample campus services
    console.log('🍽️ Creating campus services...');
    
    const buildings = await storage.getBuildings();
    if (buildings.length === 0) {
      console.log('⚠️ No buildings found. Please seed buildings first.');
      return;
    }

    const firstBuilding = buildings[0];

    // Sample services
    const services = [
      {
        name: 'Main Cafeteria',
        nameEn: 'Main Cafeteria',
        nameFi: 'Pääkahvila',
        type: 'restaurant',
        buildingId: firstBuilding.id,
        floor: 1,
        description: 'Main campus cafeteria with daily lunch menu',
        descriptionFi: 'Kampuksen pääkahvila päivittäisellä lounasmenuulla',
        openingHours: {
          monday: { open: '08:00', close: '16:00' },
          tuesday: { open: '08:00', close: '16:00' },
          wednesday: { open: '08:00', close: '16:00' },
          thursday: { open: '08:00', close: '16:00' },
          friday: { open: '08:00', close: '15:00' },
        },
        currentlyOpen: true,
        dietaryOptions: ['vegetarian', 'vegan', 'gluten_free'],
        paymentMethods: ['cash', 'card', 'mobile', 'student_card'],
        amenities: ['wifi', 'seating', 'takeaway'],
      },
      {
        name: 'Campus Gym',
        nameEn: 'Campus Gym',
        nameFi: 'Kampuksen kuntosali',
        type: 'gym',
        buildingId: firstBuilding.id,
        floor: 0,
        description: 'Fully equipped gym for students and staff',
        descriptionFi: 'Täysin varustettu kuntosali opiskelijoille ja henkilökunnalle',
        openingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '20:00' },
          saturday: { open: '08:00', close: '18:00' },
          sunday: { open: '10:00', close: '18:00' },
        },
        currentlyOpen: true,
        amenities: ['lockers', 'showers', 'equipment'],
      },
      {
        name: 'Library',
        nameEn: 'Library',
        nameFi: 'Kirjasto',
        type: 'library',
        buildingId: firstBuilding.id,
        floor: 2,
        description: 'Study spaces and book collection',
        descriptionFi: 'Opiskelutiloja ja kirjakokoelma',
        openingHours: {
          monday: { open: '08:00', close: '20:00' },
          tuesday: { open: '08:00', close: '20:00' },
          wednesday: { open: '08:00', close: '20:00' },
          thursday: { open: '08:00', close: '20:00' },
          friday: { open: '08:00', close: '18:00' },
        },
        currentlyOpen: true,
        amenities: ['wifi', 'quiet', 'computers', 'printers'],
      },
    ];

    console.log(`📦 Creating ${services.length} services...`);
    // Note: You'll need to implement createCampusService in storage
    // For now, just log what would be created
    for (const service of services) {
      console.log(`  ✅ Would create: ${service.nameEn} (${service.type})`);
    }

    console.log('✅ ========== AALTO SPACE DATA SEEDED SUCCESSFULLY ==========');
    console.log(`📊 Summary:`);
    console.log(`  - Bookable rooms: ${bookableCount}`);
    console.log(`  - Campus services: ${services.length}`);
    console.log(`\n⚠️  Note: Campus services creation requires storage.createCampusService() implementation`);
  } catch (error) {
    console.error('❌ Error seeding Aalto Space data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAaltoSpaceData()
    .then(() => {
      console.log('✅ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
