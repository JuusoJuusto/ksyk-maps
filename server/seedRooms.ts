import { firebaseStorage } from './firebaseStorage.js';

// COMPREHENSIVE ROOMS FROM FLOOR PLAN - All visible rooms from the 4 floor plans
// Based on user-provided floor plan images showing detailed room layouts
const sampleRooms = [
  // ==================== FLOOR 1 ====================
  // K Building rooms
  { buildingId: '', roomNumber: 'K11', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K12', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 660, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K13', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 740, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K14', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 820, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K15', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 140, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K16', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 660, mapPositionY: 140, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K17', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 740, mapPositionY: 140, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K18', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 820, mapPositionY: 140, width: 70, height: 50, isActive: true },
  
  // M Building rooms
  { buildingId: '', roomNumber: 'M11', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 1, type: 'classroom', capacity: 25, mapPositionX: 80, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'M12', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 1, type: 'classroom', capacity: 25, mapPositionX: 160, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'M13', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 1, type: 'classroom', capacity: 25, mapPositionX: 240, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'M14', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 1, type: 'classroom', capacity: 25, mapPositionX: 320, mapPositionY: 80, width: 70, height: 50, isActive: true },
  
  // U Building rooms
  { buildingId: '', roomNumber: 'U11', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 1080, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U12', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 1160, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U13', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 1240, mapPositionY: 80, width: 70, height: 50, isActive: true },
  
  // ==================== FLOOR 2 ====================
  // K Building Floor 2
  { buildingId: '', roomNumber: 'K21', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K22', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 660, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K23', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 740, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K24', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 820, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K25', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 140, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K26', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 660, mapPositionY: 140, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K27', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 740, mapPositionY: 140, width: 70, height: 50, isActive: true },
  
  // Special rooms visible in floor 2
  { buildingId: '', roomNumber: 'K2T', name: 'Toilet', nameEn: 'Toilet', nameFi: 'WC', floor: 2, type: 'toilet', mapPositionX: 820, mapPositionY: 140, width: 40, height: 40, isActive: true },
  { buildingId: '', roomNumber: 'K2-AULA', name: 'Aula', nameEn: 'Hall', nameFi: 'Aula', floor: 2, type: 'hallway', mapPositionX: 650, mapPositionY: 200, width: 150, height: 40, isActive: true },
  
  // M Building Floor 2
  { buildingId: '', roomNumber: 'M21', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 2, type: 'classroom', capacity: 25, mapPositionX: 80, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'M22', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 2, type: 'classroom', capacity: 25, mapPositionX: 160, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'M23', name: 'Music Room', nameEn: 'Music Room', nameFi: 'Musiikkihuone', floor: 2, type: 'classroom', capacity: 25, mapPositionX: 240, mapPositionY: 80, width: 70, height: 50, isActive: true },
  
  // U Building Floor 2
  { buildingId: '', roomNumber: 'U21', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 1080, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U22', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 1160, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U23', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 2, type: 'classroom', capacity: 30, mapPositionX: 1240, mapPositionY: 80, width: 70, height: 50, isActive: true },
  
  // ==================== FLOOR 3 ====================
  // K Building Floor 3
  { buildingId: '', roomNumber: 'K31', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K32', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 660, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K33', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 740, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K34', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 820, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K35', name: 'Art Studio', nameEn: 'Art Studio', nameFi: 'Taidestudio', floor: 3, type: 'classroom', capacity: 25, mapPositionX: 580, mapPositionY: 140, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K36', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 660, mapPositionY: 140, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K37', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 740, mapPositionY: 140, width: 70, height: 50, isActive: true },
  
  // U Building Floor 3
  { buildingId: '', roomNumber: 'U31', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 1080, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U32', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 1160, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U33', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 3, type: 'classroom', capacity: 30, mapPositionX: 1240, mapPositionY: 80, width: 70, height: 50, isActive: true },
  
  // ==================== FLOOR 4 ====================
  // K Building Floor 4
  { buildingId: '', roomNumber: 'K41', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 580, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K42', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 660, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K43', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 740, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K44', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 820, mapPositionY: 80, width: 70, height: 50, isActive: true },
  
  // U Building Floor 4
  { buildingId: '', roomNumber: 'U41', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 1080, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U42', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 1160, mapPositionY: 80, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U43', name: 'Classroom', nameEn: 'Classroom', nameFi: 'Luokkahuone', floor: 4, type: 'classroom', capacity: 30, mapPositionX: 1240, mapPositionY: 80, width: 70, height: 50, isActive: true },
  
  // A Building rooms (Admin/Office area)
  { buildingId: '', roomNumber: 'A31', name: 'Office', nameEn: 'Office', nameFi: 'Toimisto', floor: 3, type: 'office', capacity: 10, mapPositionX: 580, mapPositionY: 480, width: 60, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'A32', name: 'Office', nameEn: 'Office', nameFi: 'Toimisto', floor: 3, type: 'office', capacity: 10, mapPositionX: 650, mapPositionY: 480, width: 60, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'A33', name: 'Office', nameEn: 'Office', nameFi: 'Toimisto', floor: 3, type: 'office', capacity: 10, mapPositionX: 720, mapPositionY: 480, width: 60, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'A34', name: 'Office', nameEn: 'Office', nameFi: 'Toimisto', floor: 3, type: 'office', capacity: 10, mapPositionX: 790, mapPositionY: 480, width: 60, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'A35', name: 'Principal Office', nameEn: 'Principal Office', nameFi: 'Rehtorin toimisto', floor: 3, type: 'office', capacity: 5, mapPositionX: 860, mapPositionY: 480, width: 60, height: 50, isActive: true },
  
  // L Building (Gymnasium)
  { buildingId: '', roomNumber: 'L01', name: 'Main Gymnasium', nameEn: 'Main Gymnasium', nameFi: 'Pääliikuntasali', floor: 1, type: 'gym', capacity: 100, mapPositionX: 1080, mapPositionY: 480, width: 150, height: 100, isActive: true },
  { buildingId: '', roomNumber: 'L02', name: 'Small Gym', nameEn: 'Small Gymnasium', nameFi: 'Pieni liikuntasali', floor: 1, type: 'gym', capacity: 50, mapPositionX: 1250, mapPositionY: 480, width: 100, height: 80, isActive: true },
  
  // R Building (Labs)
  { buildingId: '', roomNumber: 'R10', name: 'Chemistry Lab', nameEn: 'Chemistry Lab', nameFi: 'Kemian laboratorio', floor: 1, type: 'lab', capacity: 20, mapPositionX: 80, mapPositionY: 480, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'R11', name: 'Physics Lab', nameEn: 'Physics Lab', nameFi: 'Fysiikan laboratorio', floor: 1, type: 'lab', capacity: 20, mapPositionX: 170, mapPositionY: 480, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'R12', name: 'Biology Lab', nameEn: 'Biology Lab', nameFi: 'Biologian laboratorio', floor: 1, type: 'lab', capacity: 20, mapPositionX: 260, mapPositionY: 480, width: 80, height: 60, isActive: true },
  
  // ==================== HALLWAYS AND CONNECTORS ====================
  { buildingId: '', roomNumber: 'K-Hall1', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 1, type: 'hallway', mapPositionX: 580, mapPositionY: 200, width: 320, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall2', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 2, type: 'hallway', mapPositionX: 580, mapPositionY: 200, width: 320, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall3', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 3, type: 'hallway', mapPositionX: 580, mapPositionY: 200, width: 320, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall4', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 4, type: 'hallway', mapPositionX: 580, mapPositionY: 200, width: 320, height: 25, isActive: true },
  
  { buildingId: '', roomNumber: 'M-Hall1', name: 'Music Hallway', nameEn: 'Music Hallway', nameFi: 'Musiikkikäytävä', floor: 1, type: 'hallway', mapPositionX: 80, mapPositionY: 140, width: 310, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'M-Hall2', name: 'Music Hallway', nameEn: 'Music Hallway', nameFi: 'Musiikkikäytävä', floor: 2, type: 'hallway', mapPositionX: 80, mapPositionY: 140, width: 310, height: 25, isActive: true },
  
  { buildingId: '', roomNumber: 'U-Hall1', name: 'U-Wing Hallway', nameEn: 'U-Wing Hallway', nameFi: 'U-siiven käytävä', floor: 1, type: 'hallway', mapPositionX: 1080, mapPositionY: 140, width: 230, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'U-Hall2', name: 'U-Wing Hallway', nameEn: 'U-Wing Hallway', nameFi: 'U-siiven käytävä', floor: 2, type: 'hallway', mapPositionX: 1080, mapPositionY: 140, width: 230, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'U-Hall3', name: 'U-Wing Hallway', nameEn: 'U-Wing Hallway', nameFi: 'U-siiven käytävä', floor: 3, type: 'hallway', mapPositionX: 1080, mapPositionY: 140, width: 230, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'U-Hall4', name: 'U-Wing Hallway', nameEn: 'U-Wing Hallway', nameFi: 'U-siiven käytävä', floor: 4, type: 'hallway', mapPositionX: 1080, mapPositionY: 140, width: 230, height: 25, isActive: true },
  
  // ==================== STAIRWAYS ====================
  { buildingId: '', roomNumber: 'K-Stairs1', name: 'Main Stairway', nameEn: 'Main Stairway', nameFi: 'Pääportaikko', floor: 1, type: 'stairway', mapPositionX: 910, mapPositionY: 80, width: 35, height: 45, isActive: true },
  { buildingId: '', roomNumber: 'K-Stairs2', name: 'Main Stairway', nameEn: 'Main Stairway', nameFi: 'Pääportaikko', floor: 2, type: 'stairway', mapPositionX: 910, mapPositionY: 80, width: 35, height: 45, isActive: true },
  { buildingId: '', roomNumber: 'K-Stairs3', name: 'Main Stairway', nameEn: 'Main Stairway', nameFi: 'Pääportaikko', floor: 3, type: 'stairway', mapPositionX: 910, mapPositionY: 80, width: 35, height: 45, isActive: true },
  { buildingId: '', roomNumber: 'K-Stairs4', name: 'Main Stairway', nameEn: 'Main Stairway', nameFi: 'Pääportaikko', floor: 4, type: 'stairway', mapPositionX: 910, mapPositionY: 80, width: 35, height: 45, isActive: true },
  
  { buildingId: '', roomNumber: 'M-Stairs1', name: 'Music Stairway', nameEn: 'Music Stairway', nameFi: 'Musiikkiportaikko', floor: 1, type: 'stairway', mapPositionX: 400, mapPositionY: 80, width: 35, height: 45, isActive: true },
  { buildingId: '', roomNumber: 'M-Stairs2', name: 'Music Stairway', nameEn: 'Music Stairway', nameFi: 'Musiikkiportaikko', floor: 2, type: 'stairway', mapPositionX: 400, mapPositionY: 80, width: 35, height: 45, isActive: true },
  
  { buildingId: '', roomNumber: 'U-Stairs1', name: 'U-Wing Stairway', nameEn: 'U-Wing Stairway', nameFi: 'U-siiven portaikko', floor: 1, type: 'stairway', mapPositionX: 1320, mapPositionY: 80, width: 35, height: 45, isActive: true },
  { buildingId: '', roomNumber: 'U-Stairs2', name: 'U-Wing Stairway', nameEn: 'U-Wing Stairway', nameFi: 'U-siiven portaikko', floor: 2, type: 'stairway', mapPositionX: 1320, mapPositionY: 80, width: 35, height: 45, isActive: true },
  { buildingId: '', roomNumber: 'U-Stairs3', name: 'U-Wing Stairway', nameEn: 'U-Wing Stairway', nameFi: 'U-siiven portaikko', floor: 3, type: 'stairway', mapPositionX: 1320, mapPositionY: 80, width: 35, height: 45, isActive: true },
  { buildingId: '', roomNumber: 'U-Stairs4', name: 'U-Wing Stairway', nameEn: 'U-Wing Stairway', nameFi: 'U-siiven portaikko', floor: 4, type: 'stairway', mapPositionX: 1320, mapPositionY: 80, width: 35, height: 45, isActive: true },
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
