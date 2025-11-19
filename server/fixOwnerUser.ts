import { storage } from "./storage";

async function fixOwnerUser() {
  try {
    console.log("🔧 Fixing owner user...");
    
    const OWNER_EMAIL = "JuusoJuusto112@gmail.com";
    
    // Force recreate with proper ID
    const ownerUser = await storage.upsertUser({
      id: 'owner-admin-user',
      email: OWNER_EMAIL,
      firstName: 'Juuso',
      lastName: 'Kaikula',
      role: 'admin',
      profileImageUrl: null
    });
    
    console.log("✅ Owner user fixed!");
    console.log("   ID:", ownerUser.id);
    console.log("   Email:", ownerUser.email);
    console.log("   Role:", ownerUser.role);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixOwnerUser();
