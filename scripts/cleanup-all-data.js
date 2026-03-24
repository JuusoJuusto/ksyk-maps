#!/usr/bin/env node

// Complete data cleanup script
// This will DELETE ALL buildings, rooms, hallways, stairs, announcements, and staff

import fetch from 'node-fetch';

async function cleanupAllData() {
  console.log('\n🗑️ ========== COMPLETE DATA CLEANUP ==========');
  console.log('⚠️  WARNING: This will DELETE ALL data from the map!');
  console.log('📍 Buildings, rooms, hallways, stairs, announcements, staff');
  console.log('🔥 This action CANNOT be undone!');
  console.log('==========================================\n');

  try {
    console.log('🚀 Sending cleanup request...');
    
    const response = await fetch('http://localhost:3000/api/admin/cleanup-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        confirmDelete: 'DELETE_EVERYTHING'
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! All data has been deleted.');
      console.log('\n📊 Deletion Summary:');
      console.log(`   🏢 Buildings: ${result.deleted.buildings}`);
      console.log(`   🚪 Rooms: ${result.deleted.rooms}`);
      console.log(`   🛤️  Hallways: ${result.deleted.hallways}`);
      console.log(`   🏗️  Floors: ${result.deleted.floors}`);
      console.log(`   📢 Announcements: ${result.deleted.announcements}`);
      console.log(`   👥 Staff: ${result.deleted.staff}`);
      console.log(`\n🕐 Completed at: ${result.timestamp}`);
      console.log('\n🎯 The map is now completely empty and ready for new data!');
    } else {
      console.error('❌ FAILED to delete data:', result.message);
      console.error('Error details:', result.error);
    }

  } catch (error) {
    console.error('❌ NETWORK ERROR:', error.message);
    console.error('\n💡 Make sure the server is running on http://localhost:3000');
    console.error('   Try: npm run dev (in the project directory)');
  }

  console.log('\n==========================================');
}

// Run the cleanup
cleanupAllData();