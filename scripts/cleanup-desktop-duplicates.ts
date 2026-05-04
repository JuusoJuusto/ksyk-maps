/**
 * Cleanup Desktop Duplicates
 * Removes duplicate desktop apps and keeps only unique ones
 */

import { storage } from "../server/storage";

async function cleanupDuplicates() {
  console.log("🧹 Cleaning up duplicate desktop apps...");

  try {
    // Get all apps
    const allApps = await storage.getWilmaDesktopApps();
    console.log(`📦 Found ${allApps.length} total apps`);

    // Group by appId
    const appGroups = new Map<string, any[]>();
    
    for (const app of allApps) {
      const appId = app.appId;
      if (!appGroups.has(appId)) {
        appGroups.set(appId, []);
      }
      appGroups.get(appId)!.push(app);
    }

    console.log(`📊 Found ${appGroups.size} unique app types`);

    // Find and remove duplicates
    let deletedCount = 0;
    
    for (const [appId, apps] of appGroups.entries()) {
      if (apps.length > 1) {
        console.log(`\n🔍 Found ${apps.length} duplicates of "${appId}"`);
        
        // Keep the first one (oldest), delete the rest
        const toKeep = apps[0];
        const toDelete = apps.slice(1);
        
        console.log(`  ✅ Keeping: ${toKeep.id} (${toKeep.nameFi})`);
        
        for (const app of toDelete) {
          try {
            await storage.deleteWilmaDesktopApp(app.id);
            console.log(`  🗑️  Deleted: ${app.id}`);
            deletedCount++;
          } catch (error) {
            console.log(`  ⚠️  Failed to delete ${app.id}:`, error);
          }
        }
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`  - Deleted: ${deletedCount} duplicate apps`);
    console.log(`  - Remaining: ${appGroups.size} unique apps`);
    
    // Show final list
    const finalApps = await storage.getWilmaDesktopApps();
    console.log(`\n📱 Final app list (${finalApps.length} apps):`);
    finalApps.forEach((app, idx) => {
      console.log(`  ${idx + 1}. ${app.nameFi} (${app.appId})`);
    });
    
  } catch (error) {
    console.error("❌ Error cleaning up duplicates:", error);
    throw error;
  }
}

// Auto-run
cleanupDuplicates()
  .then(() => {
    console.log("\n✅ Cleanup complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  });

export { cleanupDuplicates };
