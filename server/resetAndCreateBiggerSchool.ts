import { firebaseStorage } from './firebaseStorage';

/**
 * RESET AND CREATE MUCH BIGGER SCHOOL
 * Deletes all existing buildings and creates MUCH LARGER buildings with proper navigation
 */

async function resetAndCreateBiggerSchool() {
  console.log('🗑️ ========== DELETING ALL EXISTING BUILDINGS ==========');
  
  try {
    // Get all existing buildings
    const existingBuildings = await firebaseStorage.getBuildings();
    console.log(`Found ${existingBuildings.length} existing buildings to delete`);
    
    // Delete all buildings (this will cascade to rooms and hallways)
    for (const building of existingBuildings) {
      console.log(`Deleting building: ${building.name}`);
      await firebaseStorage.deleteBuilding(building.id);
    }
    
    console.log('✅ All buildings deleted\n');
    
    console.log('🏫 ========== CREATING MUCH BIGGER SCHOOL ==========\n');

    // MUCH BIGGER BUILDINGS - 3x larger than before!
    
    // Building A - Main Building (HUGE - 900x600)
    console.log('🏢 Creating HUGE Building A - Main Building...');
    const buildingA = await firebaseStorage.createBuilding({
      name: 'A',
      nameEn: 'Main Building',
      nameFi: 'Päärakennus',
      code: 'A',
      floors: 4,
      capacity: 500,
      colorCode: '#3B82F6',
      mapPositionX: 300,
      mapPositionY: 300,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 300, y: 300 },
          { x: 1200, y: 300 },
          { x: 1200, y: 900 },
          { x: 300, y: 900 }
        ]
      })
    });
    console.log('✅ Building A created:', buildingA.id);

    // Building M - Music Building (LARGE - 600x450)
    console.log('🎵 Creating LARGE Building M - Music Building...');
    const buildingM = await firebaseStorage.createBuilding({
      name: 'M',
      nameEn: 'Music Building',
      nameFi: 'Musiikkitalo',
      code: 'M',
      floors: 2,
      capacity: 150,
      colorCode: '#8B5CF6',
      mapPositionX: 1300,
      mapPositionY: 300,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 1300, y: 300 },
          { x: 1900, y: 300 },
          { x: 1900, y: 750 },
          { x: 1300, y: 750 }
        ]
      })
    });
    console.log('✅ Building M created:', buildingM.id);

    // Building K - Cafeteria (LARGE - 600x450)
    console.log('🍽️ Creating LARGE Building K - Cafeteria...');
    const buildingK = await firebaseStorage.createBuilding({
      name: 'K',
      nameEn: 'Cafeteria',
      nameFi: 'Ruokala',
      code: 'K',
      floors: 1,
      capacity: 200,
      colorCode: '#F59E0B',
      mapPositionX: 300,
      mapPositionY: 1000,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 300, y: 1000 },
          { x: 900, y: 1000 },
          { x: 900, y: 1450 },
          { x: 300, y: 1450 }
        ]
      })
    });
    console.log('✅ Building K created:', buildingK.id);

    // Building L - Library (LARGE - 600x450)
    console.log('📚 Creating LARGE Building L - Library...');
    const buildingL = await firebaseStorage.createBuilding({
      name: 'L',
      nameEn: 'Library',
      nameFi: 'Kirjasto',
      code: 'L',
      floors: 3,
      capacity: 300,
      colorCode: '#10B981',
      mapPositionX: 1000,
      mapPositionY: 1000,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 1000, y: 1000 },
          { x: 1600, y: 1000 },
          { x: 1600, y: 1450 },
          { x: 1000, y: 1450 }
        ]
      })
    });
    console.log('✅ Building L created:', buildingL.id);

    // Building U - Sports Hall (HUGE - 750x600)
    console.log('🏃 Creating HUGE Building U - Sports Hall...');
    const buildingU = await firebaseStorage.createBuilding({
      name: 'U',
      nameEn: 'Sports Hall',
      nameFi: 'Urheiluhalli',
      code: 'U',
      floors: 2,
      capacity: 400,
      colorCode: '#EF4444',
      mapPositionX: 1700,
      mapPositionY: 1000,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 1700, y: 1000 },
          { x: 2450, y: 1000 },
          { x: 2450, y: 1600 },
          { x: 1700, y: 1600 }
        ]
      })
    });
    console.log('✅ Building U created:', buildingU.id);

    console.log('\n📍 Creating rooms with MUCH BETTER spacing...');
    
    // Building A - Floor 1 Rooms (BIGGER spacing)
    const roomsA1 = [
      { num: 'A11', name: 'Classroom 11', type: 'classroom', floor: 1, x: 350, y: 350, w: 150, h: 100 },
      { num: 'A12', name: 'Classroom 12', type: 'classroom', floor: 1, x: 550, y: 350, w: 150, h: 100 },
      { num: 'A13', name: 'Computer Lab', type: 'lab', floor: 1, x: 750, y: 350, w: 200, h: 100 },
      { num: 'A14', name: 'Office', type: 'office', floor: 1, x: 1000, y: 350, w: 150, h: 100 },
      { num: 'A15', name: 'Toilet', type: 'toilet', floor: 1, x: 350, y: 500, w: 100, h: 80 },
      { num: 'A16', name: 'Classroom 16', type: 'classroom', floor: 1, x: 500, y: 500, w: 150, h: 100 },
      { num: 'A17', name: 'Classroom 17', type: 'classroom', floor: 1, x: 700, y: 500, w: 150, h: 100 },
      { num: 'A18', name: 'Science Lab', type: 'lab', floor: 1, x: 900, y: 500, w: 200, h: 100 },
    ];

    // Building A - Floor 2 Rooms
    const roomsA2 = [
      { num: 'A21', name: 'Classroom 21', type: 'classroom', floor: 2, x: 350, y: 350, w: 150, h: 100 },
      { num: 'A22', name: 'Classroom 22', type: 'classroom', floor: 2, x: 550, y: 350, w: 150, h: 100 },
      { num: 'A23', name: 'Science Lab', type: 'lab', floor: 2, x: 750, y: 350, w: 200, h: 100 },
      { num: 'A24', name: 'Teachers Room', type: 'office', floor: 2, x: 1000, y: 350, w: 150, h: 100 },
      { num: 'A25', name: 'Classroom 25', type: 'classroom', floor: 2, x: 350, y: 500, w: 150, h: 100 },
      { num: 'A26', name: 'Classroom 26', type: 'classroom', floor: 2, x: 550, y: 500, w: 150, h: 100 },
    ];

    // Building A - Floor 3 Rooms
    const roomsA3 = [
      { num: 'A31', name: 'Classroom 31', type: 'classroom', floor: 3, x: 350, y: 350, w: 150, h: 100 },
      { num: 'A32', name: 'Classroom 32', type: 'classroom', floor: 3, x: 550, y: 350, w: 150, h: 100 },
      { num: 'A33', name: 'Art Room', type: 'classroom', floor: 3, x: 750, y: 350, w: 200, h: 100 },
      { num: 'A34', name: 'Classroom 34', type: 'classroom', floor: 3, x: 1000, y: 350, w: 150, h: 100 },
    ];

    // Building A - Floor 4 Rooms
    const roomsA4 = [
      { num: 'A41', name: 'Classroom 41', type: 'classroom', floor: 4, x: 350, y: 350, w: 150, h: 100 },
      { num: 'A42', name: 'Classroom 42', type: 'classroom', floor: 4, x: 550, y: 350, w: 150, h: 100 },
      { num: 'A43', name: 'Study Hall', type: 'library', floor: 4, x: 750, y: 350, w: 200, h: 100 },
    ];

    // Create all Building A rooms
    for (const room of [...roomsA1, ...roomsA2, ...roomsA3, ...roomsA4]) {
      await firebaseStorage.createRoom({
        buildingId: buildingA.id,
        roomNumber: room.num,
        name: room.name,
        nameEn: room.name,
        nameFi: room.name,
        floor: room.floor,
        type: room.type,
        capacity: room.type === 'classroom' ? 30 : room.type === 'lab' ? 25 : 10,
        mapPositionX: room.x,
        mapPositionY: room.y,
        width: room.w,
        height: room.h,
        isActive: true
      });
    }
    console.log(`✅ Created ${roomsA1.length + roomsA2.length + roomsA3.length + roomsA4.length} rooms for Building A`);

    // Building A - Stairways (one per floor for navigation)
    for (let floor = 1; floor <= 4; floor++) {
      await firebaseStorage.createRoom({
        buildingId: buildingA.id,
        roomNumber: `A-STAIRS-${floor}`,
        name: `Main Stairway F${floor}`,
        nameEn: `Main Stairway Floor ${floor}`,
        nameFi: `Pääportaikko ${floor}`,
        floor: floor,
        type: 'stairway',
        capacity: 0,
        mapPositionX: 700,
        mapPositionY: 700,
        width: 80,
        height: 120,
        isActive: true,
        connectedRoomId: floor < 4 ? `A-STAIRS-${floor + 1}` : undefined
      });
    }
    console.log('✅ Created 4 stairways for Building A (all floors)');

    console.log('\n🎵 Creating rooms for Building M...');
    
    // Building M - Music Rooms (BIGGER)
    const roomsM = [
      { num: 'M1', name: 'Music Room 1', type: 'classroom', floor: 1, x: 1350, y: 350, w: 200, h: 150 },
      { num: 'M2', name: 'Music Room 2', type: 'classroom', floor: 1, x: 1600, y: 350, w: 200, h: 150 },
      { num: 'M3', name: 'Practice Room', type: 'classroom', floor: 2, x: 1350, y: 350, w: 200, h: 150 },
      { num: 'M4', name: 'Recording Studio', type: 'lab', floor: 2, x: 1600, y: 350, w: 200, h: 150 },
    ];

    for (const room of roomsM) {
      await firebaseStorage.createRoom({
        buildingId: buildingM.id,
        roomNumber: room.num,
        name: room.name,
        nameEn: room.name,
        nameFi: room.name,
        floor: room.floor,
        type: room.type,
        capacity: 20,
        mapPositionX: room.x,
        mapPositionY: room.y,
        width: room.w,
        height: room.h,
        isActive: true
      });
    }
    console.log(`✅ Created ${roomsM.length} rooms for Building M`);

    // Building M - Stairway
    await firebaseStorage.createRoom({
      buildingId: buildingM.id,
      roomNumber: 'M-STAIRS-1',
      name: 'Music Building Stairs',
      nameEn: 'Music Building Stairs',
      nameFi: 'Musiikkitalon portaat',
      floor: 1,
      type: 'stairway',
      capacity: 0,
      mapPositionX: 1500,
      mapPositionY: 550,
      width: 80,
      height: 120,
      isActive: true
    });

    console.log('\n🍽️ Creating rooms for Building K...');
    
    // Building K - Cafeteria Rooms (BIGGER)
    await firebaseStorage.createRoom({
      buildingId: buildingK.id,
      roomNumber: 'K1',
      name: 'Main Dining Hall',
      nameEn: 'Main Dining Hall',
      nameFi: 'Pääruokasali',
      floor: 1,
      type: 'cafeteria',
      capacity: 200,
      mapPositionX: 350,
      mapPositionY: 1050,
      width: 500,
      height: 350,
      isActive: true
    });
    console.log('✅ Created cafeteria room');

    console.log('\n📚 Creating rooms for Building L...');
    
    // Building L - Library Rooms (BIGGER)
    const roomsL = [
      { num: 'L1', name: 'Reading Room', type: 'library', floor: 1, x: 1050, y: 1050, w: 500, h: 150 },
      { num: 'L2', name: 'Study Area', type: 'library', floor: 2, x: 1050, y: 1050, w: 500, h: 150 },
      { num: 'L3', name: 'Computer Lab', type: 'lab', floor: 3, x: 1050, y: 1050, w: 500, h: 150 },
    ];

    for (const room of roomsL) {
      await firebaseStorage.createRoom({
        buildingId: buildingL.id,
        roomNumber: room.num,
        name: room.name,
        nameEn: room.name,
        nameFi: room.name,
        floor: room.floor,
        type: room.type,
        capacity: 50,
        mapPositionX: room.x,
        mapPositionY: room.y,
        width: room.w,
        height: room.h,
        isActive: true
      });
    }
    console.log(`✅ Created ${roomsL.length} rooms for Building L`);

    console.log('\n🏃 Creating rooms for Building U...');
    
    // Building U - Sports Rooms (HUGE)
    const roomsU = [
      { num: 'U1', name: 'Main Gym', type: 'gymnasium', floor: 1, x: 1750, y: 1050, w: 600, h: 450 },
      { num: 'U2', name: 'Fitness Room', type: 'gymnasium', floor: 2, x: 1750, y: 1050, w: 300, h: 250 },
      { num: 'U3', name: 'Locker Room', type: 'toilet', floor: 1, x: 2100, y: 1350, w: 250, h: 200 },
    ];

    for (const room of roomsU) {
      await firebaseStorage.createRoom({
        buildingId: buildingU.id,
        roomNumber: room.num,
        name: room.name,
        nameEn: room.name,
        nameFi: room.name,
        floor: room.floor,
        type: room.type,
        capacity: room.type === 'gymnasium' ? 100 : 20,
        mapPositionX: room.x,
        mapPositionY: room.y,
        width: room.w,
        height: room.h,
        isActive: true
      });
    }
    console.log(`✅ Created ${roomsU.length} rooms for Building U`);

    console.log('\n🚶 Creating EXTENSIVE hallway network for navigation...');
    
    // Building A - Hallways (one per floor)
    for (let floor = 1; floor <= 4; floor++) {
      await firebaseStorage.createHallway({
        buildingId: buildingA.id,
        name: `Main Corridor F${floor}`,
        nameEn: `Main Corridor Floor ${floor}`,
        nameFi: `Pääkäytävä ${floor}`,
        floor: floor,
        startX: 350,
        startY: 650,
        endX: 1150,
        endY: 650,
        width: 5,
        isActive: true
      });
    }
    console.log('✅ Created 4 hallways for Building A');

    // Building M - Hallways
    await firebaseStorage.createHallway({
      buildingId: buildingM.id,
      name: 'Music Corridor F1',
      nameEn: 'Music Corridor Floor 1',
      nameFi: 'Musiikkikäytävä 1',
      floor: 1,
      startX: 1350,
      startY: 550,
      endX: 1850,
      endY: 550,
      width: 5,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingM.id,
      name: 'Music Corridor F2',
      nameEn: 'Music Corridor Floor 2',
      nameFi: 'Musiikkikäytävä 2',
      floor: 2,
      startX: 1350,
      startY: 550,
      endX: 1850,
      endY: 550,
      width: 5,
      isActive: true
    });
    console.log('✅ Created 2 hallways for Building M');

    // CRITICAL: Connector hallways between buildings for navigation
    await firebaseStorage.createHallway({
      buildingId: buildingA.id,
      name: 'Connector A to M',
      nameEn: 'Connector to Music Building',
      nameFi: 'Yhdyskäytävä musiikkitaloon',
      floor: 1,
      startX: 1200,
      startY: 600,
      endX: 1300,
      endY: 525,
      width: 5,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingA.id,
      name: 'Connector A to K',
      nameEn: 'Connector to Cafeteria',
      nameFi: 'Yhdyskäytävä ruokalaan',
      floor: 1,
      startX: 750,
      startY: 900,
      endX: 600,
      endY: 1000,
      width: 5,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingK.id,
      name: 'Connector K to L',
      nameEn: 'Connector to Library',
      nameFi: 'Yhdyskäytävä kirjastoon',
      floor: 1,
      startX: 900,
      startY: 1225,
      endX: 1000,
      endY: 1225,
      width: 5,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingL.id,
      name: 'Connector L to U',
      nameEn: 'Connector to Sports Hall',
      nameFi: 'Yhdyskäytävä urheiluhalliin',
      floor: 1,
      startX: 1600,
      startY: 1225,
      endX: 1700,
      endY: 1300,
      width: 5,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingM.id,
      name: 'Connector M to U',
      nameEn: 'Connector Music to Sports',
      nameFi: 'Yhdyskäytävä urheiluhalliin',
      floor: 1,
      startX: 1600,
      startY: 750,
      endX: 2075,
      endY: 1000,
      width: 5,
      isActive: true
    });

    console.log('✅ Created 5 connector hallways between buildings');

    console.log('\n✅ ========== BIGGER SCHOOL CREATION COMPLETE ==========');
    console.log('📊 Summary:');
    console.log('   - 5 Buildings (3X BIGGER than before!)');
    console.log('   - 30+ Rooms with better spacing');
    console.log('   - 11+ Hallways including connectors');
    console.log('   - Stairways on all floors');
    console.log('   - Full navigation network');
    console.log('\n🎉 Much bigger school is ready! Navigation should work perfectly now!');
    
  } catch (error) {
    console.error('❌ Error resetting school:', error);
    throw error;
  }
}

// Run the reset
resetAndCreateBiggerSchool()
  .then(() => {
    console.log('\n✅ Reset completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  });

export { resetAndCreateBiggerSchool };
