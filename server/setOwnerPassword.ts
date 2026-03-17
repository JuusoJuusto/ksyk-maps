import * as dotenv from 'dotenv';
import { storage } from "./storage";
import * as readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askPassword(): Promise<string> {
  return new Promise((resolve) => {
    rl.question('Enter secure password for owner account: ', (password) => {
      resolve(password);
    });
  });
}

export async function setOwnerPassword() {
  try {
    console.log("🔐 Setting owner password securely...");
    
    const OWNER_EMAIL = 'juusojuusto112@gmail.com';
    
    // Get owner user
    const ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
    
    if (!ownerUser) {
      console.log("❌ Owner user not found. Run setupOwnerSecure first.");
      return;
    }
    
    // Ask for password securely
    const password = await askPassword();
    
    if (!password || password.length < 8) {
      console.log("❌ Password must be at least 8 characters long");
      return;
    }
    
    // Update owner password
    await storage.upsertUser({
      ...ownerUser,
      password: password,
      isTemporaryPassword: false
    });
    
    console.log("✅ Owner password set successfully!");
    console.log("   📧 Email:", OWNER_EMAIL);
    console.log("   🔐 Password: [HIDDEN FOR SECURITY]");
    
    rl.close();
  } catch (error) {
    console.error("❌ Error setting owner password:", error);
    rl.close();
    throw error;
  }
}

// Call the function if this script is run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('setOwnerPassword')) {
  setOwnerPassword()
    .then(() => {
      console.log('✅ Owner password setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Owner password setup failed:', error);
      process.exit(1);
    });
}