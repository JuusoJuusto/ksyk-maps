import { firebaseStorage } from './firebaseStorage.js';

const desktopApps = [
  // Educational Apps
  { name: 'WilmaApp', icon: 'GraduationCap', category: 'education', isActive: true, order: 1 },
  { name: 'Coursera', icon: 'BookOpen', category: 'education', isActive: true, order: 2 },
  { name: 'Udemy', icon: 'Video', category: 'education', isActive: true, order: 3 },
  { name: 'Khan Academy', icon: 'School', category: 'education', isActive: true, order: 4 },
  { name: 'Quizlet', icon: 'Brain', category: 'education', isActive: true, order: 5 },
  { name: 'Duolingo', icon: 'Languages', category: 'education', isActive: true, order: 6 },
  
  // Productivity Apps
  { name: 'Notion', icon: 'FileText', category: 'productivity', isActive: true, order: 7 },
  { name: 'Trello', icon: 'Trello', category: 'productivity', isActive: true, order: 8 },
  { name: 'OneDrive', icon: 'Cloud', category: 'productivity', isActive: true, order: 9 },
  { name: 'Google Drive', icon: 'HardDrive', category: 'productivity', isActive: true, order: 10 },
  { name: 'Dropbox', icon: 'Dropbox', category: 'productivity', isActive: true, order: 11 },
  
  // Communication Apps
  { name: 'Microsoft Teams', icon: 'Users', category: 'communication', isActive: true, order: 12 },
  { name: 'Slack', icon: 'MessageSquare', category: 'communication', isActive: true, order: 13 },
  { name: 'Discord', icon: 'MessageCircle', category: 'communication', isActive: true, order: 14 },
  { name: 'Messenger', icon: 'Send', category: 'communication', isActive: true, order: 15 },
  { name: 'Zoom', icon: 'Video', category: 'communication', isActive: true, order: 16 },
  { name: 'Google Meet', icon: 'VideoIcon', category: 'communication', isActive: true, order: 17 },
  
  // Development Tools
  { name: 'GitHub', icon: 'Github', category: 'development', isActive: true, order: 18 },
  { name: 'VS Code', icon: 'Code', category: 'development', isActive: true, order: 19 },
  { name: 'Terminal', icon: 'Terminal', category: 'development', isActive: true, order: 20 },
  
  // Design Tools
  { name: 'Figma', icon: 'Figma', category: 'design', isActive: true, order: 21 },
  { name: 'Canva', icon: 'Palette', category: 'design', isActive: true, order: 22 },
  { name: 'Paint', icon: 'Paintbrush', category: 'design', isActive: true, order: 23 },
  
  // Office Suite
  { name: 'Word', icon: 'FileText', category: 'office', isActive: true, order: 24 },
  { name: 'Excel', icon: 'Table', category: 'office', isActive: true, order: 25 },
  { name: 'PowerPoint', icon: 'Presentation', category: 'office', isActive: true, order: 26 },
  { name: 'Outlook', icon: 'Mail', category: 'office', isActive: true, order: 27 },
  
  // Entertainment
  { name: 'Spotify', icon: 'Music', category: 'entertainment', isActive: true, order: 28 },
  { name: 'YouTube', icon: 'Youtube', category: 'entertainment', isActive: true, order: 29 },
  
  // Utilities
  { name: 'Calculator', icon: 'Calculator', category: 'utilities', isActive: true, order: 30 },
  { name: 'Clock', icon: 'Clock', category: 'utilities', isActive: true, order: 31 },
  { name: 'Calendar', icon: 'Calendar', category: 'utilities', isActive: true, order: 32 },
  { name: 'Settings', icon: 'Settings', category: 'utilities', isActive: true, order: 33 },
  { name: 'File Explorer', icon: 'Folder', category: 'utilities', isActive: true, order: 34 },
  { name: 'Photos', icon: 'Image', category: 'utilities', isActive: true, order: 35 },
  { name: 'Notes', icon: 'StickyNote', category: 'utilities', isActive: true, order: 36 },
  { name: 'Weather', icon: 'Cloud', category: 'utilities', isActive: true, order: 37 },
  { name: 'Maps', icon: 'Map', category: 'utilities', isActive: true, order: 38 },
  { name: 'Camera', icon: 'Camera', category: 'utilities', isActive: true, order: 39 },
  { name: 'Voice Recorder', icon: 'Mic', category: 'utilities', isActive: true, order: 40 },
  { name: 'Task Manager', icon: 'Activity', category: 'utilities', isActive: true, order: 41 },
  { name: 'Control Panel', icon: 'Sliders', category: 'utilities', isActive: true, order: 42 },
  { name: 'Store', icon: 'ShoppingBag', category: 'utilities', isActive: true, order: 43 },
  { name: 'Browser', icon: 'Globe', category: 'utilities', isActive: true, order: 44 },
];

async function seedDesktopApps() {
  console.log('🚀 Starting desktop apps seeding...');
  
  try {
    let created = 0;
    let skipped = 0;
    
    for (const app of desktopApps) {
      try {
        await firebaseStorage.createWilmaDesktopApp(app);
        console.log(`✅ Created app: ${app.name}`);
        created++;
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Skipped (exists): ${app.name}`);
          skipped++;
        } else {
          console.error(`❌ Error creating ${app.name}:`, error.message);
        }
      }
    }
    
    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Created: ${created} apps`);
    console.log(`   ⏭️  Skipped: ${skipped} apps`);
    console.log(`   📦 Total: ${desktopApps.length} apps`);
    console.log('\n🎉 Desktop apps seeding complete!');
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDesktopApps()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDesktopApps };
