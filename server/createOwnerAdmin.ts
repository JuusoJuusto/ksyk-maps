import * as dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import { storage } from "./storage";

export async function createOwnerAdmin() {
  try {
    console.log("🔐 Creating owner admin account in database...");
    
    // Get owner credentials from environment variables
    const OWNER_EMAIL = process.env.OWNER_EMAIL || "juusojuusto112@gmail.com";
    const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "Juusto2012!";
    
    console.log(`📧 Using owner email: ${OWNER_EMAIL}`);
    
    // Check if owner already exists
    let ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
    
    if (ownerUser) {
      console.log("✅ Owner admin already exists in database:", OWNER_EMAIL);
      console.log("   User ID:", ownerUser.id);
      console.log("   Role:", ownerUser.role);
      
      // Ensure the user has admin role and can login
      if (ownerUser.role !== 'admin') {
        console.log("🔧 Updating owner role to admin...");
        ownerUser = await storage.upsertUser({
          ...ownerUser,
          role: 'admin',
          canLoginToKsykMaps: true
        });
        console.log("✅ Owner role updated to admin");
      }
      
      return ownerUser;
    }
    
    // Create owner admin user in database
    ownerUser = await storage.upsertUser({
      id: 'owner-admin-user',
      email: OWNER_EMAIL,
      firstName: process.env.OWNER_FIRST_NAME || 'Juuso',
      lastName: process.env.OWNER_LAST_NAME || 'Kaikula',
      role: 'admin',
      profileImageUrl: null,
      canLoginToKsykMaps: true,
      password: null, // We use hardcoded auth
      isTemporaryPassword: false
    });
    
    console.log("✅ Owner admin created successfully in database!");
    console.log("   📧 Email:", OWNER_EMAIL);
    console.log("   🔑 Password:", OWNER_PASSWORD);
    console.log("   👤 Name: Juuso Kaikula");
    console.log("   🆔 User ID:", ownerUser.id);
    console.log("   🎭 Role:", ownerUser.role);
    console.log("   🔓 Can Login:", ownerUser.canLoginToKsykMaps);
    
    return ownerUser;
  } catch (error) {
    console.error("❌ Error creating owner admin:", error);
    throw error;
  }
}

// Call the function if this script is run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('createOwnerAdmin')) {
  createOwnerAdmin()
    .then(() => {
      console.log('✅ Owner admin setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Owner admin setup failed:', error);
      process.exit(1);
    });
}
