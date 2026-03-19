import { firebaseStorage } from './firebaseStorage';

/**
 * KSYK Demo School Seeder
 * Creates a complete demo school with buildings, rooms, hallways, and navigation
 */

async function seedDemoSchool() {
  console.log('🏫 ========== SEEDING DEMO SCHOOL ==========');
  console.log('Creating KSYK Demo School with buildings, rooms, and hallways...\n');

  try {
    // Building A - Main Building (4 floors)
    console.log('🏢 Creating Building A - Main Building...');
    const buildingA = await firebaseStorage.createBuilding({
      name: 'A',
      nameEn: 'Main Building',
      nameFi: 'Päärakennus',
      code: 'A',
      floors: 4,
      capacity: 500,
      colorCode: '#3B82F6',
      mapPositionX: 500,
      mapPositionY: 500,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 500, y: 500 },
          { x: 800, y: 500 },
          { x: 800, y: 700 },
          { x: 500, y: 700 }
        ]
      })
    });
    console.log('✅ Building A created:', buildingA.id);

    // Building M - Music Building (2 floors)
    console.log('🎵 Creating Building M - Music Building...');
    const buildingM = await firebaseStorage.createBuilding({
      name: 'M',
      nameEn: 'Music Building',
      nameFi: 'Musiikkitalo',
      code: 'M',
      floors: 2,
      capacity: 150,
      colorCode: '#8B5CF6',
      mapPositionX: 900,
      mapPositionY: 500,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 900, y: 500 },
          { x: 1100, y: 500 },
          { x: 1100, y: 650 },
          { x: 900, y: 650 }
        ]
      })
    });
    console.log('✅ Building M created:', buildingM.id);

    // Building K - Cafeteria (1 floor)
    console.log('🍽️ Creating Building K - Cafeteria...');
    const buildingK = await firebaseStorage.createBuilding({
      name: 'K',
      nameEn: 'Cafeteria',
      nameFi: 'Ruokala',
      code: 'K',
      floors: 1,
      capacity: 200,
      colorCode: '#F59E0B',
      mapPositionX: 500,
      mapPositionY: 750,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 500, y: 750 },
          { x: 700, y: 750 },
          { x: 700, y: 900 },
          { x: 500, y: 900 }
        ]
      })
    });
    console.log('✅ Building K created:', buildingK.id);

    // Building L - Library (3 floors)
    console.log('📚 Creating Building L - Library...');
    const buildingL = await firebaseStorage.createBuilding({
      name: 'L',
      nameEn: 'Library',
      nameFi: 'Kirjasto',
      code: 'L',
      floors: 3,
      capacity: 300,
      colorCode: '#10B981',
      mapPositionX: 750,
      mapPositionY: 750,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 750, y: 750 },
          { x: 950, y: 750 },
          { x: 950, y: 900 },
          { x: 750, y: 900 }
        ]
      })
    });
    console.log('✅ Building L created:', buildingL.id);

    // Building U - Sports Hall (2 floors)
    console.log('🏃 Creating Building U - Sports Hall...');
    const buildingU = await firebaseStorage.createBuilding({
      name: 'U',
      nameEn: 'Sports Hall',
      nameFi: 'Urheiluhalli',
      code: 'U',
      floors: 2,
      capacity: 400,
      colorCode: '#EF4444',
      mapPositionX: 1000,
      mapPositionY: 750,
      isActive: true,
      description: JSON.stringify({
        customShape: [
          { x: 1000, y: 750 },
          { x: 1250, y: 750 },
          { x: 1250, y: 950 },
          { x: 1000, y: 950 }
        ]
      })
    });
    console.log('✅ Building U created:', buildingU.id);

    console.log('\n📍 Creating rooms for Building A...');
    
    // Building A - Floor 1 Rooms
    const roomsA1 = [
      { num: 'A11', name: 'Classroom 11', type: 'classroom', floor: 1, x: 520, y: 520, w: 70, h: 50 },
      { num: 'A12', name: 'Classroom 12', type: 'classroom', floor: 1, x: 600, y: 520, w: 70, h: 50 },
      { num: 'A13', name: 'Computer Lab', type: 'lab', floor: 1, x: 680, y: 520, w: 100, h: 50 },
      { num: 'A14', name: 'Office', type: 'office', floor: 1, x: 520, y: 580, w: 60, h: 40 },
      { num: 'A15', name: 'Toilet', type: 'toilet', floor: 1, x: 590, y: 580, w: 40, h: 40 },
    ];

    // Building A - Floor 2 Rooms
    const roomsA2 = [
      { num: 'A21', name: 'Classroom 21', type: 'classroom', floor: 2, x: 520, y: 520, w: 70, h: 50 },
      { num: 'A22', name: 'Classroom 22', type: 'classroom', floor: 2, x: 600, y: 520, w: 70, h: 50 },
      { num: 'A23', name: 'Science Lab', type: 'lab', floor: 2, x: 680, y: 520, w: 100, h: 50 },
      { num: 'A24', name: 'Teachers Room', type: 'office', floor: 2, x: 520, y: 580, w: 80, h: 40 },
    ];

    // Building A - Floor 3 Rooms
    const roomsA3 = [
      { num: 'A31', name: 'Classroom 31', type: 'classroom', floor: 3, x: 520, y: 520, w: 70, h: 50 },
      { num: 'A32', name: 'Classroom 32', type: 'classroom', floor: 3, x: 600, y: 520, w: 70, h: 50 },
      { num: 'A33', name: 'Art Room', type: 'classroom', floor: 3, x: 680, y: 520, w: 100, h: 50 },
    ];

    // Building A - Floor 4 Rooms
    const roomsA4 = [
      { num: 'A41', name: 'Classroom 41', type: 'classroom', floor: 4, x: 520, y: 520, w: 70, h: 50 },
      { num: 'A42', name: 'Classroom 42', type: 'classroom', floor: 4, x: 600, y: 520, w: 70, h: 50 },
      { num: 'A43', name: 'Study Hall', type: 'library', floor: 4, x: 680, y: 520, w: 100, h: 50 },
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

    // Building A - Stairways
    await firebaseStorage.createRoom({
      buildingId: buildingA.id,
      roomNumber: 'A-STAIRS-1',
      name: 'Main Stairway',
      nameEn: 'Main Stairway',
      nameFi: 'Pääportaikko',
      floor: 1,
      type: 'stairway',
      capacity: 0,
      mapPositionX: 640,
      mapPositionY: 630,
      width: 40,
      height: 60,
      isActive: true
    });
    console.log('✅ Created stairway for Building A');

    console.log('\n🎵 Creating rooms for Building M...');
    
    // Building M - Music Rooms
    const roomsM = [
      { num: 'M1', name: 'Music Room 1', type: 'classroom', floor: 1, x: 920, y: 520, w: 80, h: 50 },
      { num: 'M2', name: 'Music Room 2', type: 'classroom', floor: 1, x: 1010, y: 520, w: 80, h: 50 },
      { num: 'M3', name: 'Practice Room', type: 'classroom', floor: 2, x: 920, y: 520, w: 80, h: 50 },
      { num: 'M4', name: 'Recording Studio', type: 'lab', floor: 2, x: 1010, y: 520, w: 80, h: 50 },
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

    console.log('\n🍽️ Creating rooms for Building K...');
    
    // Building K - Cafeteria Rooms
    await firebaseStorage.createRoom({
      buildingId: buildingK.id,
      roomNumber: 'K1',
      name: 'Main Dining Hall',
      nameEn: 'Main Dining Hall',
      nameFi: 'Pääruokasali',
      floor: 1,
      type: 'cafeteria',
      capacity: 200,
      mapPositionX: 520,
      mapPositionY: 770,
      width: 160,
      height: 110,
      isActive: true
    });
    console.log('✅ Created cafeteria room');

    console.log('\n📚 Creating rooms for Building L...');
    
    // Building L - Library Rooms
    const roomsL = [
      { num: 'L1', name: 'Reading Room', type: 'library', floor: 1, x: 770, y: 770, w: 170, h: 50 },
      { num: 'L2', name: 'Study Area', type: 'library', floor: 2, x: 770, y: 770, w: 170, h: 50 },
      { num: 'L3', name: 'Computer Lab', type: 'lab', floor: 3, x: 770, y: 770, w: 170, h: 50 },
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
    
    // Building U - Sports Rooms
    const roomsU = [
      { num: 'U1', name: 'Main Gym', type: 'gymnasium', floor: 1, x: 1020, y: 770, w: 210, h: 160 },
      { num: 'U2', name: 'Fitness Room', type: 'gymnasium', floor: 2, x: 1020, y: 770, w: 100, h: 80 },
      { num: 'U3', name: 'Locker Room', type: 'toilet', floor: 1, x: 1140, y: 860, w: 80, h: 70 },
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

    console.log('\n🚶 Creating hallways...');
    
    // Hallways for Building A
    const hallwaysA = [
      { name: 'Main Corridor F1', floor: 1, startX: 520, startY: 650, endX: 780, endY: 650 },
      { name: 'Main Corridor F2', floor: 2, startX: 520, startY: 650, endX: 780, endY: 650 },
      { name: 'Main Corridor F3', floor: 3, startX: 520, startY: 650, endX: 780, endY: 650 },
      { name: 'Main Corridor F4', floor: 4, startX: 520, startY: 650, endX: 780, endY: 650 },
    ];

    for (const hallway of hallwaysA) {
      await firebaseStorage.createHallway({
        buildingId: buildingA.id,
        name: hallway.name,
        nameEn: hallway.name,
        nameFi: hallway.name,
        floor: hallway.floor,
        startX: hallway.startX,
        startY: hallway.startY,
        endX: hallway.endX,
        endY: hallway.endY,
        width: 3,
        isActive: true
      });
    }
    console.log(`✅ Created ${hallwaysA.length} hallways for Building A`);

    // Connecting hallway between buildings
    await firebaseStorage.createHallway({
      buildingId: buildingA.id,
      name: 'Connector to M',
      nameEn: 'Connector to Music Building',
      nameFi: 'Yhdyskäytävä musiikkitaloon',
      floor: 1,
      startX: 800,
      startY: 600,
      endX: 900,
      endY: 575,
      width: 3,
      isActive: true
    });
    console.log('✅ Created connector hallway');

    console.log('\n✅ ========== DEMO SCHOOL SEEDING COMPLETE ==========');
    console.log('📊 Summary:');
    console.log('   - 5 Buildings created (A, M, K, L, U)');
    console.log('   - 30+ Rooms created across all buildings');
    console.log('   - Multiple hallways and connectors');
    console.log('   - Stairways and elevators');
    console.log('\n🎉 Demo school is ready! Visit the map to see it in action!');
    
  } catch (error) {
    console.error('❌ Error seeding demo school:', error);
    throw error;
  }
}

// Run if called directly
seedDemoSchool()
  .then(() => {
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });

export { seedDemoSchool };
