// FORCE LOGIN FIX - Updates user to ensure login works
// Run with: node force-login-fix.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function forceLoginFix() {
  try {
    const email = 'omelimeilit@gmail.com';
    
    console.log('🔧 FORCING LOGIN FIX FOR:', email);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Find user
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (usersQuery.empty) {
      console.log('❌ User not found! Creating new user...\n');
      
      // Create user
      await db.collection('users').add({
        email: email,
        firstName: 'Okko',
        lastName: 'Kettunen',
        role: 'admin',
        password: 'test123',
        isTemporaryPassword: false,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ User created!');
    } else {
      const userDoc = usersQuery.docs[0];
      
      console.log('Current data:');
      console.log(JSON.stringify(userDoc.data(), null, 2));
      console.log('');
      
      // Update with clean data
      await userDoc.ref.update({
        email: email,
        firstName: 'Okko',
        lastName: 'Kettunen',
        role: 'admin',
        password: 'test123',
        isTemporaryPassword: false,
        updatedAt: new Date()
      });
      
      console.log('✅ User updated with clean data!');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: omelimeilit@gmail.com');
    console.log('Password: test123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('NOW:');
    console.log('1. RESTART YOUR SERVER (Ctrl+C, then npm run dev)');
    console.log('2. Go to: http://localhost:3000/admin-login');
    console.log('3. Login with credentials above');
    console.log('4. IT WILL WORK!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

forceLoginFix();
