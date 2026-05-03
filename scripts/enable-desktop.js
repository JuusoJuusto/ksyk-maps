/**
 * Enable Desktop Environment via API
 * Run with: node scripts/enable-desktop.js
 */

async function enableDesktop() {
  console.log("🖥️ Enabling Desktop Environment...\n");

  try {
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    
    // Enable desktop settings
    console.log("1️⃣ Enabling desktop settings...");
    const settingsResponse = await fetch(`${baseUrl}/api/wilma/desktop/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        defaultWallpaper: "/wilma-bg.jpg",
        defaultTheme: "light",
        allowCustomWallpaper: true,
        allowCustomTheme: true,
        availableApps: [
          "calculator", "notepad", "calendar", "music", "calm-music", 
          "lofi-music", "white-noise", "nature-sounds", "classical-music", 
          "jazz-music", "games", "code", "books", "mail", "settings", "clock"
        ],
        defaultApps: ["calculator", "notepad", "calendar", "mail", "settings", "lofi-music", "white-noise"],
      }),
    });

    if (settingsResponse.ok) {
      console.log("✅ Desktop settings enabled!\n");
    } else {
      console.log("⚠️  Settings might already be enabled\n");
    }

    console.log("2️⃣ Creating default apps...");
    
    const defaultApps = [
      {
        appId: "calculator",
        name: "Calculator",
        nameFi: "Laskin",
        icon: "calculator",
        description: "Simple calculator",
        descriptionFi: "Yksinkertainen laskin",
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
        description: "Text editor",
        descriptionFi: "Tekstieditori",
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
        description: "Lo-fi hip hop beats",
        descriptionFi: "Lo-fi hip hop biittejä",
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
    ];

    for (const app of defaultApps) {
      try {
        const response = await fetch(`${baseUrl}/api/wilma/desktop/apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app),
        });
        
        if (response.ok) {
          console.log(`✅ Created: ${app.nameFi}`);
        } else {
          console.log(`⚠️  ${app.nameFi} might already exist`);
        }
      } catch (error) {
        console.log(`⚠️  ${app.nameFi} - ${error.message}`);
      }
    }

    console.log("\n🎉 Desktop Environment is now ENABLED!");
    console.log("\n📍 Access URLs:");
    console.log("   Students: /wilma/:studentId/desktop");
    console.log("   Admin: /wilma-admin/:adminId/desktop");
    console.log("\n⚙️  Manage from: Admin Panel → Työpöytä tab\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

enableDesktop()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
