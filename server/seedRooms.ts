import { firebaseStorage } from './firebaseStorage.js';

// COMPREHENSIVE ROOMS FROM FLOOR PLAN - All 4 floors with K and M buildings
// Based on user-provided floor plan images showing K (Central Hall) and M (Music Building)
const sampleRooms = [
  // ==================== K BUILDING (Central Hall) - Floor 1 ====================
  { buildingId: '', roomNumber: 'K11', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K12', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 680, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K13', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 780, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K14', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 160, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K15', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 680, mapPositionY: 160, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K16', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 780, mapPositionY: 160, width: 80, height: 60, isActive: true },
  
  // ==================== K BUILDING - Floor 2 ====================
  { buildingId: '', roomNumber: 'K21', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K22', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 680, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K23', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 780, mapPositionY: 80, width: 80, height: 60, isActive: true },
  
  // ==================== K BUILDING - Floor 3 ====================
  { buildingId: '', roomNumber: 'K31', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K32', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 680, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K33', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 780, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K34', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 160, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K35', name: 'Art Studio', nameEn: 'Art Studio', nameFi: 'Taidestudio', floor: 3, type: 'classroom', capacity: 25, mapPositionX: 680, mapPositionY: 160, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K36', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 780, mapPositionY: 160, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K37', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 880, mapPositionY: 80, width: 80, height: 60, isActive: true },
  
  // ==================== K BUILDING - Floor 4 ====================
  { buildingId: '', roomNumber: 'K41', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K42', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 680, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K43', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 780, mapPositionY: 80, width: 80, height: 60, isActive: true },
  
  // ==================== K BUILDING - Floor 5 ====================
  { buildingId: '', roomNumber: 'K51', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 5, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K52', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 5, type: 'classroom', capacity: 30, mapPositionX: 680, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'K53', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 5, type: 'classroom', capacity: 30, mapPositionX: 780, mapPositionY: 80, width: 80, height: 60, isActive: true },
  
  // ==================== M BUILDING (Music) - Floor 1 ====================
  { buildingId: '', roomNumber: 'M11', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 1, type: 'classroom', capacity: 25, mapPositionX: 80, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'M12', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 1, type: 'classroom', capacity: 25, mapPositionX: 180, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'M13', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 1, type: 'classroom', capacity: 25, mapPositionX: 280, mapPositionY: 80, width: 80, height: 60, isActive: true },
  
  // ==================== M BUILDING - Floor 2 ====================
  { buildingId: '', roomNumber: 'M21', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 2, type: 'classroom', capacity: 25, mapPositionX: 80, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'M22', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 2, type: 'classroom', capacity: 25, mapPositionX: 180, mapPositionY: 80, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'M23', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 2, type: 'classroom', capacity: 25, mapPositionX: 280, mapPositionY: 80, width: 80, height: 60, isActive: true },
  
  // ==================== HALLWAYS AND CONNECTORS ====================
  { buildingId: '', roomNumber: 'K-Hall1', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 1, type: 'hallway', mapPositionX: 580, mapPositionY: 240, width: 380, height: 30, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall2', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 2, type: 'hallway', mapPositionX: 580, mapPositionY: 240, width: 380, height: 30, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall3', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 3, type: 'hallway', mapPositionX: 580, mapPositionY: 240, width: 380, height: 30, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall4', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 4, type: 'hallway', mapPositionX: 580, mapPositionY: 240, width: 380, height: 30, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall5', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 5, type: 'hallway', mapPositionX: 580, mapPositionY: 240, width: 380, height: 30, isActive: true },
  
  { buildingId: '', roomNumber: 'M-Hall1', name: 'Music Hallway', nameEn: 'Music Hallway', nameFi: 'Musiikkikäytävä', floor: 1, type: 'hallway', mapPositionX: 80, mapPositionY: 160, width: 280, height: 30, isActive: true },
  { buildingId: '', roomNumber: 'M-Hall2', name: 'Music Hallway', nameEn: 'Music Hallway', nameFi: 'Musiikkikäytävä', floor: 2, type: 'hallway', mapPositionX: 80, mapPositionY: 160, width: 280, height: 30, isActive: true },
  
  // ==================== STAIRWAYS ====================
  { buildingId: '', roomNumber: 'K-Stairs', name: 'Main Stairway', nameEn: 'Main Stairway', nameFi: 'Pääportaikko', floor: 1, type: 'stairway', mapPositionX: 900, mapPositionY: 80, width: 40, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'M-Stairs', name: 'Music Stairway', nameEn: 'Music Stairway', nameFi: 'Musiikkiportaikko', floor: 1, type: 'stairway', mapPositionX: 380, mapPositionY: 80, width: 40, height: 50, isActive: true },
];

async function seedRooms() {
  console.log('🏫 Seeding Firebase with sample rooms...');
  
  try {
    // Get all buildings
    const buildings = await firebaseStorage.getBuildings();
    console.log(`📊 Found ${buildings.length} buildings`);
    
    if (buildings.length === 0) {
      console.error('❌ No buildings found! Please run seed:firebase first');
      return;
    }
    
    // Map building names to IDs
    const buildingMap = new Map(buildings.map(b => [b.name, b.id]));
    
    // Get existing rooms
    const existingRooms = await firebaseStorage.getRooms();
    const existingRoomNumbers = new Set(existingRooms.map(r => r.roomNumber));
    
    console.log(`📊 Found ${existingRooms.length} existing rooms`);
    
    // Add rooms
    let addedCount = 0;
    for (const room of sampleRooms) {
      // Skip if room already exists
      if (existingRoomNumbers.has(room.roomNumber)) {
        console.log(`⏭️  Skipping ${room.roomNumber} (already exists)`);
        continue;
      }
      
      // Get building ID from room number prefix
      const buildingPrefix = room.roomNumber.split(/[0-9-]/)[0];
      const buildingId = buildingMap.get(buildingPrefix);
      
      if (!buildingId) {
        console.warn(`⚠️  Building ${buildingPrefix} not found for room ${room.roomNumber}`);
        continue;
      }
      
      // Create room with building ID
      const roomData = {
        ...room,
        buildingId
      };
      
      const created = await firebaseStorage.createRoom(roomData as any);
      console.log(`✅ Created room: ${created.roomNumber} in building ${buildingPrefix}`);
      addedCount++;
    }
    
    console.log(`🎉 Room seeding complete! Added ${addedCount} new rooms`);
    console.log(`📊 Total rooms: ${existingRooms.length + addedCount}`);
  } catch (error) {
    console.error('❌ Error seeding rooms:', error);
    throw error;
  }
}

// Run seed function immediately
console.log('🚀 Starting room seed process...');
seedRooms()
  .then(() => {
    console.log('✅ Room seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Room seed failed:', error);
    process.exit(1);
  });

export { seedRooms };
