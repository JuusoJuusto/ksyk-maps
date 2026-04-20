import { firebaseStorage } from './firebaseStorage';

async function cleanWilmaData() {
  console.log('🧹 Cleaning all Wilma data except admin account...\n');

  try {
    // Get all Wilma users
    const allUsers = await firebaseStorage.getWilmaUsers();
    console.log(`Found ${allUsers.length} Wilma users`);

    // Delete all users except admin
    let deleted = 0;
    for (const user of allUsers) {
      // Keep only the admin account (juusojuusto112@gmail.com)
      if (user.email !== 'juusojuusto112@gmail.com' && user.username !== 'juuso.kaikula') {
        await firebaseStorage.deleteWilmaUser(user.id);
        console.log(`✅ Deleted: ${user.username} (${user.role})`);
        deleted++;
      } else {
        console.log(`⏭️  Keeping admin: ${user.username}`);
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deleted} users, kept admin account.`);
    
  } catch (error) {
    console.error('❌ Error cleaning Wilma data:', error);
    throw error;
  }
}

// Run the cleanup
cleanWilmaData()
  .then(() => {
    console.log('\n🎉 Cleanup successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });
