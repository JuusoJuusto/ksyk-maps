import { firebaseStorage } from './firebaseStorage.js';

// Sample rooms for each building with hallways and stairways for navigation
// BIGGER ROOMS matching new building layout (buildings at 100,100 / 500,100 / 900,100 / 100,400 / 500,400 / 900,400)
const sampleRooms = [
  // M Building (Music) - Purple - Position: 100,100 - Size: 280x180
  { buildingId: '', roomNumber: 'M101', name: 'Music Room 1', nameEn: 'Music Room 1', nameFi: 'Musiikkihuone 1', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 120, mapPositionY: 120, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'M102', name: 'Practice Room', nameEn: 'Practice Room', nameFi: 'Harjoitushuone', floor: 1, type: 'classroom', capacity: 15, mapPositionX: 220, mapPositionY: 120, width: 60, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'M-Hall1', name: 'Main Hallway', nameEn: 'Main Hallway', nameFi: 'Pääkäytävä', floor: 1, type: 'hallway', mapPositionX: 120, mapPositionY: 190, width: 160, height: 20, isActive: true },
  { buildingId: '', roomNumber: 'M-Stairs', name: 'Stairway', nameEn: 'Stairway', nameFi: 'Portaikko', floor: 1, type: 'stairway', mapPositionX: 300, mapPositionY: 120, width: 30, height: 40, isActive: true },
  
  // K Building (Central Hall) - Red - Position: 500,100 - Size: 280x180
  { buildingId: '', roomNumber: 'K101', name: 'Main Hall', nameEn: 'Main Hall', nameFi: 'Pääsali', floor: 1, type: 'auditorium', capacity: 200, mapPositionX: 520, mapPositionY: 120, width: 120, height: 80, isActive: true },
  { buildingId: '', roomNumber: 'K102', name: 'Classroom A', nameEn: 'Classroom A', nameFi: 'Luokkahuone A', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 650, mapPositionY: 120, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K103', name: 'Classroom B', nameEn: 'Classroom B', nameFi: 'Luokkahuone B', floor: 1, type: 'classroom', capacity: 30, mapPositionX: 650, mapPositionY: 180, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'K-Hall1', name: 'Central Corridor', nameEn: 'Central Corridor', nameFi: 'Keskuskäytävä', floor: 1, type: 'hallway', mapPositionX: 520, mapPositionY: 210, width: 120, height: 20, isActive: true },
  { buildingId: '', roomNumber: 'K-Stairs', name: 'Main Stairway', nameEn: 'Main Stairway', nameFi: 'Pääportaikko', floor: 1, type: 'stairway', mapPositionX: 730, mapPositionY: 120, width: 30, height: 40, isActive: true },
  { buildingId: '', roomNumber: 'K-Elevator', name: 'Elevator', nameEn: 'Elevator', nameFi: 'Hissi', floor: 1, type: 'elevator', mapPositionX: 730, mapPositionY: 170, width: 20, height: 30, isActive: true },
  
  // L Building (Gymnasium) - Green - Position: 900,100 - Size: 280x180
  { buildingId: '', roomNumber: 'L101', name: 'Main Gym', nameEn: 'Main Gymnasium', nameFi: 'Pääliikuntasali', floor: 1, type: 'gym', capacity: 100, mapPositionX: 920, mapPositionY: 120, width: 140, height: 100, isActive: true },
  { buildingId: '', roomNumber: 'L102', name: 'Locker Room', nameEn: 'Locker Room', nameFi: 'Pukuhuone', floor: 1, type: 'other', capacity: 40, mapPositionX: 1070, mapPositionY: 120, width: 60, height: 40, isActive: true },
  { buildingId: '', roomNumber: 'L-Hall1', name: 'Sports Corridor', nameEn: 'Sports Corridor', nameFi: 'Urheilukäytävä', floor: 1, type: 'hallway', mapPositionX: 920, mapPositionY: 230, width: 210, height: 20, isActive: true },
  
  // R Building (Research) - Orange - Position: 100,400 - Size: 280x180
  { buildingId: '', roomNumber: 'R101', name: 'Lab 1', nameEn: 'Laboratory 1', nameFi: 'Laboratorio 1', floor: 1, type: 'lab', capacity: 20, mapPositionX: 120, mapPositionY: 420, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'R102', name: 'Lab 2', nameEn: 'Laboratory 2', nameFi: 'Laboratorio 2', floor: 1, type: 'lab', capacity: 20, mapPositionX: 220, mapPositionY: 420, width: 80, height: 60, isActive: true },
  { buildingId: '', roomNumber: 'R-Hall1', name: 'Research Hallway', nameEn: 'Research Hallway', nameFi: 'Tutkimuskäytävä', floor: 1, type: 'hallway', mapPositionX: 120, mapPositionY: 490, width: 180, height: 20, isActive: true },
  { buildingId: '', roomNumber: 'R-Stairs', name: 'Lab Stairway', nameEn: 'Lab Stairway', nameFi: 'Laboratorioport aikko', floor: 1, type: 'stairway', mapPositionX: 310, mapPositionY: 420, width: 30, height: 40, isActive: true },
  
  // A Building (Admin) - Purple - Position: 500,400 - Size: 280x180
  { buildingId: '', roomNumber: 'A101', name: 'Office 1', nameEn: 'Office 1', nameFi: 'Toimisto 1', floor: 1, type: 'office', capacity: 10, mapPositionX: 520, mapPositionY: 420, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'A102', name: 'Office 2', nameEn: 'Office 2', nameFi: 'Toimisto 2', floor: 1, type: 'office', capacity: 10, mapPositionX: 600, mapPositionY: 420, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'A-Hall1', name: 'Admin Hallway', nameEn: 'Admin Hallway', nameFi: 'Hallintokäytävä', floor: 1, type: 'hallway', mapPositionX: 520, mapPositionY: 480, width: 150, height: 20, isActive: true },
  
  // U Building (University) - Blue - Position: 900,400 - Size: 280x180
  { buildingId: '', roomNumber: 'U101', name: 'Lecture Hall', nameEn: 'Lecture Hall', nameFi: 'Luentosali', floor: 1, type: 'classroom', capacity: 50, mapPositionX: 920, mapPositionY: 420, width: 100, height: 70, isActive: true },
  { buildingId: '', roomNumber: 'U102', name: 'Study Room', nameEn: 'Study Room', nameFi: 'Opiskeluhuone', floor: 1, type: 'classroom', capacity: 20, mapPositionX: 1030, mapPositionY: 420, width: 70, height: 50, isActive: true },
  { buildingId: '', roomNumber: 'U-Hall1', name: 'University Hallway', nameEn: 'University Hallway', nameFi: 'Yliopistokäytävä', floor: 1, type: 'hallway', mapPositionX: 920, mapPositionY: 500, width: 180, height: 20, isActive: true },
  { buildingId: '', roomNumber: 'U-Stairs', name: 'University Stairway', nameEn: 'University Stairway', nameFi: 'Yliopistoport aikko', floor: 1, type: 'stairway', mapPositionX: 1110, mapPositionY: 420, width: 30, height: 40, isActive: true },
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
