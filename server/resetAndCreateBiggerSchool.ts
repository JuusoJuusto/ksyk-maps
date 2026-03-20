import { firebaseStorage } from './firebaseStorage';

/**
 * RESET AND CREATE GIGANTIC CENTERED SCHOOL
 * Deletes all existing buildings and creates GIGANTIC (10X larger) buildings moved RIGHT and DOWN for perfect centering
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
    
    console.log('🏫 ========== CREATING GIGANTIC CENTERED SCHOOL ==========\n');

    // GIGANTIC BUILDINGS - 10X LARGER, moved RIGHT and DOWN for perfect centering!
    // Shifted right by +1000 and down by +500 for better positioning
    
    // Building A - Main Building (GIGANTIC - 3000x2000)
    console.log('🏢 Creating GIGANTIC Building A - Main Building...');
    const buildingA = await firebaseStorage.createBuilding({
      name: 'A',
      nameEn: 'Main Building',
      nameFi: 'Päärakennus',
      code: 'A',
      floors: 4,
      capacity: 500,
      colorCode: '#3B82F6',
      mapPositionX: 1200,
      mapPositionY: 700,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 1200, y: 700 },
          { x: 4200, y: 700 },
          { x: 4200, y: 2700 },
          { x: 1200, y: 2700 }
        ]
      })
    });
    console.log('✅ Building A created:', buildingA.id);

    // Building M - Music Building (GIGANTIC - 2000x1500)
    console.log('🎵 Creating GIGANTIC Building M - Music Building...');
    const buildingM = await firebaseStorage.createBuilding({
      name: 'M',
      nameEn: 'Music Building',
      nameFi: 'Musiikkitalo',
      code: 'M',
      floors: 2,
      capacity: 150,
      colorCode: '#8B5CF6',
      mapPositionX: 4300,
      mapPositionY: 700,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 4300, y: 700 },
          { x: 6300, y: 700 },
          { x: 6300, y: 2200 },
          { x: 4300, y: 2200 }
        ]
      })
    });
    console.log('✅ Building M created:', buildingM.id);

    // Building K - Cafeteria (GIGANTIC - 2000x1500)
    console.log('🍽️ Creating GIGANTIC Building K - Cafeteria...');
    const buildingK = await firebaseStorage.createBuilding({
      name: 'K',
      nameEn: 'Cafeteria',
      nameFi: 'Ruokala',
      code: 'K',
      floors: 1,
      capacity: 200,
      colorCode: '#F59E0B',
      mapPositionX: 1200,
      mapPositionY: 2800,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 1200, y: 2800 },
          { x: 3200, y: 2800 },
          { x: 3200, y: 4300 },
          { x: 1200, y: 4300 }
        ]
      })
    });
    console.log('✅ Building K created:', buildingK.id);

    // Building L - Library (GIGANTIC - 2000x1500)
    console.log('📚 Creating GIGANTIC Building L - Library...');
    const buildingL = await firebaseStorage.createBuilding({
      name: 'L',
      nameEn: 'Library',
      nameFi: 'Kirjasto',
      code: 'L',
      floors: 3,
      capacity: 300,
      colorCode: '#10B981',
      mapPositionX: 3300,
      mapPositionY: 2800,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 3300, y: 2800 },
          { x: 5300, y: 2800 },
          { x: 5300, y: 4300 },
          { x: 3300, y: 4300 }
        ]
      })
    });
    console.log('✅ Building L created:', buildingL.id);

    // Building U - Sports Hall (GIGANTIC - 2500x2000)
    console.log('🏃 Creating GIGANTIC Building U - Sports Hall...');
    const buildingU = await firebaseStorage.createBuilding({
      name: 'U',
      nameEn: 'Sports Hall',
      nameFi: 'Urheiluhalli',
      code: 'U',
      floors: 2,
      capacity: 400,
      colorCode: '#EF4444',
      mapPositionX: 5400,
      mapPositionY: 2800,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 5400, y: 2800 },
          { x: 7900, y: 2800 },
          { x: 7900, y: 4800 },
          { x: 5400, y: 4800 }
        ]
      })
    });
    console.log('✅ Building U created:', buildingU.id);

    console.log('\n📍 Creating rooms with GIGANTIC spacing...');
    
    // Building A - Floor 1 Rooms (GIGANTIC spacing - 10X bigger)
    const roomsA1 = [
      { num: 'A11', name: 'Classroom 11', type: 'classroom', floor: 1, x: 1400, y: 900, w: 500, h: 360 },
      { num: 'A12', name: 'Classroom 12', type: 'classroom', floor: 1, x: 2000, y: 900, w: 500, h: 360 },
      { num: 'A13', name: 'Computer Lab', type: 'lab', floor: 1, x: 2600, y: 900, w: 700, h: 360 },
      { num: 'A14', name: 'Office', type: 'office', floor: 1, x: 3400, y: 900, w: 500, h: 360 },
      { num: 'A15', name: 'Toilet', type: 'toilet', floor: 1, x: 1400, y: 1400, w: 360, h: 300 },
      { num: 'A16', name: 'Classroom 16', type: 'classroom', floor: 1, x: 1900, y: 1400, w: 500, h: 360 },
      { num: 'A17', name: 'Classroom 17', type: 'classroom', floor: 1, x: 2500, y: 1400, w: 500, h: 360 },
      { num: 'A18', name: 'Science Lab', type: 'lab', floor: 1, x: 3100, y: 1400, w: 700, h: 360 },
    ];

    // Building A - Floor 2 Rooms
    const roomsA2 = [
      { num: 'A21', name: 'Classroom 21', type: 'classroom', floor: 2, x: 1400, y: 900, w: 500, h: 360 },
      { num: 'A22', name: 'Classroom 22', type: 'classroom', floor: 2, x: 2000, y: 900, w: 500, h: 360 },
      { num: 'A23', name: 'Science Lab', type: 'lab', floor: 2, x: 2600, y: 900, w: 700, h: 360 },
      { num: 'A24', name: 'Teachers Room', type: 'office', floor: 2, x: 3400, y: 900, w: 500, h: 360 },
      { num: 'A25', name: 'Classroom 25', type: 'classroom', floor: 2, x: 1400, y: 1400, w: 500, h: 360 },
      { num: 'A26', name: 'Classroom 26', type: 'classroom', floor: 2, x: 2000, y: 1400, w: 500, h: 360 },
    ];

    // Building A - Floor 3 Rooms
    const roomsA3 = [
      { num: 'A31', name: 'Classroom 31', type: 'classroom', floor: 3, x: 1400, y: 900, w: 500, h: 360 },
      { num: 'A32', name: 'Classroom 32', type: 'classroom', floor: 3, x: 2000, y: 900, w: 500, h: 360 },
      { num: 'A33', name: 'Art Room', type: 'classroom', floor: 3, x: 2600, y: 900, w: 700, h: 360 },
      { num: 'A34', name: 'Classroom 34', type: 'classroom', floor: 3, x: 3400, y: 900, w: 500, h: 360 },
    ];

    // Building A - Floor 4 Rooms
    const roomsA4 = [
      { num: 'A41', name: 'Classroom 41', type: 'classroom', floor: 4, x: 1400, y: 900, w: 500, h: 360 },
      { num: 'A42', name: 'Classroom 42', type: 'classroom', floor: 4, x: 2000, y: 900, w: 500, h: 360 },
      { num: 'A43', name: 'Study Hall', type: 'library', floor: 4, x: 2600, y: 900, w: 700, h: 360 },
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
      const roomData: any = {
        buildingId: buildingA.id,
        roomNumber: `A-STAIRS-${floor}`,
        name: `Main Stairway F${floor}`,
        nameEn: `Main Stairway Floor ${floor}`,
        nameFi: `Pääportaikko ${floor}`,
        floor: floor,
        type: 'stairway',
        capacity: 0,
        mapPositionX: 2500,
        mapPositionY: 2000,
        width: 240,
        height: 400,
        isActive: true
      };
      
      // Only add connectedRoomId if not the top floor
      if (floor < 4) {
        roomData.connectedRoomId = `A-STAIRS-${floor + 1}`;
      }
      
      await firebaseStorage.createRoom(roomData);
    }
    console.log('✅ Created 4 stairways for Building A (all floors)');

    console.log('\n🎵 Creating rooms for Building M...');
    
    // Building M - Music Rooms (GIGANTIC)
    const roomsM = [
      { num: 'M1', name: 'Music Room 1', type: 'classroom', floor: 1, x: 4500, y: 900, w: 700, h: 500 },
      { num: 'M2', name: 'Music Room 2', type: 'classroom', floor: 1, x: 5300, y: 900, w: 700, h: 500 },
      { num: 'M3', name: 'Practice Room', type: 'classroom', floor: 2, x: 4500, y: 900, w: 700, h: 500 },
      { num: 'M4', name: 'Recording Studio', type: 'lab', floor: 2, x: 5300, y: 900, w: 700, h: 500 },
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
      mapPositionX: 5000,
      mapPositionY: 1600,
      width: 240,
      height: 400,
      isActive: true
    });

    console.log('\n🍽️ Creating rooms for Building K...');
    
    // Building K - Cafeteria Rooms (GIGANTIC)
    await firebaseStorage.createRoom({
      buildingId: buildingK.id,
      roomNumber: 'K1',
      name: 'Main Dining Hall',
      nameEn: 'Main Dining Hall',
      nameFi: 'Pääruokasali',
      floor: 1,
      type: 'cafeteria',
      capacity: 200,
      mapPositionX: 1400,
      mapPositionY: 3000,
      width: 1600,
      height: 1100,
      isActive: true
    });
    console.log('✅ Created cafeteria room');

    console.log('\n📚 Creating rooms for Building L...');
    
    // Building L - Library Rooms (GIGANTIC)
    const roomsL = [
      { num: 'L1', name: 'Reading Room', type: 'library', floor: 1, x: 3500, y: 3000, w: 1600, h: 500 },
      { num: 'L2', name: 'Study Area', type: 'library', floor: 2, x: 3500, y: 3000, w: 1600, h: 500 },
      { num: 'L3', name: 'Computer Lab', type: 'lab', floor: 3, x: 3500, y: 3000, w: 1600, h: 500 },
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
    
    // Building U - Sports Rooms (GIGANTIC)
    const roomsU = [
      { num: 'U1', name: 'Main Gym', type: 'gymnasium', floor: 1, x: 5600, y: 3000, w: 2000, h: 1500 },
      { num: 'U2', name: 'Fitness Room', type: 'gymnasium', floor: 2, x: 5600, y: 3000, w: 1000, h: 800 },
      { num: 'U3', name: 'Locker Room', type: 'toilet', floor: 1, x: 6200, y: 3800, w: 800, h: 700 },
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
    
    // Building A - Hallways (one per floor) - GIGANTIC
    for (let floor = 1; floor <= 4; floor++) {
      await firebaseStorage.createHallway({
        buildingId: buildingA.id,
        name: `Main Corridor F${floor}`,
        nameEn: `Main Corridor Floor ${floor}`,
        nameFi: `Pääkäytävä ${floor}`,
        floor: floor,
        startX: 1400,
        startY: 1900,
        endX: 4000,
        endY: 1900,
        width: 15,
        isActive: true
      });
    }
    console.log('✅ Created 4 hallways for Building A');

    // Building M - Hallways - GIGANTIC
    await firebaseStorage.createHallway({
      buildingId: buildingM.id,
      name: 'Music Corridor F1',
      nameEn: 'Music Corridor Floor 1',
      nameFi: 'Musiikkikäytävä 1',
      floor: 1,
      startX: 4500,
      startY: 1600,
      endX: 6100,
      endY: 1600,
      width: 15,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingM.id,
      name: 'Music Corridor F2',
      nameEn: 'Music Corridor Floor 2',
      nameFi: 'Musiikkikäytävä 2',
      floor: 2,
      startX: 4500,
      startY: 1600,
      endX: 6100,
      endY: 1600,
      width: 15,
      isActive: true
    });
    console.log('✅ Created 2 hallways for Building M');

    // CRITICAL: Connector hallways between buildings for navigation - GIGANTIC
    await firebaseStorage.createHallway({
      buildingId: buildingA.id,
      name: 'Connector A to M',
      nameEn: 'Connector to Music Building',
      nameFi: 'Yhdyskäytävä musiikkitaloon',
      floor: 1,
      startX: 4200,
      startY: 1700,
      endX: 4300,
      endY: 1450,
      width: 15,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingA.id,
      name: 'Connector A to K',
      nameEn: 'Connector to Cafeteria',
      nameFi: 'Yhdyskäytävä ruokalaan',
      floor: 1,
      startX: 2700,
      startY: 2700,
      endX: 2200,
      endY: 2800,
      width: 15,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingK.id,
      name: 'Connector K to L',
      nameEn: 'Connector to Library',
      nameFi: 'Yhdyskäytävä kirjastoon',
      floor: 1,
      startX: 3200,
      startY: 3550,
      endX: 3300,
      endY: 3550,
      width: 15,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingL.id,
      name: 'Connector L to U',
      nameEn: 'Connector to Sports Hall',
      nameFi: 'Yhdyskäytävä urheiluhalliin',
      floor: 1,
      startX: 5300,
      startY: 3550,
      endX: 5400,
      endY: 3800,
      width: 15,
      isActive: true
    });

    await firebaseStorage.createHallway({
      buildingId: buildingM.id,
      name: 'Connector M to U',
      nameEn: 'Connector Music to Sports',
      nameFi: 'Yhdyskäytävä urheiluhalliin',
      floor: 1,
      startX: 5300,
      startY: 2200,
      endX: 6650,
      endY: 2800,
      width: 15,
      isActive: true
    });

    console.log('✅ Created 5 connector hallways between buildings');

    console.log('\n✅ ========== GIGANTIC CENTERED SCHOOL CREATION COMPLETE ==========');
    console.log('📊 Summary:');
    console.log('   - 5 Buildings (10X BIGGER, moved RIGHT and DOWN!)');
    console.log('   - 30+ Rooms with GIGANTIC spacing');
    console.log('   - 11+ Hallways including connectors');
    console.log('   - Stairways on all floors');
    console.log('   - Full navigation network');
    console.log('\n🎉 GIGANTIC centered school is ready! Buildings are now HUGE and perfectly positioned!');
    
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
