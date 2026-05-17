import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔍 Verifying Prisma connection...\n');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    // Count users
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);

    // Get first user
    const firstUser = await prisma.user.findFirst({
      include: {
        profile: true,
        xp: true,
        streaks: true,
      },
    });

    if (firstUser) {
      console.log(`\n👤 Sample User:`);
      console.log(`   Name: ${firstUser.name}`);
      console.log(`   Email: ${firstUser.email}`);
      console.log(`   Role: ${firstUser.role}`);
      console.log(`   Subscription: ${firstUser.subscriptionTier}`);
      
      if (firstUser.xp) {
        console.log(`   Total XP: ${firstUser.xp.totalXP}`);
        console.log(`   Level: ${firstUser.xp.level}`);
      }
      
      if (firstUser.streaks) {
        console.log(`   Current Streak: ${firstUser.streaks.currentStreak} days`);
      }
    }

    // Count tasks
    const taskCount = await prisma.task.count();
    console.log(`\n📝 Tasks in database: ${taskCount}`);

    // Count achievements
    const achievementCount = await prisma.achievement.count();
    console.log(`🏆 Achievements in database: ${achievementCount}`);

    // Count classrooms
    const classroomCount = await prisma.classroom.count();
    console.log(`🏫 Classrooms in database: ${classroomCount}`);

    // Count conversations
    const conversationCount = await prisma.conversation.count();
    console.log(`💬 Conversations in database: ${conversationCount}`);

    console.log('\n✅ All checks passed! Prisma is working correctly.');
    console.log('\n📚 Next steps:');
    console.log('   1. Run: npx prisma studio (to view data in browser)');
    console.log('   2. Import prisma from: src/lib/prisma.ts');
    console.log('   3. Start building your app!');
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
