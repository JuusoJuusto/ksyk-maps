import { firebaseStorage } from './firebaseStorage';

async function addStudentIdsToWilmaUsers() {
  try {
    console.log('🔄 Starting migration: Adding student IDs to existing Wilma users...');
    
    const users = await firebaseStorage.getWilmaUsers();
    console.log(`📊 Found ${users.length} Wilma users`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const user of users) {
      if (user.studentId) {
        console.log(`⏭️  User ${user.username} already has student ID: ${user.studentId}`);
        skipped++;
        continue;
      }
      
      // Generate unique 6-digit student ID
      const studentId = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log(`✏️  Updating ${user.username} with student ID: ${studentId}`);
      
      await firebaseStorage.updateWilmaUser(user.id, {
        ...user,
        studentId
      });
      
      updated++;
      console.log(`✅ Updated ${user.username}`);
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updated} users`);
    console.log(`   ⏭️  Skipped: ${skipped} users (already had student IDs)`);
    console.log(`   📊 Total: ${users.length} users`);
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
addStudentIdsToWilmaUsers()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
