import { firebaseStorage } from './firebaseStorage.js';

// Sample rooms for each building with hallways and stairways for navigation
const sampleRooms = [
  // M Building (Music) - Purple
  { buildingId: '', roomNumber: 'M101', name: 'Music Room 1', nameEn: 'Music Room 1', nameFi: 'Musiikkihuone 1', floor: 1, type: 'classroom', capacity: 30, mapPositionX: -180, mapPositionY: 70, width: 40, height: 30, isActive: true },
  { buildingId: '', roomNumber: 'M102', name: 'Practice Room', nameEn: 'Practice Room', nameFi: 'Harjoitushuone', floor: 1, type: 'classroom', capacity: 15, mapPositionX: -180, mapPositionY: 110, width: 30, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'M-Hall1', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 1, type: 'hallway', mapPositionX: -150, mapPositionY: 85, width: 60, height: 10, isActive: true },
  { buildingId: '', roomNumber: 'M-Stairs', name: 'Stairway', nameEn: 'Stairway', nameFi: 'Portaikko', floor: 1, type: 'stairway', mapPositionX: -120, mapPositionY: 80, width: 15, height: 20, isActive: true },
  
  // K Building (Central Hall) - Red
  { buildingId: '', roomNumber: 'K101', name: 'Main Hall', nameEn: 'Main Hall', nameFi: 'Pääsali', floor: 1, type: 'auditorium', capacity: 200, mapPositionX: 120, mapPositionY: 20, width: 60, height: 40, isActive: true },
  { buildingId: '', roomNumber: 'K102', name: 'Classroom A', nameEn: 'Classroom A', nameFi: 'Luokkahuone A', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 120, mapPositionY: 70, width: 35, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'K103', name: 'Classroom B', nameEn: 'Classroom B', nameFi: 'Luokkahuone B', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 165, mapPositionY: 70, width: 35, height: 25, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall1', name: 'Central Corridor', nameEn: 'Central Corridor', nameFi: 'Keskuskäytävä', floor: 1, type: 'hallway', mapPositionX: 140, mapPositionY: 50, width: 50, height: 10, isActive: true },
  { buildingId: '', roomNumber: 'K-Stairs', name: 'Main Stairway', nameEn: 'Main Stairway', nameFi: 'Pääportaikko', floor: 1, type: 'stairway', mapPositionX: 200, mapPositionY: 45, width: 15, height: 20, isActive: true },
  { buildingId: '', roomNumber: 'K-Elevator', name: 'Elevator', nameEn: 'Elevator', nameFi: 'Hissi', floor: 1, type: 'elevator', mapPositionX: 220, mapPositionY: 45, width: 10, height: 15, isActive: true },
  
  // L Building (Gymnasium) - Green
  { buildingId: '', roomNumber: 'L101', name: 'Main Gym', nameEn: 'Main Gymnasium', nameFi: 'Pääliikuntasali', floor: 1, type: 'gym', capacity: 100, mapPositionX: 370, mapPositionY: 100, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'L102', name: 'Locker Room', nameEn: 'Locker Room', nameFi: 'Pukuhuone', floor: 1, type: 'other', capacity: 40, mapPositionX: 370, mapPositionY: 160, width: 30, height: 20, isActive: true },
  { buildingId: '', roomNumber: 'L-Hall1', name: 'Sports Corridor', nameEn: 'Sports Corridor', nameFi: 'Urheilukäytävä', floor: 1, type: 'hallway', mapPositionX: 390, mapPositionY: 90, width: 40, height: 10, isActive: true },
  
  // R Building (Research) - Orange
  { buildingId: '', roomNumber: 'R101', name: 'Lab 1', nameEn: 'Laboratory 1', nameFi: 'Laboratorio 1', floor: 1, type: 'lab', capacity: 20, mapPositionX: -30, mapPositionY: 220, width: 40, height: 30, isActive: true },
  { buildingId: '', roomNumber: 'R102', name: 'Lab 2', nameEn: 'Laboratory 2', nameFi: 'Laboratorio 2', floor: 1, type: 'lab', capacity: 20, mapPositionX: 20, mapPositionY: 220, width: 40, height: 30, isActive: true },
  { buildingId: '', roomNumber: 'R-Hall1', name: 'Research Hallway', nameEn: 'Research Hallway', nameFi: 'Tutkimuskäytävä', floor: 1, type: 'hallway', mapPositionX: -10, mapPositionY: 210, width: 50, height: 10, isActive: true },
  { buildingId: '', roomNumber: 'R-Stairs', name: 'Lab Stairway', nameEn: 'Lab Stairway', nameFi: 'Laboratorioport aikko', floor: 1, type: 'stairway', mapPositionX: 50, mapPositionY: 215, width: 15, height: 20, isActive: true },
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
