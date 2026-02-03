import { firebaseStorage } from './firebaseStorage.js';

// Connector hallways between buildings - these connect the campus for navigation
const connectorRooms = [
  // Horizontal connectors (top row)
  { buildingName: 'M', roomNumber: 'MK-Connector', name: 'M-K Connector', nameEn: 'M-K Connector', nameFi: 'M-K Yhdyskäytävä', floor: 1, type: 'hallway', mapPositionX: 450, mapPositionY: 150, width: 100, height: 30, isActive: true },
  { buildingName: 'K', roomNumber: 'KL-Connector', name: 'K-L Connector', nameEn: 'K-L Connector', nameFi: 'K-L Yhdyskäytävä', floor: 1, type: 'hallway', mapPositionX: 950, mapPositionY: 150, width: 100, height: 30, isActive: true },
  
  // Horizontal connectors (bottom row)
  { buildingName: 'R', roomNumber: 'RA-Connector', name: 'R-A Connector', nameEn: 'R-A Connector', nameFi: 'R-A Yhdyskäytävä', floor: 1, type: 'hallway', mapPositionX: 450, mapPositionY: 550, width: 100, height: 30, isActive: true },
  { buildingName: 'A', roomNumber: 'AU-Connector', name: 'A-U Connector', nameEn: 'A-U Connector', nameFi: 'A-U Yhdyskäytävä', floor: 1, type: 'hallway', mapPositionX: 950, mapPositionY: 550, width: 100, height: 30, isActive: true },
  
  // Vertical connectors
  { buildingName: 'M', roomNumber: 'MR-Connector', name: 'M-R Connector', nameEn: 'M-R Connector', nameFi: 'M-R Yhdyskäytävä', floor: 1, type: 'hallway', mapPositionX: 200, mapPositionY: 310, width: 30, height: 140, isActive: true },
  { buildingName: 'K', roomNumber: 'KA-Connector', name: 'K-A Connector', nameEn: 'K-A Connector', nameFi: 'K-A Yhdyskäytävä', floor: 1, type: 'hallway', mapPositionX: 700, mapPositionY: 310, width: 30, height: 140, isActive: true },
  { buildingName: 'L', roomNumber: 'LU-Connector', name: 'L-U Connector', nameEn: 'L-U Connector', nameFi: 'L-U Yhdyskäytävä', floor: 1, type: 'hallway', mapPositionX: 1200, mapPositionY: 310, width: 30, height: 140, isActive: true },
];

async function seedConnectors() {
  console.log('🔗 Seeding connector hallways between buildings...');
  
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
    
    // Add connector rooms
    let addedCount = 0;
    for (const room of connectorRooms) {
      // Skip if room already exists
      if (existingRoomNumbers.has(room.roomNumber)) {
        console.log(`⏭️  Skipping ${room.roomNumber} (already exists)`);
        continue;
      }
      
      // Get building ID from buildingName
      const buildingId = buildingMap.get(room.buildingName);
      
      if (!buildingId) {
        console.warn(`⚠️  Building ${room.buildingName} not found for connector ${room.roomNumber}`);
        continue;
      }
      
      // Create room with building ID
      const { buildingName, ...roomData } = room; // Remove buildingName, keep rest
      const roomWithBuildingId = {
        ...roomData,
        buildingId
      };
      
      const created = await firebaseStorage.createRoom(roomWithBuildingId as any);
      console.log(`✅ Created connector: ${created.roomNumber} (connects buildings)`);
      addedCount++;
    }
    
    console.log(`🎉 Connector seeding complete! Added ${addedCount} new connectors`);
    console.log(`📊 Total rooms: ${existingRooms.length + addedCount}`);
  } catch (error) {
    console.error('❌ Error seeding connectors:', error);
    throw error;
  }
}

// Run seed function immediately
console.log('🚀 Starting connector seed process...');
seedConnectors()
  .then(() => {
    console.log('✅ Connector seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connector seed failed:', error);
    process.exit(1);
  });

export { seedConnectors };
