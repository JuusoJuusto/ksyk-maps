// Delete duplicate "juuso test" account
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteDuplicate() {
  console.log('🔍 Finding duplicate account...');
  
  const snapshot = await db.collection('users')
    .where('email', '==', 'JuusoJuusto112@gmail.com')
    .get();
  
  console.log(`Found ${snapshot.size} accounts with this email`);
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`\nAccount: ${doc.id}`);
    console.log(`  Name: ${data.firstName} ${data.lastName}`);
    console.log(`  Email: ${data.email}`);
    
    // Delete the "juuso test" account (not Juuso Kaikula)
    if (data.firstName === 'juuso' && data.lastName === 'test') {
      console.log(`\n🗑️ Deleting duplicate account: ${doc.id}`);
      await db.collection('users').doc(doc.id).delete();
      console.log('✅ Deleted!');
    } else if (data.firstName === 'Juuso' && data.lastName === 'Kaikula') {
      console.log('✅ Keeping owner account');
    }
  }
  
  console.log('\n🎉 Done!');
  process.exit(0);
}

deleteDuplicate().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
