// Reset user password in Firebase
// Run with: node reset-password.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function resetPassword() {
  try {
    const email = 'omelimeilit@gmail.com';
    const newPassword = 'OwlAppsOkko'; // Change this if needed
    
    console.log('🔄 Resetting password for:', email);
    console.log('   New password:', newPassword);
    console.log('');
    
    // Find user
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (usersQuery.empty) {
      console.log('❌ User not found!');
      return;
    }
    
    // Update password
    const userDoc = usersQuery.docs[0];
    await userDoc.ref.update({
      password: newPassword,
      isTemporaryPassword: false
    });
    
    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email:', email);
    console.log('  Password:', newPassword);
    console.log('');
    console.log('Try logging in now at: http://localhost:3000/admin-login');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

resetPassword();
