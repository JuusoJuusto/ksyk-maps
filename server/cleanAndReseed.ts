import { firebaseStorage } from './firebaseStorage.js';

async function cleanAndReseed() {
  console.log('🧹 Cleaning Firebase database...');
  
  try {
    // Delete all rooms
    console.log('🗑️  Deleting all rooms...');
    const rooms = await firebaseStorage.getRooms();
    for (const room of rooms) {
      await firebaseStorage.deleteRoom(room.id);
      console.log(`  ✅ Deleted room: ${room.roomNumber}`);
    }
    
    // Delete all buildings
    console.log('🗑️  Deleting all buildings...');
    const buildings = await firebaseStorage.getBuildings();
    for (const building of buildings) {
      await firebaseStorage.deleteBuilding(building.id);
      console.log(`  ✅ Deleted building: ${building.name}`);
    }
    
    console.log('✅ Firebase cleaned successfully!');
    console.log('');
    console.log('🌱 Now run: npm run seed:firebase && npm run seed:rooms');
    
  } catch (error) {
    console.error('❌ Error cleaning Firebase:', error);
    throw error;
  }
}

// Run immediately
console.log('🚀 Starting clean process...');
cleanAndReseed()
  .then(() => {
    console.log('✅ Clean completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Clean failed:', error);
    process.exit(1);
  });

export { cleanAndReseed };
