import { db } from './firebaseStorage';

async function seedWilmaUsers() {
  console.log('🌱 Seeding Wilma users...');

  const demoUsers = [
    {
      username: 'teacher1',
      password: 'password123',
      firstName: 'Maria',
      lastName: 'Andersson',
      email: 'maria.andersson@brando.fi',
      role: 'teacher',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'student1',
      password: 'password123',
      firstName: 'Matti',
      lastName: 'Meikäläinen',
      email: 'matti.meikalainen@brando.fi',
      role: 'student',
      studentClass: '9A',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'parent1',
      password: 'password123',
      firstName: 'Liisa',
      lastName: 'Virtanen',
      email: 'liisa.virtanen@example.com',
      role: 'parent',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'admin1',
      password: 'password123',
      firstName: 'Pekka',
      lastName: 'Admin',
      email: 'pekka.admin@brando.fi',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  try {
    for (const user of demoUsers) {
      const docRef = db.collection('wilmaUsers').doc();
      await docRef.set({
        ...user,
        id: docRef.id,
      });
      console.log(`✅ Created Wilma user: ${user.username} (${user.role})`);
    }

    console.log('\n🎉 Wilma users seeded successfully!');
    console.log('\n📝 Demo Login Credentials:');
    console.log('Teacher: username=teacher1, password=password123');
    console.log('Student: username=student1, password=password123');
    console.log('Parent: username=parent1, password=password123');
    console.log('Admin: username=admin1, password=password123');
  } catch (error) {
    console.error('❌ Error seeding Wilma users:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedWilmaUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedWilmaUsers;
