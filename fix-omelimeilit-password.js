// Fix omelimeilit password in Firebase
// Run with: node fix-omelimeilit-password.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixPassword() {
  try {
    console.log('🔧 Fixing omelimeilit password...\n');
    
    // Find the user
    const snapshot = await db.collection('users')
      .where('email', '==', 'omelimeilit@gmail.com')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ User not found! Creating new user...');
      
      const newUser = {
        email: 'omelimeilit@gmail.com',
        firstName: 'Okko',
        lastName: 'Kettunen',
        role: 'admin',
        password: 'test',
        isTemporaryPassword: false,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await db.collection('users').add(newUser);
      console.log('✅ User created with ID:', docRef.id);
      console.log('📧 Email:', newUser.email);
      console.log('🔑 Password:', newUser.password);
      
    } else {
      const doc = snapshot.docs[0];
      const user = doc.data();
      
      console.log('✅ User found!');
      console.log('Current data:');
      console.log('  ID:', doc.id);
      console.log('  Email:', user.email);
      console.log('  Password:', user.password || 'NOT SET');
      console.log('  Role:', user.role);
      
      // Update password to "test"
      await db.collection('users').doc(doc.id).update({
        password: 'test',
        isTemporaryPassword: false,
        updatedAt: new Date()
      });
      
      console.log('\n✅ Password updated to: test');
      
      // Verify
      const updated = await db.collection('users').doc(doc.id).get();
      const updatedData = updated.data();
      
      console.log('\nVerification:');
      console.log('  New password:', updatedData.password);
      console.log('  Password === "test":', updatedData.password === 'test');
    }
    
    console.log('\n✅ DONE! You can now login with:');
    console.log('   Email: omelimeilit@gmail.com');
    console.log('   Password: test');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixPassword();
