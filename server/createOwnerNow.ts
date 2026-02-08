import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "ksyk-maps",
  });
}

const db = getFirestore();

async function createOwnerUser() {
  try {
    console.log('🔥 Creating owner user in Firebase...');
    
    const ownerData = {
      email: 'juusojuusto112@gmail.com',
      firstName: 'Juuso',
      lastName: 'Kaikula',
      role: 'owner',
      password: 'Juusto2012!',
      isTemporaryPassword: false,
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create or update owner user
    await db.collection('users').doc('owner-admin-user').set(ownerData, { merge: true });
    
    console.log('✅ Owner user created successfully!');
    console.log('📧 Email: juusojuusto112@gmail.com');
    console.log('🔑 Password: Juusto2012!');
    console.log('\n🎯 You can now login at: https://ksyk-maps.vercel.app/admin-login-ksyk-management');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating owner user:', error);
    process.exit(1);
  }
}

createOwnerUser();
