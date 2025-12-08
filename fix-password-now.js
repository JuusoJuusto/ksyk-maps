// Fix password with exact string - no encoding issues
// Run with: node fix-password-now.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixPassword() {
  try {
    const email = 'omelimeilit@gmail.com';
    
    console.log('🔧 Fixing password for:', email);
    console.log('');
    
    // Find user
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (usersQuery.empty) {
      console.log('❌ User not found!');
      return;
    }
    
    const userDoc = usersQuery.docs[0];
    const currentData = userDoc.data();
    
    console.log('Current password in DB:', JSON.stringify(currentData.password));
    console.log('Password length:', currentData.password ? currentData.password.length : 0);
    console.log('Password bytes:', currentData.password ? Buffer.from(currentData.password).toString('hex') : 'none');
    console.log('');
    
    // Set a SIMPLE password for testing
    const newPassword = 'test123';
    
    await userDoc.ref.update({
      password: newPassword,
      isTemporaryPassword: false
    });
    
    console.log('✅ Password changed to SIMPLE test password!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TRY LOGGING IN NOW:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: omelimeilit@gmail.com');
    console.log('Password: test123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('If this works, the issue was with the old password.');
    console.log('You can change it to something else after logging in.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixPassword();
