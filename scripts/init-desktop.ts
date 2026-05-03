/**
 * Initialize Wilma Desktop Environment
 * This script enables the desktop and seeds default apps
 */

import { storage } from "../server/storage";

const defaultApps = [
  {
    appId: "calculator",
    name: "Calculator",
    nameFi: "Laskin",
    icon: "calculator",
    description: "Simple calculator for basic math operations",
    descriptionFi: "Yksinkertainen laskin peruslaskutoimituksiin",
    category: "utility",
    appType: "iframe",
    appUrl: "https://www.calculator.net/",
    width: 400,
    height: 600,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 1,
  },
  {
    appId: "notepad",
    name: "Notepad",
    nameFi: "Muistio",
    icon: "notepad",
    description: "Simple text editor for quick notes",
    descriptionFi: "Yksinkertainen tekstieditori muistiinpanoille",
    category: "productivity",
    appType: "iframe",
    appUrl: "https://notepad.js.org/",
    width: 800,
    height: 600,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 2,
  },
  {
    appId: "lofi-music",
    name: "Lo-Fi Beats",
    nameFi: "Lo-Fi Biitit",
    icon: "music",
    description: "Lo-fi hip hop beats to study/relax to",
    descriptionFi: "Lo-fi hip hop biittejä opiskeluun ja rentoutumiseen",
    category: "entertainment",
    appType: "iframe",
    appUrl: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&loop=1&playlist=jfKfPfyJRdk",
    width: 800,
    height: 600,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 3,
  },
  {
    appId: "white-noise",
    name: "White Noise",
    nameFi: "Valkoinen Kohina",
    icon: "music",
    description: "White noise for concentration and sleep",
    descriptionFi: "Valkoista kohinaa keskittymiseen ja nukkumiseen",
    category: "entertainment",
    appType: "iframe",
    appUrl: "https://www.youtube.com/embed/nMfPqeZjc2c?autoplay=1&loop=1&playlist=nMfPqeZjc2c",
    width: 600,
    height: 400,
    resizable: true,
    minimizable: true,
    maximizable: false,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 4,
  },
  {
    appId: "calendar",
    name: "Calendar",
    nameFi: "Kalenteri",
    icon: "calendar",
    description: "View and manage your schedule",
    descriptionFi: "Katso ja hallinnoi aikatauluasi",
    category: "productivity",
    appType: "component",
    componentName: "CalendarApp",
    width: 900,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 5,
  },
  {
    appId: "settings",
    name: "Settings",
    nameFi: "Asetukset",
    icon: "settings",
    description: "Customize your desktop",
    descriptionFi: "Mukauta työpöytääsi",
    category: "utility",
    appType: "component",
    componentName: "DesktopSettings",
    width: 600,
    height: 500,
    resizable: false,
    minimizable: true,
    maximizable: false,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 6,
  },
];

async function initDesktop() {
  console.log("🖥️ Initializing Wilma Desktop Environment...");

  try {
    // 1. Enable desktop and set default settings
    console.log("📝 Creating desktop settings...");
    const settings = await storage.getWilmaDesktopSettings();
    
    if (!settings) {
      await storage.updateWilmaDesktopSettings({
        enabled: true,
        defaultWallpaper: "/wilma-bg.jpg",
        defaultTheme: "light",
        allowCustomWallpaper: true,
        allowCustomTheme: true,
        availableApps: defaultApps.map(app => app.appId),
        defaultApps: ["calculator", "notepad", "lofi-music", "white-noise", "calendar", "settings"],
      });
      console.log("✅ Desktop settings created and enabled");
    } else {
      // Update to enable if disabled
      await storage.updateWilmaDesktopSettings({
        ...settings,
        enabled: true,
      });
      console.log("✅ Desktop enabled");
    }

    // 2. Create default apps
    console.log("📱 Creating default apps...");
    const existingApps = await storage.getWilmaDesktopApps();
    
    if (existingApps.length === 0) {
      for (const app of defaultApps) {
        try {
          await storage.createWilmaDesktopApp(app);
          console.log(`  ✅ Created: ${app.nameFi}`);
        } catch (error) {
          console.log(`  ⚠️  ${app.nameFi} might already exist, skipping...`);
        }
      }
      console.log("✅ All apps created");
    } else {
      console.log(`✅ ${existingApps.length} apps already exist`);
    }

    console.log("\n🎉 Desktop initialization complete!");
    console.log("\n📋 Summary:");
    console.log("  - Desktop: ENABLED");
    console.log(`  - Apps: ${existingApps.length > 0 ? existingApps.length : defaultApps.length} available`);
    console.log("  - Default wallpaper: /wilma-bg.jpg");
    console.log("  - Default theme: light");
    console.log("\n✨ Users can now access the desktop environment!");
    
  } catch (error) {
    console.error("❌ Error initializing desktop:", error);
    throw error;
  }
}

// Auto-run the initialization
initDesktop()
  .then(() => {
    console.log("\n✅ Initialization complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Initialization failed:", error);
    process.exit(1);
  });

export { initDesktop };
