import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase if not already initialized
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "ksyk-maps",
  });
}

const db = getFirestore();

async function addRebrandAnnouncement() {
  try {
    console.log('Adding rebrand announcement...');
    
    const announcement = {
      title: '🦉 We\'re Now StudiOWL!',
      titleEn: '🦉 We\'re Now StudiOWL!',
      titleFi: '🦉 Olemme Nyt StudiOWL!',
      content: 'OWL Apps has evolved! We\'re excited to announce our rebrand to StudiOWL. Same great team, same amazing apps, fresh new identity. All your favorite features remain unchanged!',
      contentEn: 'OWL Apps has evolved! We\'re excited to announce our rebrand to StudiOWL. Same great team, same amazing apps, fresh new identity. All your favorite features remain unchanged!',
      contentFi: 'OWL Apps on kehittynyt! Olemme innoissamme ilmoittaessamme uudelleenbrändäyksestämme StudiOWL:ksi. Sama loistava tiimi, samat upeat sovellukset, raikas uusi identiteetti. Kaikki suosikkitoimintosi pysyvät ennallaan!',
      type: 'info',
      priority: 'high',
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('announcements').add(announcement);
    console.log('✅ Rebrand announcement added with ID:', docRef.id);
    console.log('Announcement:', announcement);
    
  } catch (error) {
    console.error('❌ Error adding announcement:', error);
    throw error;
  }
}

addRebrandAnnouncement()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
