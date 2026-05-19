/**
 * COMPREHENSIVE DESKTOP APPS SEEDING SCRIPT
 * Seeds professional desktop applications for Wilma Desktop environment
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(process.cwd(), 'serviceAccountKey.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

export async function seedDesktopApps() {
  console.log('🖥️ ========== SEEDING DESKTOP APPS ==========');

  const apps = [
    // ============================================
    // PRODUCTIVITY APPS
    // ============================================
    {
      appId: 'notepad',
      name: 'Notepad',
      nameFi: 'Muistio',
      icon: 'notepad',
      description: 'Simple text editor for quick notes',
      descriptionFi: 'Yksinkertainen tekstieditori nopeisiin muistiinpanoihin',
      category: 'productivity',
      appType: 'component',
      componentName: 'NotepadApp',
      width: 600,
      height: 400,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 1,
    },
    {
      appId: 'calculator',
      name: 'Calculator',
      nameFi: 'Laskin',
      icon: 'calculator',
      description: 'Scientific calculator',
      descriptionFi: 'Tieteellinen laskin',
      category: 'productivity',
      appType: 'component',
      componentName: 'CalculatorApp',
      width: 350,
      height: 500,
      resizable: false,
      minimizable: true,
      maximizable: false,
      isActive: true,
      isPinned: true,
      order: 2,
    },
    {
      appId: 'calendar',
      name: 'Calendar',
      nameFi: 'Kalenteri',
      icon: 'calendar',
      description: 'Manage your schedule and events',
      descriptionFi: 'Hallitse aikatauluasi ja tapahtumia',
      category: 'productivity',
      appType: 'component',
      componentName: 'CalendarApp',
      width: 800,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 3,
    },
    {
      appId: 'clock',
      name: 'Clock',
      nameFi: 'Kello',
      icon: 'clock',
      description: 'World clock and timer',
      descriptionFi: 'Maailmankello ja ajastin',
      category: 'productivity',
      appType: 'component',
      componentName: 'ClockApp',
      width: 400,
      height: 300,
      resizable: true,
      minimizable: true,
      maximizable: false,
      isActive: true,
      isPinned: false,
      order: 4,
    },
    {
      appId: 'todo-list',
      name: 'Todo List',
      nameFi: 'Tehtävälista',
      icon: 'notepad',
      description: 'Manage your tasks and todos',
      descriptionFi: 'Hallitse tehtäviäsi ja listojasi',
      category: 'productivity',
      appType: 'component',
      componentName: 'TodoListApp',
      width: 500,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 5,
    },

    // ============================================
    // CREATIVE APPS
    // ============================================
    {
      appId: 'paint',
      name: 'Paint',
      nameFi: 'Piirto-ohjelma',
      icon: 'image',
      description: 'Simple drawing application',
      descriptionFi: 'Yksinkertainen piirto-ohjelma',
      category: 'creative',
      appType: 'component',
      componentName: 'PaintApp',
      width: 800,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 6,
    },
    {
      appId: 'music-player',
      name: 'Music Player',
      nameFi: 'Musiikkisoitin',
      icon: 'music',
      description: 'Play your favorite music',
      descriptionFi: 'Soita suosikkimusiikkiasi',
      category: 'creative',
      appType: 'component',
      componentName: 'MusicPlayerApp',
      width: 400,
      height: 500,
      resizable: true,
      minimizable: true,
      maximizable: false,
      isActive: true,
      isPinned: false,
      order: 7,
    },
    {
      appId: 'photo-viewer',
      name: 'Photo Viewer',
      nameFi: 'Kuvakatselin',
      icon: 'photos',
      description: 'View and organize your photos',
      descriptionFi: 'Katso ja järjestä kuvia',
      category: 'creative',
      appType: 'component',
      componentName: 'PhotoViewerApp',
      width: 900,
      height: 700,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 8,
    },

    // ============================================
    // DEVELOPMENT APPS
    // ============================================
    {
      appId: 'code-editor',
      name: 'Code Editor',
      nameFi: 'Koodieditori',
      icon: 'code',
      description: 'Write and edit code',
      descriptionFi: 'Kirjoita ja muokkaa koodia',
      category: 'development',
      appType: 'component',
      componentName: 'CodeEditorApp',
      width: 1000,
      height: 700,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 9,
    },
    {
      appId: 'terminal',
      name: 'Terminal',
      nameFi: 'Terminaali',
      icon: 'terminal',
      description: 'Command line interface',
      descriptionFi: 'Komentorivi',
      category: 'development',
      appType: 'component',
      componentName: 'TerminalApp',
      width: 800,
      height: 500,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 10,
    },
    {
      appId: 'git-client',
      name: 'Git Client',
      nameFi: 'Git-asiakasohjelma',
      icon: 'code',
      description: 'Version control with Git',
      descriptionFi: 'Versionhallinta Gitillä',
      category: 'development',
      appType: 'component',
      componentName: 'GitClientApp',
      width: 900,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 11,
    },

    // ============================================
    // COMMUNICATION APPS
    // ============================================
    {
      appId: 'mail',
      name: 'Mail',
      nameFi: 'Sähköposti',
      icon: 'mail',
      description: 'Email client',
      descriptionFi: 'Sähköpostiohjelma',
      category: 'communication',
      appType: 'component',
      componentName: 'MailApp',
      width: 1000,
      height: 700,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 12,
    },
    {
      appId: 'chat',
      name: 'Chat',
      nameFi: 'Chat',
      icon: 'mail',
      description: 'Instant messaging',
      descriptionFi: 'Pikaviestintä',
      category: 'communication',
      appType: 'component',
      componentName: 'ChatApp',
      width: 600,
      height: 700,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 13,
    },

    // ============================================
    // EDUCATION APPS
    // ============================================
    {
      appId: 'learn-coding',
      name: 'Learn Coding',
      nameFi: 'Opi koodaamaan',
      icon: 'code',
      description: 'Interactive coding courses',
      descriptionFi: 'Interaktiiviset koodauskurssit',
      category: 'education',
      appType: 'iframe',
      appUrl: '/wilma/:userId/learn-coding',
      width: 1200,
      height: 800,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 14,
    },
    {
      appId: 'library',
      name: 'Library',
      nameFi: 'Kirjasto',
      icon: 'books',
      description: 'Digital library and resources',
      descriptionFi: 'Digitaalinen kirjasto ja resurssit',
      category: 'education',
      appType: 'component',
      componentName: 'LibraryApp',
      width: 1000,
      height: 700,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 15,
    },
    {
      appId: 'quiz-maker',
      name: 'Quiz Maker',
      nameFi: 'Tietovisatyökalu',
      icon: 'books',
      description: 'Create and take quizzes',
      descriptionFi: 'Luo ja tee tietovisoja',
      category: 'education',
      appType: 'component',
      componentName: 'QuizMakerApp',
      width: 800,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 16,
    },

    // ============================================
    // ENTERTAINMENT APPS
    // ============================================
    {
      appId: 'games',
      name: 'Games',
      nameFi: 'Pelit',
      icon: 'games',
      description: 'Educational games',
      descriptionFi: 'Opetuspelit',
      category: 'entertainment',
      appType: 'component',
      componentName: 'GamesApp',
      width: 800,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 17,
    },
    {
      appId: 'video-player',
      name: 'Video Player',
      nameFi: 'Videosoitin',
      icon: 'video',
      description: 'Watch educational videos',
      descriptionFi: 'Katso opetusvideoita',
      category: 'entertainment',
      appType: 'component',
      componentName: 'VideoPlayerApp',
      width: 900,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 18,
    },

    // ============================================
    // UTILITY APPS
    // ============================================
    {
      appId: 'file-manager',
      name: 'File Manager',
      nameFi: 'Tiedostonhallinta',
      icon: 'notepad',
      description: 'Browse and manage files',
      descriptionFi: 'Selaa ja hallitse tiedostoja',
      category: 'utility',
      appType: 'component',
      componentName: 'FileManagerApp',
      width: 900,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 19,
    },
    {
      appId: 'settings',
      name: 'Settings',
      nameFi: 'Asetukset',
      icon: 'settings',
      description: 'Configure desktop settings',
      descriptionFi: 'Muokkaa työpöydän asetuksia',
      category: 'utility',
      appType: 'component',
      componentName: 'SettingsApp',
      width: 700,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: false,
      isActive: true,
      isPinned: false,
      order: 20,
    },
    {
      appId: 'browser',
      name: 'Browser',
      nameFi: 'Selain',
      icon: 'globe',
      description: 'Web browser',
      descriptionFi: 'Verkkoselain',
      category: 'utility',
      appType: 'component',
      componentName: 'BrowserApp',
      width: 1200,
      height: 800,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 21,
    },
    {
      appId: 'weather',
      name: 'Weather',
      nameFi: 'Sää',
      icon: 'globe',
      description: 'Weather forecast',
      descriptionFi: 'Sääennuste',
      category: 'utility',
      appType: 'component',
      componentName: 'WeatherApp',
      width: 400,
      height: 500,
      resizable: true,
      minimizable: true,
      maximizable: false,
      isActive: true,
      isPinned: false,
      order: 22,
    },

    // ============================================
    // WILMA INTEGRATION APPS
    // ============================================
    {
      appId: 'wilma-grades',
      name: 'Grades',
      nameFi: 'Arvosanat',
      icon: 'books',
      description: 'View your grades',
      descriptionFi: 'Katso arvosanasi',
      category: 'wilma',
      appType: 'iframe',
      appUrl: '/wilma/:userId?tab=grades',
      width: 900,
      height: 700,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 23,
    },
    {
      appId: 'wilma-schedule',
      name: 'Schedule',
      nameFi: 'Lukujärjestys',
      icon: 'calendar',
      description: 'View your schedule',
      descriptionFi: 'Katso lukujärjestyksesi',
      category: 'wilma',
      appType: 'iframe',
      appUrl: '/wilma/:userId?tab=schedule',
      width: 1000,
      height: 700,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: true,
      order: 24,
    },
    {
      appId: 'wilma-assignments',
      name: 'Assignments',
      nameFi: 'Tehtävät',
      icon: 'notepad',
      description: 'View your assignments',
      descriptionFi: 'Katso tehtäväsi',
      category: 'wilma',
      appType: 'iframe',
      appUrl: '/wilma/:userId?tab=assignments',
      width: 900,
      height: 700,
      resizable: true,
      minimizable: true,
      maximizable: true,
      isActive: true,
      isPinned: false,
      order: 25,
    },
  ];

  console.log(`📱 Creating ${apps.length} desktop apps...`);

  const batch = db.batch();
  let count = 0;

  for (const app of apps) {
    const docRef = db.collection('desktopApps').doc(app.appId);
    batch.set(docRef, {
      ...app,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    count++;
    console.log(`✅ ${count}/${apps.length} - ${app.nameFi} (${app.appId})`);
  }

  await batch.commit();

  console.log('✅ ========== DESKTOP APPS SEEDED SUCCESSFULLY ==========');
  console.log(`📊 Total apps created: ${apps.length}`);
  console.log(`📂 Categories: ${[...new Set(apps.map(a => a.category))].join(', ')}`);
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule || process.argv[1].includes('seedDesktopApps')) {
  seedDesktopApps()
    .then(() => {
      console.log('✅ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
