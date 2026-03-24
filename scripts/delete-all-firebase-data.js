#!/usr/bin/env node

/**
 * Script to delete ALL buildings, rooms, hallways, and stairs from Firebase
 * This will completely clean the database
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('\n🗑️ ========== FIREBASE DATA CLEANUP ==========');
console.log('⚠️  WARNING: This will DELETE ALL data from Firebase!');
console.log('📍 Buildings, Rooms, Hallways, Stairs, Floors');
console.log('🔥 This action CANNOT be undone!');
console.log('==========================================\n');

async function deleteAllData() {
  try {
    // Initialize Firebase Admin
    console.log('🔧 Initializing Firebase Admin...');
    
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    
    if (!serviceAccount.project_id) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not found in environment variables');
    }
    
    initializeApp({
      credential: cert(serviceAccount)
    });
    
    const db = getFirestore();
    console.log('✅ Firebase initialized successfully\n');
    
    let totalDeleted = {
      buildings: 0,
      rooms: 0,
      hallways: 0,
      floors: 0,
      stairs: 0
    };
    
    // Delete all buildings
    console.log('🏢 Deleting buildings...');
    const buildingsSnapshot = await db.collection('buildings').get();
    console.log(`   Found ${buildingsSnapshot.size} buildings`);
    
    const buildingBatch = db.batch();
    buildingsSnapshot.docs.forEach(doc => {
      buildingBatch.delete(doc.ref);
      totalDeleted.buildings++;
    });
    await buildingBatch.commit();
    console.log(`   ✅ Deleted ${totalDeleted.buildings} buildings\n`);
    
    // Delete all rooms
    console.log('🚪 Deleting rooms...');
    const roomsSnapshot = await db.collection('rooms').get();
    console.log(`   Found ${roomsSnapshot.size} rooms`);
    
    // Delete in batches of 500 (Firestore limit)
    const roomBatches = [];
    let currentBatch = db.batch();
    let batchCount = 0;
    
    roomsSnapshot.docs.forEach((doc, index) => {
      currentBatch.delete(doc.ref);
      batchCount++;
      totalDeleted.rooms++;
      
      if (batchCount === 500 || index === roomsSnapshot.docs.length - 1) {
        roomBatches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    });
    
    for (const batch of roomBatches) {
      await batch.commit();
    }
    console.log(`   ✅ Deleted ${totalDeleted.rooms} rooms\n`);
    
    // Delete all hallways
    console.log('🛤️  Deleting hallways...');
    const hallwaysSnapshot = await db.collection('hallways').get();
    console.log(`   Found ${hallwaysSnapshot.size} hallways`);
    
    const hallwayBatch = db.batch();
    hallwaysSnapshot.docs.forEach(doc => {
      hallwayBatch.delete(doc.ref);
      totalDeleted.hallways++;
    });
    await hallwayBatch.commit();
    console.log(`   ✅ Deleted ${totalDeleted.hallways} hallways\n`);
    
    // Delete all floors
    console.log('🏗️  Deleting floors...');
    const floorsSnapshot = await db.collection('floors').get();
    console.log(`   Found ${floorsSnapshot.size} floors`);
    
    const floorBatch = db.batch();
    floorsSnapshot.docs.forEach(doc => {
      floorBatch.delete(doc.ref);
      totalDeleted.floors++;
    });
    await floorBatch.commit();
    console.log(`   ✅ Deleted ${totalDeleted.floors} floors\n`);
    
    // Delete all stairs (rooms with type 'stairway')
    console.log('🪜 Counting stairs (already deleted with rooms)...');
    const stairsCount = roomsSnapshot.docs.filter(doc => doc.data().type === 'stairway').length;
    totalDeleted.stairs = stairsCount;
    console.log(`   ℹ️  ${stairsCount} stairs were included in room deletion\n`);
    
    console.log('✅ ========== CLEANUP COMPLETE! ==========');
    console.log('📊 Deletion Summary:');
    console.log(`   🏢 Buildings: ${totalDeleted.buildings}`);
    console.log(`   🚪 Rooms: ${totalDeleted.rooms}`);
    console.log(`   🛤️  Hallways: ${totalDeleted.hallways}`);
    console.log(`   🏗️  Floors: ${totalDeleted.floors}`);
    console.log(`   🪜 Stairs: ${totalDeleted.stairs}`);
    console.log(`\n🎯 Total items deleted: ${totalDeleted.buildings + totalDeleted.rooms + totalDeleted.hallways + totalDeleted.floors}`);
    console.log('==========================================\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Confirm before running
console.log('⏳ Starting deletion in 3 seconds...');
console.log('   Press Ctrl+C to cancel\n');

setTimeout(() => {
  deleteAllData();
}, 3000);
