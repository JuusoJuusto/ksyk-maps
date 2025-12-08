// Set SUPER SIMPLE password - just "test"
// Run with: node set-super-simple-password.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function setSimplePassword() {
  try {
    const email = 'omelimeilit@gmail.com';
    const password = 'test'; // SUPER SIMPLE
    
    console.log('Setting SUPER SIMPLE password...\n');
    
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (usersQuery.empty) {
      console.log('❌ User not found!');
      return;
    }
    
    const userDoc = usersQuery.docs[0];
    
    await userDoc.ref.update({
      password: password,
      isTemporaryPassword: false
    });
    
    console.log('✅ Password set to: test');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('LOGIN WITH:');
    console.log('Email: omelimeilit@gmail.com');
    console.log('Password: test');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

setSimplePassword();
