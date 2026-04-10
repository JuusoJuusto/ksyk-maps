import { firebaseStorage } from './firebaseStorage';

async function createTestWilmaUser() {
  try {
    console.log('🧪 Creating test Wilma user...');
    
    const testUser = {
      username: 'test.student',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@example.com',
      role: 'student',
      studentClass: '9A',
      isActive: true
    };
    
    console.log('📝 User data:', testUser);
    
    const createdUser = await firebaseStorage.createWilmaUser(testUser);
    
    console.log('✅ User created successfully!');
    console.log('User ID:', createdUser.id);
    console.log('Username:', createdUser.username);
    
    // Test fetching users
    console.log('\n🔍 Fetching all Wilma users...');
    const allUsers = await firebaseStorage.getWilmaUsers();
    console.log(`Found ${allUsers.length} users:`, allUsers);
    
    // Test login
    console.log('\n🔐 Testing login...');
    const loginUser = await firebaseStorage.getWilmaUserByUsername('test.student');
    if (loginUser && loginUser.password === 'password123') {
      console.log('✅ Login test successful!');
    } else {
      console.log('❌ Login test failed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestWilmaUser();
