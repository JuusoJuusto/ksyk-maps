import { firebaseStorage } from './firebaseStorage.js';

async function clearAllData() {
  console.log('🗑️  Starting to clear all buildings, rooms, and hallways...');
  
  try {
    // Get all data
    const buildings = await firebaseStorage.getBuildings();
    const rooms = await firebaseStorage.getRooms();
    
    console.log(`📊 Found ${buildings.length} buildings and ${rooms.length} rooms`);
    
    // Delete all rooms first
    for (const room of rooms) {
      await firebaseStorage.deleteRoom(room.id);
      console.log(`✅ Deleted room: ${room.roomNumber}`);
    }
    
    // Delete all buildings
    for (const building of buildings) {
      await firebaseStorage.deleteBuilding(building.id);
      console.log(`✅ Deleted building: ${building.name}`);
    }
    
    console.log('🎉 All data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

// Run clear function
console.log('🚀 Starting data clear process...');
clearAllData()
  .then(() => {
    console.log('✅ Data clear completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Data clear failed:', error);
    process.exit(1);
  });

export { clearAllData };
