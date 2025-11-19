import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "ksyk-maps",
  });
}

const db = getFirestore();

async function deleteAndRecreateOwner() {
  try {
    console.log("🗑️ Deleting old owner users...");
    
    // Delete all users with owner email
    const snapshot = await db.collection('users')
      .where('email', '==', 'JuusoJuusto112@gmail.com')
      .get();
    
    for (const doc of snapshot.docs) {
      console.log(`Deleting user with ID: ${doc.id}`);
      await doc.ref.delete();
    }
    
    console.log("✅ Old users deleted");
    
    // Create new owner with proper ID
    console.log("📝 Creating new owner user...");
    
    const ownerData = {
      email: 'JuusoJuusto112@gmail.com',
      firstName: 'Juuso',
      lastName: 'Kaikula',
      role: 'admin',
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('users').doc('owner-admin-user').set(ownerData);
    
    console.log("✅ Owner user created successfully!");
    console.log("   ID: owner-admin-user");
    console.log("   Email: JuusoJuusto112@gmail.com");
    console.log("   Role: admin");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

deleteAndRecreateOwner();
