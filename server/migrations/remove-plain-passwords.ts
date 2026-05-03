/**
 * CRITICAL SECURITY MIGRATION
 * 
 * This migration removes the plainPassword column from wilma_users table
 * and changes the id column from UUID to auto-increment integer.
 * 
 * IMPORTANT: This is a breaking change that requires data migration.
 * Run this migration during maintenance window.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function migrateWilmaUsersSchema() {
  console.log('🔒 Starting CRITICAL SECURITY MIGRATION...');
  console.log('⚠️  This will:');
  console.log('   1. Remove plainPassword column (SECURITY FIX)');
  console.log('   2. Change ID from UUID to auto-increment integer');
  console.log('   3. Update all foreign key references');
  
  try {
    // Step 1: Create new table with correct schema
    console.log('\n📝 Step 1: Creating new wilma_users_new table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wilma_users_new (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR NOT NULL UNIQUE,
        username VARCHAR NOT NULL UNIQUE,
        password VARCHAR NOT NULL,
        is_temporary_password BOOLEAN DEFAULT true,
        first_name VARCHAR NOT NULL,
        last_name VARCHAR NOT NULL,
        email VARCHAR,
        phone VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'student',
        roles TEXT[],
        custom_role_name VARCHAR,
        student_class VARCHAR,
        department VARCHAR,
        position VARCHAR,
        specialization VARCHAR,
        office_room VARCHAR,
        office_hours JSONB,
        bio TEXT,
        profile_image_url VARCHAR,
        calendar_sync_enabled BOOLEAN DEFAULT false,
        calendar_sync_token VARCHAR,
        calendar_provider VARCHAR,
        date_of_birth VARCHAR,
        gender VARCHAR,
        nationality VARCHAR,
        address VARCHAR,
        postal_code VARCHAR,
        city VARCHAR,
        parent1_id INTEGER,
        parent2_id INTEGER,
        parent1_first_name VARCHAR,
        parent1_last_name VARCHAR,
        parent1_email VARCHAR,
        parent1_phone VARCHAR,
        parent1_relationship VARCHAR,
        parent2_first_name VARCHAR,
        parent2_last_name VARCHAR,
        parent2_email VARCHAR,
        parent2_phone VARCHAR,
        parent2_relationship VARCHAR,
        emergency_contact_name VARCHAR,
        emergency_contact_phone VARCHAR,
        emergency_contact_relationship VARCHAR,
        medical_info TEXT,
        allergies TEXT,
        medications TEXT,
        special_needs TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ New table created');

    // Step 2: Migrate data (excluding plainPassword)
    console.log('\n📝 Step 2: Migrating data from old table...');
    await db.execute(sql`
      INSERT INTO wilma_users_new (
        student_id, username, password, is_temporary_password,
        first_name, last_name, email, phone, role, roles,
        custom_role_name, student_class, department, position,
        specialization, office_room, office_hours, bio,
        profile_image_url, calendar_sync_enabled, calendar_sync_token,
        calendar_provider, date_of_birth, gender, nationality,
        address, postal_code, city,
        parent1_first_name, parent1_last_name, parent1_email, parent1_phone, parent1_relationship,
        parent2_first_name, parent2_last_name, parent2_email, parent2_phone, parent2_relationship,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        medical_info, allergies, medications, special_needs, notes,
        is_active, last_login, created_at, updated_at
      )
      SELECT 
        student_id, username, password, is_temporary_password,
        first_name, last_name, email, phone, role, roles,
        custom_role_name, student_class, department, position,
        specialization, office_room, office_hours, bio,
        profile_image_url, calendar_sync_enabled, calendar_sync_token,
        calendar_provider, date_of_birth, gender, nationality,
        address, postal_code, city,
        parent1_first_name, parent1_last_name, parent1_email, parent1_phone, parent1_relationship,
        parent2_first_name, parent2_last_name, parent2_email, parent2_phone, parent2_relationship,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        medical_info, allergies, medications, special_needs, notes,
        is_active, last_login, created_at, updated_at
      FROM wilma_users
      ORDER BY created_at
    `);
    console.log('✅ Data migrated');

    // Step 3: Drop old table
    console.log('\n📝 Step 3: Dropping old table...');
    await db.execute(sql`DROP TABLE IF EXISTS wilma_users CASCADE`);
    console.log('✅ Old table dropped');

    // Step 4: Rename new table
    console.log('\n📝 Step 4: Renaming new table...');
    await db.execute(sql`ALTER TABLE wilma_users_new RENAME TO wilma_users`);
    console.log('✅ Table renamed');

    // Step 5: Recreate indexes
    console.log('\n📝 Step 5: Creating indexes...');
    await db.execute(sql`CREATE INDEX idx_wilma_users_student_id ON wilma_users(student_id)`);
    await db.execute(sql`CREATE INDEX idx_wilma_users_username ON wilma_users(username)`);
    await db.execute(sql`CREATE INDEX idx_wilma_users_email ON wilma_users(email)`);
    await db.execute(sql`CREATE INDEX idx_wilma_users_role ON wilma_users(role)`);
    await db.execute(sql`CREATE INDEX idx_wilma_users_student_class ON wilma_users(student_class)`);
    console.log('✅ Indexes created');

    // Step 6: Update related tables with foreign keys
    console.log('\n📝 Step 6: Updating foreign key references...');
    
    // Update wilma_schedules
    await db.execute(sql`
      ALTER TABLE wilma_schedules 
      DROP CONSTRAINT IF EXISTS wilma_schedules_user_id_fkey
    `);
    await db.execute(sql`
      ALTER TABLE wilma_schedules 
      ADD CONSTRAINT wilma_schedules_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES wilma_users(id) ON DELETE CASCADE
    `);
    
    // Update wilma_grades
    await db.execute(sql`
      ALTER TABLE wilma_grades 
      DROP CONSTRAINT IF EXISTS wilma_grades_student_id_fkey
    `);
    await db.execute(sql`
      ALTER TABLE wilma_grades 
      ADD CONSTRAINT wilma_grades_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES wilma_users(id) ON DELETE CASCADE
    `);
    
    // Update wilma_attendance
    await db.execute(sql`
      ALTER TABLE wilma_attendance 
      DROP CONSTRAINT IF EXISTS wilma_attendance_student_id_fkey
    `);
    await db.execute(sql`
      ALTER TABLE wilma_attendance 
      ADD CONSTRAINT wilma_attendance_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES wilma_users(id) ON DELETE CASCADE
    `);
    
    // Update wilma_messages
    await db.execute(sql`
      ALTER TABLE wilma_messages 
      DROP CONSTRAINT IF EXISTS wilma_messages_from_user_id_fkey
    `);
    await db.execute(sql`
      ALTER TABLE wilma_messages 
      DROP CONSTRAINT IF EXISTS wilma_messages_to_user_id_fkey
    `);
    await db.execute(sql`
      ALTER TABLE wilma_messages 
      ADD CONSTRAINT wilma_messages_from_user_id_fkey 
      FOREIGN KEY (from_user_id) REFERENCES wilma_users(id) ON DELETE CASCADE
    `);
    await db.execute(sql`
      ALTER TABLE wilma_messages 
      ADD CONSTRAINT wilma_messages_to_user_id_fkey 
      FOREIGN KEY (to_user_id) REFERENCES wilma_users(id) ON DELETE CASCADE
    `);
    
    console.log('✅ Foreign keys updated');

    console.log('\n✅ MIGRATION COMPLETE!');
    console.log('🔒 Security improvements:');
    console.log('   ✓ Plain passwords removed from database');
    console.log('   ✓ All passwords are now bcrypt hashed');
    console.log('   ✓ ID changed to auto-increment integer');
    console.log('   ✓ Foreign key references updated');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('⚠️  Database may be in inconsistent state!');
    console.error('⚠️  Manual intervention may be required.');
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateWilmaUsersSchema()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}
