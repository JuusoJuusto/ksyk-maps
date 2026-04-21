import { FirebaseStorage } from './firebaseStorage';

const storage = new FirebaseStorage();

// Class definitions with proper structure
const CLASSES = [
  { name: '7A', grade: 7, homeroom: 'A101', homeroomTeacher: 'Matti Virtanen', studentCount: 0 },
  { name: '7B', grade: 7, homeroom: 'A102', homeroomTeacher: 'Anna Korhonen', studentCount: 0 },
  { name: '8A', grade: 8, homeroom: 'B201', homeroomTeacher: 'Pekka Nieminen', studentCount: 0 },
  { name: '8B', grade: 8, homeroom: 'B202', homeroomTeacher: 'Laura Mäkinen', studentCount: 0 },
  { name: '9A', grade: 9, homeroom: 'C301', homeroomTeacher: 'Kari Virtanen', studentCount: 0 },
  { name: '9B', grade: 9, homeroom: 'C302', homeroomTeacher: 'Sanna Lahtinen', studentCount: 0 },
];

// Student data with proper parent info
const STUDENTS = [
  // 7A Students
  {
    firstName: 'Mikko', lastName: 'Virtanen', class: '7A', grade: 7,
    dateOfBirth: '2012-03-15', email: 'mikko.virtanen@ksyk.fi',
    parent1: { firstName: 'Matti', lastName: 'Virtanen', email: 'matti.virtanen@email.com', phone: '+358401234567', relationship: 'Isä' },
    parent2: { firstName: 'Anna', lastName: 'Virtanen', email: 'anna.virtanen@email.com', phone: '+358401234568', relationship: 'Äiti' }
  },
  {
    firstName: 'Emma', lastName: 'Korhonen', class: '7A', grade: 7,
    dateOfBirth: '2012-05-20', email: 'emma.korhonen@ksyk.fi',
    parent1: { firstName: 'Pekka', lastName: 'Korhonen', email: 'pekka.korhonen@email.com', phone: '+358401234569', relationship: 'Isä' },
    parent2: { firstName: 'Laura', lastName: 'Korhonen', email: 'laura.korhonen@email.com', phone: '+358401234570', relationship: 'Äiti' }
  },
  {
    firstName: 'Ville', lastName: 'Nieminen', class: '7A', grade: 7,
    dateOfBirth: '2012-08-10', email: 'ville.nieminen@ksyk.fi',
    parent1: { firstName: 'Kari', lastName: 'Nieminen', email: 'kari.nieminen@email.com', phone: '+358401234571', relationship: 'Isä' },
    parent2: { firstName: 'Sanna', lastName: 'Nieminen', email: 'sanna.nieminen@email.com', phone: '+358401234572', relationship: 'Äiti' }
  },
  
  // 7B Students
  {
    firstName: 'Sofia', lastName: 'Mäkinen', class: '7B', grade: 7,
    dateOfBirth: '2012-01-25', email: 'sofia.makinen@ksyk.fi',
    parent1: { firstName: 'Juha', lastName: 'Mäkinen', email: 'juha.makinen@email.com', phone: '+358401234573', relationship: 'Isä' },
    parent2: { firstName: 'Marja', lastName: 'Mäkinen', email: 'marja.makinen@email.com', phone: '+358401234574', relationship: 'Äiti' }
  },
  {
    firstName: 'Aino', lastName: 'Lahtinen', class: '7B', grade: 7,
    dateOfBirth: '2012-11-30', email: 'aino.lahtinen@ksyk.fi',
    parent1: { firstName: 'Timo', lastName: 'Lahtinen', email: 'timo.lahtinen@email.com', phone: '+358401234575', relationship: 'Isä' },
    parent2: { firstName: 'Kaisa', lastName: 'Lahtinen', email: 'kaisa.lahtinen@email.com', phone: '+358401234576', relationship: 'Äiti' }
  },

  // 8A Students
  {
    firstName: 'Eetu', lastName: 'Salo', class: '8A', grade: 8,
    dateOfBirth: '2011-04-12', email: 'eetu.salo@ksyk.fi',
    parent1: { firstName: 'Mikko', lastName: 'Salo', email: 'mikko.salo@email.com', phone: '+358401234577', relationship: 'Isä' },
    parent2: { firstName: 'Liisa', lastName: 'Salo', email: 'liisa.salo@email.com', phone: '+358401234578', relationship: 'Äiti' }
  },
  {
    firstName: 'Olivia', lastName: 'Rantanen', class: '8A', grade: 8,
    dateOfBirth: '2011-07-18', email: 'olivia.rantanen@ksyk.fi',
    parent1: { firstName: 'Jari', lastName: 'Rantanen', email: 'jari.rantanen@email.com', phone: '+358401234579', relationship: 'Isä' },
    parent2: { firstName: 'Hanna', lastName: 'Rantanen', email: 'hanna.rantanen@email.com', phone: '+358401234580', relationship: 'Äiti' }
  },

  // 8B Students
  {
    firstName: 'Onni', lastName: 'Heikkinen', class: '8B', grade: 8,
    dateOfBirth: '2011-02-28', email: 'onni.heikkinen@ksyk.fi',
    parent1: { firstName: 'Antti', lastName: 'Heikkinen', email: 'antti.heikkinen@email.com', phone: '+358401234581', relationship: 'Isä' },
    parent2: { firstName: 'Päivi', lastName: 'Heikkinen', email: 'paivi.heikkinen@email.com', phone: '+358401234582', relationship: 'Äiti' }
  },
  {
    firstName: 'Helmi', lastName: 'Koskinen', class: '8B', grade: 8,
    dateOfBirth: '2011-09-05', email: 'helmi.koskinen@ksyk.fi',
    parent1: { firstName: 'Petri', lastName: 'Koskinen', email: 'petri.koskinen@email.com', phone: '+358401234583', relationship: 'Isä' },
    parent2: { firstName: 'Riitta', lastName: 'Koskinen', email: 'riitta.koskinen@email.com', phone: '+358401234584', relationship: 'Äiti' }
  },

  // 9A Students
  {
    firstName: 'Leevi', lastName: 'Järvinen', class: '9A', grade: 9,
    dateOfBirth: '2010-06-14', email: 'leevi.jarvinen@ksyk.fi',
    parent1: { firstName: 'Markku', lastName: 'Järvinen', email: 'markku.jarvinen@email.com', phone: '+358401234585', relationship: 'Isä' },
    parent2: { firstName: 'Tuula', lastName: 'Järvinen', email: 'tuula.jarvinen@email.com', phone: '+358401234586', relationship: 'Äiti' }
  },
  {
    firstName: 'Isla', lastName: 'Laine', class: '9A', grade: 9,
    dateOfBirth: '2010-10-22', email: 'isla.laine@ksyk.fi',
    parent1: { firstName: 'Seppo', lastName: 'Laine', email: 'seppo.laine@email.com', phone: '+358401234587', relationship: 'Isä' },
    parent2: { firstName: 'Merja', lastName: 'Laine', email: 'merja.laine@email.com', phone: '+358401234588', relationship: 'Äiti' }
  },

  // 9B Students
  {
    firstName: 'Elias', lastName: 'Tuominen', class: '9B', grade: 9,
    dateOfBirth: '2010-03-08', email: 'elias.tuominen@ksyk.fi',
    parent1: { firstName: 'Jukka', lastName: 'Tuominen', email: 'jukka.tuominen@email.com', phone: '+358401234589', relationship: 'Isä' },
    parent2: { firstName: 'Sari', lastName: 'Tuominen', email: 'sari.tuominen@email.com', phone: '+358401234590', relationship: 'Äiti' }
  },
  {
    firstName: 'Venla', lastName: 'Hämäläinen', class: '9B', grade: 9,
    dateOfBirth: '2010-12-19', email: 'venla.hamalainen@ksyk.fi',
    parent1: { firstName: 'Hannu', lastName: 'Hämäläinen', email: 'hannu.hamalainen@email.com', phone: '+358401234591', relationship: 'Isä' },
    parent2: { firstName: 'Kirsi', lastName: 'Hämäläinen', email: 'kirsi.hamalainen@email.com', phone: '+358401234592', relationship: 'Äiti' }
  },
];

// Teachers
const TEACHERS = [
  { firstName: 'Matti', lastName: 'Virtanen', email: 'matti.virtanen@ksyk.fi', subject: 'Matematiikka' },
  { firstName: 'Anna', lastName: 'Korhonen', email: 'anna.korhonen@ksyk.fi', subject: 'Englanti' },
  { firstName: 'Pekka', lastName: 'Nieminen', email: 'pekka.nieminen@ksyk.fi', subject: 'Fysiikka' },
  { firstName: 'Laura', lastName: 'Mäkinen', email: 'laura.makinen@ksyk.fi', subject: 'Historia' },
  { firstName: 'Kari', lastName: 'Virtanen', email: 'kari.virtanen@ksyk.fi', subject: 'Kemia' },
  { firstName: 'Sanna', lastName: 'Lahtinen', email: 'sanna.lahtinen@ksyk.fi', subject: 'Biologia' },
];

async function cleanAllWilmaData() {
  console.log('\n🗑️  ========== CLEANING ALL WILMA DATA ==========\n');
  
  try {
    // Get all students
    const students = await storage.getWilmaUsers('student');
    console.log(`📊 Found ${students.length} students to delete`);
    
    for (const student of students) {
      await storage.deleteWilmaUser(student.id);
      console.log(`  ✅ Deleted student: ${student.firstName} ${student.lastName}`);
    }
    
    // Get all parents
    const parents = await storage.getWilmaUsers('parent');
    console.log(`\n📊 Found ${parents.length} parents to delete`);
    
    for (const parent of parents) {
      await storage.deleteWilmaUser(parent.id);
      console.log(`  ✅ Deleted parent: ${parent.firstName} ${parent.lastName}`);
    }
    
    // Get all teachers
    const teachers = await storage.getWilmaUsers('teacher');
    console.log(`\n📊 Found ${teachers.length} teachers to delete`);
    
    for (const teacher of teachers) {
      await storage.deleteWilmaUser(teacher.id);
      console.log(`  ✅ Deleted teacher: ${teacher.firstName} ${teacher.lastName}`);
    }
    
    // Get all classes
    const classes = await storage.getWilmaClasses();
    console.log(`\n📊 Found ${classes.length} classes to delete`);
    
    for (const cls of classes) {
      await storage.deleteWilmaClass(cls.id);
      console.log(`  ✅ Deleted class: ${cls.name}`);
    }
    
    console.log('\n✅ All Wilma data cleaned successfully!\n');
  } catch (error) {
    console.error('❌ Error cleaning data:', error);
    throw error;
  }
}

async function createClasses() {
  console.log('\n📚 ========== CREATING CLASSES ==========\n');
  
  const createdClasses: any[] = [];
  
  for (const classData of CLASSES) {
    try {
      const created = await storage.createWilmaClass({
        ...classData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      createdClasses.push(created);
      console.log(`✅ Created class: ${created.name} (${created.homeroomTeacher})`);
    } catch (error) {
      console.error(`❌ Failed to create class ${classData.name}:`, error);
    }
  }
  
  return createdClasses;
}

async function createTeachers() {
  console.log('\n👨‍🏫 ========== CREATING TEACHERS ==========\n');
  
  const createdTeachers: any[] = [];
  
  for (const teacher of TEACHERS) {
    try {
      const username = `${teacher.firstName.toLowerCase()}.${teacher.lastName.toLowerCase()}`;
      const created = await storage.createWilmaUser({
        ...teacher,
        username,
        password: 'teacher123',
        role: 'teacher',
        isActive: true,
        canLoginToKsykMaps: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      createdTeachers.push(created);
      console.log(`✅ Created teacher: ${created.firstName} ${created.lastName} (${created.subject})`);
    } catch (error) {
      console.error(`❌ Failed to create teacher ${teacher.firstName} ${teacher.lastName}:`, error);
    }
  }
  
  return createdTeachers;
}

async function createStudentsAndParents() {
  console.log('\n👨‍🎓 ========== CREATING STUDENTS AND PARENTS ==========\n');
  
  const createdStudents: any[] = [];
  const createdParents: any[] = [];
  
  for (const studentData of STUDENTS) {
    try {
      // Create parent 1
      let parent1Id = null;
      if (studentData.parent1) {
        const parent1Username = `${studentData.parent1.firstName.toLowerCase()}.${studentData.parent1.lastName.toLowerCase()}`;
        const parent1 = await storage.createWilmaUser({
          firstName: studentData.parent1.firstName,
          lastName: studentData.parent1.lastName,
          email: studentData.parent1.email,
          phone: studentData.parent1.phone,
          username: parent1Username,
          password: 'parent123',
          role: 'parent',
          isActive: true,
          canLoginToKsykMaps: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        parent1Id = parent1.id;
        createdParents.push(parent1);
        console.log(`  ✅ Created parent: ${parent1.firstName} ${parent1.lastName}`);
      }
      
      // Create parent 2
      let parent2Id = null;
      if (studentData.parent2) {
        const parent2Username = `${studentData.parent2.firstName.toLowerCase()}.${studentData.parent2.lastName.toLowerCase()}`;
        const parent2 = await storage.createWilmaUser({
          firstName: studentData.parent2.firstName,
          lastName: studentData.parent2.lastName,
          email: studentData.parent2.email,
          phone: studentData.parent2.phone,
          username: parent2Username,
          password: 'parent123',
          role: 'parent',
          isActive: true,
          canLoginToKsykMaps: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        parent2Id = parent2.id;
        createdParents.push(parent2);
        console.log(`  ✅ Created parent: ${parent2.firstName} ${parent2.lastName}`);
      }
      
      // Create student
      const studentUsername = `${studentData.firstName.toLowerCase()}.${studentData.lastName.toLowerCase()}`;
      const studentId = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-6);
      
      const student = await storage.createWilmaUser({
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        username: studentUsername,
        password: 'student123',
        role: 'student',
        studentClass: studentData.class,
        studentId: studentId,
        grade: studentData.grade,
        dateOfBirth: studentData.dateOfBirth,
        parent1Id: parent1Id,
        parent2Id: parent2Id,
        parent1FirstName: studentData.parent1?.firstName,
        parent1LastName: studentData.parent1?.lastName,
        parent1Email: studentData.parent1?.email,
        parent1Phone: studentData.parent1?.phone,
        parent1Relationship: studentData.parent1?.relationship,
        parent2FirstName: studentData.parent2?.firstName,
        parent2LastName: studentData.parent2?.lastName,
        parent2Email: studentData.parent2?.email,
        parent2Phone: studentData.parent2?.phone,
        parent2Relationship: studentData.parent2?.relationship,
        isActive: true,
        canLoginToKsykMaps: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      createdStudents.push(student);
      console.log(`✅ Created student: ${student.firstName} ${student.lastName} (${student.studentClass}) - ID: ${student.studentId}`);
      
    } catch (error) {
      console.error(`❌ Failed to create student ${studentData.firstName} ${studentData.lastName}:`, error);
    }
  }
  
  return { students: createdStudents, parents: createdParents };
}

async function updateClassStudentCounts(students: any[]) {
  console.log('\n📊 ========== UPDATING CLASS STUDENT COUNTS ==========\n');
  
  const classCounts: { [key: string]: number } = {};
  
  // Count students per class
  for (const student of students) {
    const className = student.studentClass;
    classCounts[className] = (classCounts[className] || 0) + 1;
  }
  
  // Update each class
  const classes = await storage.getWilmaClasses();
  for (const cls of classes) {
    const count = classCounts[cls.name] || 0;
    await storage.updateWilmaClass(cls.id, { studentCount: count });
    console.log(`✅ Updated ${cls.name}: ${count} students`);
  }
}

async function main() {
  console.log('\n🚀 ========== WILMA DATA RECREATION SCRIPT ==========\n');
  console.log('This script will:');
  console.log('1. Delete ALL existing Wilma data (students, parents, teachers, classes)');
  console.log('2. Create 6 classes (7A, 7B, 8A, 8B, 9A, 9B)');
  console.log('3. Create 6 teachers');
  console.log('4. Create 12 students with 24 parents');
  console.log('5. Link students to classes and parents\n');
  
  try {
    // Step 1: Clean all data
    await cleanAllWilmaData();
    
    // Step 2: Create classes
    await createClasses();
    
    // Step 3: Create teachers
    await createTeachers();
    
    // Step 4: Create students and parents
    const { students, parents } = await createStudentsAndParents();
    
    // Step 5: Update class student counts
    await updateClassStudentCounts(students);
    
    console.log('\n✅ ========== DATA RECREATION COMPLETE ==========\n');
    console.log(`📊 Summary:`);
    console.log(`   - Classes: 6`);
    console.log(`   - Teachers: 6`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Parents: ${parents.length}`);
    console.log(`\n🔑 Login Credentials:`);
    console.log(`   - Students: username = firstname.lastname, password = student123`);
    console.log(`   - Parents: username = firstname.lastname, password = parent123`);
    console.log(`   - Teachers: username = firstname.lastname, password = teacher123`);
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
