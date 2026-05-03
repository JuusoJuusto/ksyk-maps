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
  {
    appId: "clock",
    name: "Clock",
    nameFi: "Kello",
    icon: "clock",
    description: "World clock and timer",
    descriptionFi: "Maailmankello ja ajastin",
    category: "utility",
    appType: "iframe",
    appUrl: "https://time.is/",
    width: 500,
    height: 400,
    resizable: true,
    minimizable: true,
    maximizable: false,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 7,
  },
  {
    appId: "paint",
    name: "Paint",
    nameFi: "Piirto-ohjelma",
    icon: "image",
    description: "Simple drawing and painting tool",
    descriptionFi: "Yksinkertainen piirto- ja maalaustyökalu",
    category: "creativity",
    appType: "iframe",
    appUrl: "https://jspaint.app/",
    width: 900,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 8,
  },
  {
    appId: "chess",
    name: "Chess",
    nameFi: "Shakki",
    icon: "games",
    description: "Play chess online",
    descriptionFi: "Pelaa shakkia verkossa",
    category: "games",
    appType: "iframe",
    appUrl: "https://lichess.org/",
    width: 800,
    height: 800,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 9,
  },
  {
    appId: "typing-test",
    name: "Typing Test",
    nameFi: "Kirjoitusnopeus",
    icon: "terminal",
    description: "Test and improve your typing speed",
    descriptionFi: "Testaa ja paranna kirjoitusnopeuttasi",
    category: "education",
    appType: "iframe",
    appUrl: "https://monkeytype.com/",
    width: 1000,
    height: 600,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 10,
  },
  {
    appId: "wikipedia",
    name: "Wikipedia",
    nameFi: "Wikipedia",
    icon: "books",
    description: "Free online encyclopedia",
    descriptionFi: "Ilmainen verkkotietosanakirja",
    category: "education",
    appType: "iframe",
    appUrl: "https://fi.wikipedia.org/",
    width: 1000,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 11,
  },
  {
    appId: "youtube",
    name: "YouTube",
    nameFi: "YouTube",
    icon: "video",
    description: "Watch educational videos",
    descriptionFi: "Katso opetusvideoita",
    category: "education",
    appType: "iframe",
    appUrl: "https://www.youtube.com/",
    width: 1000,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 12,
  },
  {
    appId: "code-editor",
    name: "Code Editor",
    nameFi: "Koodieditori",
    icon: "code",
    description: "Online code editor and compiler",
    descriptionFi: "Verkkokoodieditori ja kääntäjä",
    category: "education",
    appType: "iframe",
    appUrl: "https://replit.com/",
    width: 1200,
    height: 800,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 13,
  },
  {
    appId: "maps",
    name: "Maps",
    nameFi: "Kartat",
    icon: "globe",
    description: "Explore the world with maps",
    descriptionFi: "Tutustu maailmaan karttojen avulla",
    category: "education",
    appType: "iframe",
    appUrl: "https://www.openstreetmap.org/",
    width: 1000,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 14,
  },
  {
    appId: "pomodoro",
    name: "Pomodoro Timer",
    nameFi: "Pomodoro-ajastin",
    icon: "clock",
    description: "Productivity timer for focused work",
    descriptionFi: "Tuottavuusajastin keskittyneeseen työskentelyyn",
    category: "productivity",
    appType: "iframe",
    appUrl: "https://pomofocus.io/",
    width: 500,
    height: 400,
    resizable: false,
    minimizable: true,
    maximizable: false,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 15,
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
        defaultApps: ["calculator", "notepad", "lofi-music", "white-noise", "calendar", "settings", "clock", "paint", "chess", "typing-test", "wikipedia", "youtube", "code-editor", "maps", "pomodoro"],
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
