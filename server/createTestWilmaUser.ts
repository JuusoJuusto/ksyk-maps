import { db } from './firebaseStorage';

async function createTestWilmaUser() {
  console.log('🔐 Creating test Wilma user...');

  const testUser = {
    username: 'test',
    password: 'test123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'student',
    studentClass: '9A',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const docRef = db.collection('wilmaUsers').doc();
    await docRef.set({
      ...testUser,
      id: docRef.id,
    });

    console.log('✅ Test Wilma user created successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('URL: http://localhost:5000/wilma');
    console.log('Username: test');
    console.log('Password: test123');
    console.log('\n🎯 You can now test the Wilma login!');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createTestWilmaUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default createTestWilmaUser;
