// Check user in Firebase
// Run with: node check-user.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkUser() {
  try {
    console.log('🔍 Checking for omelimeilit user...\n');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`Found ${usersSnapshot.size} total users:\n`);
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ID: ${doc.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Role: ${user.role}`);
      console.log(`Password: ${user.password || 'NOT SET'}`);
      console.log(`Is Temporary: ${user.isTemporaryPassword || false}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
    
    // Find omelimeilit specifically
    const omelimeilitQuery = await db.collection('users')
      .where('email', '==', 'omelimeilit@gmail.com')
      .get();
    
    if (omelimeilitQuery.empty) {
      console.log('❌ omelimeilit user NOT FOUND in database!');
      console.log('\nTry these emails:');
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.email && user.email.includes('omel')) {
          console.log(`  - ${user.email}`);
        }
      });
    } else {
      console.log('✅ Found omelimeilit user:');
      omelimeilitQuery.forEach(doc => {
        const user = doc.data();
        console.log('\n📧 Email:', user.email);
        console.log('🔑 Password:', user.password || 'NOT SET');
        console.log('👤 Name:', user.firstName, user.lastName);
        console.log('🎭 Role:', user.role);
        console.log('⏰ Temporary:', user.isTemporaryPassword || false);
        
        if (!user.password) {
          console.log('\n⚠️  PASSWORD IS NOT SET!');
          console.log('This is why login fails.');
          console.log('\nTo fix:');
          console.log('1. Go to Admin Panel → Users');
          console.log('2. Find omelimeilit user');
          console.log('3. Click Edit');
          console.log('4. Set a new password');
          console.log('5. Save');
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkUser();
