#!/usr/bin/env node

// Script to run the cleanup through the admin dashboard
// This will open the browser and show instructions

import { execSync } from 'child_process';

console.log('\n🗑️ ========== RUNNING CLEANUP ==========');
console.log('⚠️  This will DELETE ALL buildings, rooms, hallways, stairs!');
console.log('📍 Opening admin dashboard for manual cleanup...');
console.log('==========================================\n');

console.log('📋 INSTRUCTIONS:');
console.log('1. Browser will open to admin login page');
console.log('2. Login with admin credentials');
console.log('3. Go to "Settings" tab');
console.log('4. Click "DELETE ALL MAP DATA" button');
console.log('5. Confirm twice when prompted');
console.log('6. All data will be deleted');

console.log('\n🚀 Opening browser...');

try {
  // Open the admin login page
  if (process.platform === 'win32') {
    execSync('start http://localhost:3000/admin-login', { stdio: 'ignore' });
  } else if (process.platform === 'darwin') {
    execSync('open http://localhost:3000/admin-login', { stdio: 'ignore' });
  } else {
    execSync('xdg-open http://localhost:3000/admin-login', { stdio: 'ignore' });
  }
  
  console.log('✅ Browser opened successfully!');
  console.log('\n📝 Follow the instructions above to complete the cleanup.');
  
} catch (error) {
  console.error('❌ Failed to open browser:', error.message);
  console.log('\n📝 Please manually open: http://localhost:3000/admin-login');
}

console.log('\n==========================================');