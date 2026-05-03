#!/usr/bin/env node

/**
 * Security Migration Runner
 * 
 * This script runs the critical security migration to:
 * 1. Remove plainPassword column
 * 2. Change ID from UUID to integer
 * 3. Update all foreign keys
 */

console.log('🔒 CRITICAL SECURITY MIGRATION');
console.log('================================\n');

console.log('⚠️  WARNING: This is a breaking change!');
console.log('⚠️  Make sure you have a database backup before proceeding.\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Do you have a database backup? (yes/no): ', async (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Migration cancelled. Please backup your database first.');
    console.log('Run: pg_dump -d ksyk_maps > backup_$(date +%Y%m%d_%H%M%S).sql');
    rl.close();
    process.exit(1);
  }

  rl.question('\nAre you sure you want to proceed? (yes/no): ', async (confirm) => {
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Migration cancelled.');
      rl.close();
      process.exit(1);
    }

    console.log('\n🚀 Starting migration...\n');
    rl.close();

    try {
      // Import and run migration
      const { migrateWilmaUsersSchema } = require('../server/migrations/remove-plain-passwords.ts');
      await migrateWilmaUsersSchema();
      
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Test login functionality');
      console.log('2. Test password change');
      console.log('3. Test email invitations');
      console.log('4. Deploy updated code');
      
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      console.error('\n⚠️  Database may be in inconsistent state!');
      console.error('⚠️  Restore from backup: pg_restore -d ksyk_maps backup.sql');
      process.exit(1);
    }
  });
});
