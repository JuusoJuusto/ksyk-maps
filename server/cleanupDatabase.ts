import { storage } from "./storage";

export async function cleanupDatabase() {
  try {
    console.log("🧹 Cleaning up database...");
    
    // Remove old admin-ksyk-user if it exists
    try {
      const oldAdmin = await storage.getUserByEmail('admin@ksyk.fi');
      if (oldAdmin) {
        console.log("Removing old admin user:", oldAdmin.email);
        // Note: We don't have a delete user method, so we'll just log it
        console.log("⚠️ Old admin user found but cannot be deleted automatically");
        console.log("   Please manually delete user with email: admin@ksyk.fi from Firebase console");
      }
    } catch (error) {
      console.log("No old admin user found");
    }
    
    // Ensure owner exists
    const OWNER_EMAIL = "JuusoJuusto112@gmail.com";
    let ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
    
    if (!ownerUser) {
      console.log("Creating owner admin user...");
      ownerUser = await storage.upsertUser({
        id: 'owner-admin-user',
        email: OWNER_EMAIL,
        firstName: 'Juuso',
        lastName: 'Kaikula',
        role: 'admin',
        profileImageUrl: null
      });
      console.log("✅ Owner admin created");
    } else {
      console.log("✅ Owner admin already exists");
    }
    
    console.log("🎉 Database cleanup completed!");
  } catch (error) {
    console.error("❌ Error cleaning up database:", error);
  }
}
