// Detailed login test - shows exactly what's happening
// Run with: node test-login-detailed.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function testLogin() {
  try {
    const testEmail = 'omelimeilit@gmail.com';
    const testPassword = 'test123';
    
    console.log('🧪 TESTING LOGIN PROCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('1️⃣ Looking up user by email...');
    const snapshot = await db.collection('users')
      .where('email', '==', testEmail)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ User NOT found in database!');
      return;
    }
    
    console.log('✅ User found!\n');
    
    const doc = snapshot.docs[0];
    const userData = doc.data();
    
    console.log('2️⃣ User data from database:');
    console.log('   ID:', doc.id);
    console.log('   Email:', userData.email);
    console.log('   Name:', userData.firstName, userData.lastName);
    console.log('   Role:', userData.role);
    console.log('   Password field exists:', 'password' in userData);
    console.log('   Password value:', userData.password);
    console.log('   Password type:', typeof userData.password);
    console.log('   Password length:', userData.password ? userData.password.length : 0);
    console.log('');
    
    console.log('3️⃣ Testing password comparison:');
    console.log('   Stored password:', JSON.stringify(userData.password));
    console.log('   Test password:', JSON.stringify(testPassword));
    console.log('   Exact match (===):', userData.password === testPassword);
    console.log('   Loose match (==):', userData.password == testPassword);
    console.log('');
    
    if (userData.password === testPassword) {
      console.log('✅ PASSWORD MATCHES!');
      console.log('   Login should work with:');
      console.log('   Email: omelimeilit@gmail.com');
      console.log('   Password: test123');
    } else {
      console.log('❌ PASSWORD DOES NOT MATCH!');
      console.log('');
      console.log('   Expected:', testPassword);
      console.log('   Got:', userData.password);
      console.log('');
      console.log('   Possible issues:');
      console.log('   - Extra spaces');
      console.log('   - Different encoding');
      console.log('   - Case sensitivity');
      console.log('');
      console.log('   Run: node fix-password-now.js');
      console.log('   To reset password to: test123');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testLogin();
