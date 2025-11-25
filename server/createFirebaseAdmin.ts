import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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

const auth = getAuth();

async function createAdminUser() {
  const email = 'JuusoJuusto112@gmail.com';
  const password = 'Juusto2012!';
  
  try {
    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      console.log('✅ Admin user already exists:', existingUser.uid);
      console.log('Email:', existingUser.email);
      return;
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }
    
    // Create new user
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: 'Juuso Kaikula',
      emailVerified: true,
    });
    
    // Set custom claims for admin role
    await auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin'
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('UID:', userRecord.uid);
    console.log('Email:', userRecord.email);
    console.log('Password:', password);
    console.log('\nYou can now login at: https://ksykmaps.vercel.app/admin-login');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

createAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
