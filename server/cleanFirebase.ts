import { firebaseStorage } from './firebaseStorage.js';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "ksyk-maps",
  });
}

const db = getFirestore();

async function cleanFirebase() {
  console.log('🧹 Cleaning Firebase...');
  
  try {
    // Delete all announcements
    console.log('Deleting announcements...');
    const announcementsSnapshot = await db.collection('announcements').get();
    const announcementDeletes = announcementsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(announcementDeletes);
    console.log(`✅ Deleted ${announcementsSnapshot.size} announcements`);
    
    // Delete all buildings
    console.log('Deleting buildings...');
    const buildingsSnapshot = await db.collection('buildings').get();
    const buildingDeletes = buildingsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(buildingDeletes);
    console.log(`✅ Deleted ${buildingsSnapshot.size} buildings`);
    
    // Delete all rooms
    console.log('Deleting rooms...');
    const roomsSnapshot = await db.collection('rooms').get();
    const roomDeletes = roomsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(roomDeletes);
    console.log(`✅ Deleted ${roomsSnapshot.size} rooms`);
    
    // Delete all floors
    console.log('Deleting floors...');
    const floorsSnapshot = await db.collection('floors').get();
    const floorDeletes = floorsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(floorDeletes);
    console.log(`✅ Deleted ${floorsSnapshot.size} floors`);
    
    // Delete all users EXCEPT owner
    console.log('Deleting users (except owner)...');
    const usersSnapshot = await db.collection('users').get();
    const userDeletes = usersSnapshot.docs
      .filter(doc => doc.id !== 'owner-admin-user' && doc.data().email !== 'JuusoJuusto112@gmail.com')
      .map(doc => doc.ref.delete());
    await Promise.all(userDeletes);
    console.log(`✅ Deleted ${userDeletes.length} users (kept owner)`);
    
    // Add correct KSYK buildings with proper shapes
    console.log('\n📦 Adding KSYK campus buildings...');
    
    const buildings = [
      {
        name: "M",
        nameEn: "Music Building",
        nameFi: "Musiikkitalo",
        descriptionEn: "Music and arts education",
        descriptionFi: "Musiikin ja taiteen opetus",
        floors: 3,
        mapPositionX: -200,
        mapPositionY: 50,
        colorCode: "#9333EA",
        isActive: true,
        capacity: 300,
        facilities: ["music_rooms", "practice_rooms", "recording_studio"],
        accessInfo: "Main entrance on ground floor"
      },
      {
        name: "K",
        nameEn: "Central Hall",
        nameFi: "Keskushalli",
        descriptionEn: "Main building with classrooms and administration",
        descriptionFi: "Päärakennus luokkahuoneineen ja hallintoineen",
        floors: 3,
        mapPositionX: 100,
        mapPositionY: 0,
        colorCode: "#DC2626",
        isActive: true,
        capacity: 500,
        facilities: ["classrooms", "cafeteria", "library"],
        accessInfo: "Multiple entrances"
      },
      {
        name: "L",
        nameEn: "Gymnasium",
        nameFi: "Liikuntahalli",
        descriptionEn: "Sports and physical education facilities",
        descriptionFi: "Urheilu- ja liikuntatilat",
        floors: 2,
        mapPositionX: 350,
        mapPositionY: 80,
        colorCode: "#059669",
        isActive: true,
        capacity: 400,
        facilities: ["gymnasium", "fitness_room", "changing_rooms"],
        accessInfo: "Sports entrance on east side"
      },
      {
        name: "R",
        nameEn: "R Building",
        nameFi: "R-rakennus",
        descriptionEn: "Research and laboratory facilities",
        descriptionFi: "Tutkimus- ja laboratoriotilat",
        floors: 3,
        mapPositionX: -50,
        mapPositionY: 200,
        colorCode: "#F59E0B",
        isActive: true,
        capacity: 250,
        facilities: ["chemistry_lab", "physics_lab", "biology_lab"],
        accessInfo: "Lab entrance with security"
      },
      {
        name: "A",
        nameEn: "A Building",
        nameFi: "A-rakennus",
        descriptionEn: "Administration and office spaces",
        descriptionFi: "Hallinto- ja toimistotilat",
        floors: 3,
        mapPositionX: 250,
        mapPositionY: 180,
        colorCode: "#8B5CF6",
        isActive: true,
        capacity: 150,
        facilities: ["offices", "meeting_rooms", "reception"],
        accessInfo: "Main office entrance"
      },
      {
        name: "U",
        nameEn: "U Building",
        nameFi: "U-rakennus",
        descriptionEn: "University programs and advanced studies",
        descriptionFi: "Yliopisto-ohjelmat ja jatko-opinnot",
        floors: 3,
        mapPositionX: -100,
        mapPositionY: -120,
        colorCode: "#3B82F6",
        isActive: true,
        capacity: 200,
        facilities: ["computer_labs", "study_rooms", "lecture_halls"],
        accessInfo: "University entrance"
      },
      {
        name: "OG",
        nameEn: "Old Gymnasium",
        nameFi: "Vanha liikuntahalli",
        descriptionEn: "Historic sports facility",
        descriptionFi: "Historiallinen liikuntapaikka",
        floors: 2,
        mapPositionX: 200,
        mapPositionY: -80,
        colorCode: "#06B6D4",
        isActive: true,
        capacity: 150,
        facilities: ["small_gym", "storage"],
        accessInfo: "Historic building entrance"
      }
    ];
    
    for (const building of buildings) {
      const created = await firebaseStorage.createBuilding(building as any);
      console.log(`✅ Created building: ${created.name} (${created.nameEn})`);
    }
    
    console.log('\n🎉 Firebase cleaned and reseeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Buildings: ${buildings.length}`);
    console.log(`- Announcements: 0 (cleaned)`);
    console.log(`- Users: 1 (owner only)`);
    
  } catch (error) {
    console.error('❌ Error cleaning Firebase:', error);
    throw error;
  }
}

cleanFirebase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
