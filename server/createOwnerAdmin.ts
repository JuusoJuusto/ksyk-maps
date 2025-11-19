import { storage } from "./storage";

export async function createOwnerAdmin() {
  try {
    console.log("🔐 Creating owner admin account in database...");
    
    // Hardcoded owner credentials
    const OWNER_EMAIL = "JuusoJuusto112@gmail.com";
    const OWNER_PASSWORD = "Juusto2012!"; // This is only for reference, actual auth is hardcoded
    
    // Check if owner already exists
    let ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
    
    if (ownerUser) {
      console.log("✅ Owner admin already exists in database:", OWNER_EMAIL);
      console.log("   User ID:", ownerUser.id);
      console.log("   Role:", ownerUser.role);
      return ownerUser;
    }
    
    // Create owner admin user in database
    ownerUser = await storage.upsertUser({
      id: 'owner-admin-user',
      email: OWNER_EMAIL,
      firstName: 'Juuso',
      lastName: 'Kaikula',
      role: 'admin',
      profileImageUrl: null
    });
    
    console.log("✅ Owner admin created successfully in database!");
    console.log("   📧 Email:", OWNER_EMAIL);
    console.log("   🔑 Password:", OWNER_PASSWORD);
    console.log("   👤 Name: Juuso Kaikula");
    console.log("   🆔 User ID:", ownerUser.id);
    console.log("   🎭 Role:", ownerUser.role);
    
    return ownerUser;
  } catch (error) {
    console.error("❌ Error creating owner admin:", error);
    throw error;
  }
}
