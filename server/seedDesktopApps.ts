/**
 * Seed default desktop apps for Wilma Desktop Environment
 */

import { storage } from "./storage";

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
    sortOrder: 3,
  },
  {
    appId: "music",
    name: "Music Player",
    nameFi: "Musiikkisoitin",
    icon: "music",
    description: "Listen to music while studying",
    descriptionFi: "Kuuntele musiikkia opiskelun aikana",
    category: "entertainment",
    appType: "iframe",
    appUrl: "https://www.youtube.com/",
    width: 1000,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 4,
  },
  {
    appId: "games",
    name: "Games",
    nameFi: "Pelit",
    icon: "games",
    description: "Play educational games",
    descriptionFi: "Pelaa opettavaisia pelejä",
    category: "entertainment",
    appType: "iframe",
    appUrl: "https://www.coolmathgames.com/",
    width: 1000,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student"],
    isActive: true,
    sortOrder: 5,
  },
  {
    appId: "code",
    name: "Code Editor",
    nameFi: "Koodieditori",
    icon: "code",
    description: "Write and test code online",
    descriptionFi: "Kirjoita ja testaa koodia verkossa",
    category: "education",
    appType: "iframe",
    appUrl: "https://codesandbox.io/",
    width: 1200,
    height: 800,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher"],
    isActive: true,
    sortOrder: 6,
  },
  {
    appId: "books",
    name: "Library",
    nameFi: "Kirjasto",
    icon: "books",
    description: "Access digital library resources",
    descriptionFi: "Käytä digitaalisia kirjastoresursseja",
    category: "education",
    appType: "iframe",
    appUrl: "https://openlibrary.org/",
    width: 1000,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 7,
  },
  {
    appId: "mail",
    name: "Mail",
    nameFi: "Sähköposti",
    icon: "mail",
    description: "Check your school email",
    descriptionFi: "Tarkista koulun sähköpostisi",
    category: "productivity",
    appType: "component",
    componentName: "MailApp",
    width: 1000,
    height: 700,
    resizable: true,
    minimizable: true,
    maximizable: true,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 8,
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
    sortOrder: 9,
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
    width: 400,
    height: 500,
    resizable: true,
    minimizable: true,
    maximizable: false,
    allowedRoles: ["student", "teacher", "parent", "admin"],
    isActive: true,
    sortOrder: 10,
  },
];

export async function seedDesktopApps() {
  console.log("🌱 Seeding desktop apps...");

  try {
    // Create default desktop settings
    const settings = await storage.getWilmaDesktopSettings();
    if (!settings) {
      await storage.updateWilmaDesktopSettings({
        enabled: true,
        defaultWallpaper: "/wilma-bg.jpg",
        defaultTheme: "light",
        allowCustomWallpaper: true,
        allowCustomTheme: true,
        availableApps: defaultApps.map(app => app.appId),
        defaultApps: ["calculator", "notepad", "calendar", "mail", "settings"],
      });
      console.log("✅ Desktop settings created");
    }

    // Create apps
    for (const app of defaultApps) {
      try {
        await storage.createWilmaDesktopApp(app);
        console.log(`✅ Created app: ${app.nameFi}`);
      } catch (error) {
        console.log(`⚠️  App ${app.nameFi} might already exist, skipping...`);
      }
    }

    console.log("🎉 Desktop apps seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding desktop apps:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDesktopApps()
    .then(() => {
      console.log("✅ Seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
