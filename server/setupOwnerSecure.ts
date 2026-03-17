import * as dotenv from 'dotenv';
import { storage } from "./storage";

// Load environment variables
dotenv.config();

export async function setupOwnerSecure() {
  try {
    console.log("🔐 Setting up secure owner account...");
    
    const OWNER_EMAIL = 'juusojuusto112@gmail.com';
    
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
    // NOTE: Password must be set manually for security
    ownerUser = await storage.upsertUser({
      id: 'owner-admin-user',
      email: OWNER_EMAIL,
      firstName: 'Juuso',
      lastName: 'Kaikula',
      role: 'admin',
      profileImageUrl: null,
      canLoginToKsykMaps: true,
      password: null, // Must be set manually
      isTemporaryPassword: false
    });
    
    console.log("✅ Owner admin created successfully in database!");
    console.log("   📧 Email:", OWNER_EMAIL);
    console.log("   👤 Name: Juuso Kaikula");
    console.log("   🆔 User ID:", ownerUser.id);
    console.log("   🎭 Role:", ownerUser.role);
    console.log("   🔓 Can Login:", ownerUser.canLoginToKsykMaps);
    console.log("   ⚠️  PASSWORD MUST BE SET MANUALLY FOR SECURITY");
    
    return ownerUser;
  } catch (error) {
    console.error("❌ Error setting up owner admin:", error);
    throw error;
  }
}

// Call the function if this script is run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('setupOwnerSecure')) {
  setupOwnerSecure()
    .then(() => {
      console.log('✅ Owner admin setup completed successfully!');
      console.log('⚠️  IMPORTANT: Set password manually in admin panel for security');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Owner admin setup failed:', error);
      process.exit(1);
    });
}