import { firebaseStorage } from './firebaseStorage';

// Generate random password
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate random 6-digit student ID
function generateStudentId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function seedWilmaData() {
  console.log('🌱 Starting Wilma data seeding...\n');

  try {
    // 1. Create Parents first
    console.log('👨‍👩‍👧‍👦 Creating parents...');
    const parents = [];
    
    const parentData = [
      { firstName: 'Matti', lastName: 'Virtanen', email: 'matti.virtanen@email.fi', phone: '+358 40 123 4567' },
      { firstName: 'Liisa', lastName: 'Virtanen', email: 'liisa.virtanen@email.fi', phone: '+358 40 123 4568' },
      { firstName: 'Pekka', lastName: 'Korhonen', email: 'pekka.korhonen@email.fi', phone: '+358 40 234 5678' },
      { firstName: 'Anna', lastName: 'Korhonen', email: 'anna.korhonen@email.fi', phone: '+358 40 234 5679' },
      { firstName: 'Juha', lastName: 'Mäkinen', email: 'juha.makinen@email.fi', phone: '+358 40 345 6789' },
      { firstName: 'Sari', lastName: 'Mäkinen', email: 'sari.makinen@email.fi', phone: '+358 40 345 6790' },
    ];

    for (const parent of parentData) {
      const password = generatePassword();
      const parentUser = await firebaseStorage.createWilmaUser({
        studentId: generateStudentId(),
        username: `${parent.firstName.toLowerCase()}.${parent.lastName.toLowerCase()}`,
        password,
        plainPassword: password,
        isTemporaryPassword: false,
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email,
        phone: parent.phone,
        role: 'parent',
        isActive: true,
      });
      parents.push(parentUser);
      console.log(`✅ Created parent: ${parent.firstName} ${parent.lastName} (${parentUser.studentId})`);
    }

    // 2. Create Teachers
    console.log('\n👨‍🏫 Creating teachers...');
    const teachers = [];
    
    const teacherData = [
      { firstName: 'Matti', lastName: 'Virtanen', subject: 'Matematiikka', email: 'matti.virtanen@school.fi' },
      { firstName: 'Anna', lastName: 'Korhonen', subject: 'Äidinkieli', email: 'anna.korhonen@school.fi' },
      { firstName: 'Pekka', lastName: 'Mäkinen', subject: 'Englanti', email: 'pekka.makinen@school.fi' },
      { firstName: 'Laura', lastName: 'Nieminen', subject: 'Historia', email: 'laura.nieminen@school.fi' },
      { firstName: 'Jari', lastName: 'Laine', subject: 'Fysiikka', email: 'jari.laine@school.fi' },
      { firstName: 'Sari', lastName: 'Salo', subject: 'Kemia', email: 'sari.salo@school.fi' },
    ];

    for (const teacher of teacherData) {
      const password = generatePassword();
      const teacherUser = await firebaseStorage.createWilmaUser({
        studentId: generateStudentId(),
        username: `${teacher.firstName.toLowerCase()}.${teacher.lastName.toLowerCase()}`,
        password,
        plainPassword: password,
        isTemporaryPassword: false,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: `+358 40 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'teacher',
        department: 'Academic',
        position: `${teacher.subject} Teacher`,
        officeRoom: `Room ${Math.floor(100 + Math.random() * 400)}`,
        isActive: true,
      });
      teachers.push(teacherUser);
      console.log(`✅ Created teacher: ${teacher.firstName} ${teacher.lastName} (${teacherUser.studentId})`);
    }

    // 3. Create Students with parent relationships
    console.log('\n👨‍🎓 Creating students...');
    const students = [];
    
    const studentData = [
      { firstName: 'Mikko', lastName: 'Virtanen', class: '9A', dateOfBirth: '2010-05-15', parent1: 0, parent2: 1 },
      { firstName: 'Emma', lastName: 'Korhonen', class: '9A', dateOfBirth: '2010-08-22', parent1: 2, parent2: 3 },
      { firstName: 'Ville', lastName: 'Mäkinen', class: '9B', dateOfBirth: '2010-03-10', parent1: 4, parent2: 5 },
      { firstName: 'Sofia', lastName: 'Virtanen', class: '8A', dateOfBirth: '2011-11-30', parent1: 0, parent2: 1 },
      { firstName: 'Oskari', lastName: 'Korhonen', class: '8B', dateOfBirth: '2011-07-18', parent1: 2, parent2: 3 },
    ];

    for (const student of studentData) {
      const password = generatePassword();
      const studentUser = await firebaseStorage.createWilmaUser({
        studentId: generateStudentId(),
        username: `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}`,
        password,
        plainPassword: password,
        isTemporaryPassword: false,
        firstName: student.firstName,
        lastName: student.lastName,
        email: `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@student.school.fi`,
        phone: `+358 45 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'student',
        studentClass: student.class,
        dateOfBirth: student.dateOfBirth,
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        nationality: 'Finnish',
        address: `Testikatu ${Math.floor(1 + Math.random() * 100)}`,
        postalCode: '00100',
        city: 'Helsinki',
        parent1Id: parents[student.parent1].id,
        parent2Id: parents[student.parent2].id,
        emergencyContactName: `${parents[student.parent1].firstName} ${parents[student.parent1].lastName}`,
        emergencyContactPhone: parents[student.parent1].phone,
        emergencyContactRelation: 'Parent',
        startYear: '2023',
        isActive: true,
      });
      students.push(studentUser);
      console.log(`✅ Created student: ${student.firstName} ${student.lastName} (${studentUser.studentId}) - Class ${student.class}`);
    }

    // 4. Create Schedules for students
    console.log('\n📅 Creating schedules...');
    const subjects = ['Matematiikka', 'Äidinkieli', 'Englanti', 'Historia', 'Fysiikka', 'Kemia'];
    const timeSlots = ['08:00-09:30', '09:45-11:15', '11:30-13:00', '13:15-14:45', '15:00-16:30'];
    
    for (const student of students) {
      for (let day = 1; day <= 5; day++) {
        const numClasses = Math.floor(3 + Math.random() * 3); // 3-5 classes per day
        for (let i = 0; i < numClasses; i++) {
          const subject = subjects[Math.floor(Math.random() * subjects.length)];
          const teacher = teachers.find(t => t.position?.includes(subject)) || teachers[0];
          
          await firebaseStorage.createWilmaSchedule({
            studentId: student.studentId,
            dayOfWeek: day,
            timeSlot: timeSlots[i],
            subject,
            room: `Luokka ${Math.floor(100 + Math.random() * 400)}`,
            teacherId: teacher.studentId,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            isActive: true,
          });
        }
      }
      console.log(`✅ Created schedule for ${student.firstName} ${student.lastName}`);
    }

    // 5. Create Grades
    console.log('\n📊 Creating grades...');
    for (const student of students) {
      for (const subject of subjects) {
        const teacher = teachers.find(t => t.position?.includes(subject)) || teachers[0];
        const grade = Math.floor(6 + Math.random() * 5).toString(); // Grades 6-10
        const trends = ['up', 'down', 'stable'];
        
        await firebaseStorage.createWilmaGrade({
          studentId: student.studentId,
          subject,
          grade,
          teacherId: teacher.studentId,
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          term: 'Spring 2026',
          comments: grade >= '9' ? 'Excellent work!' : grade >= '7' ? 'Good progress' : 'Needs improvement',
          trend: trends[Math.floor(Math.random() * trends.length)],
        });
      }
      console.log(`✅ Created grades for ${student.firstName} ${student.lastName}`);
    }

    // 6. Create Assignments
    console.log('\n📝 Creating assignments...');
    const assignmentTitles = [
      'Matematiikan kotitehtävät',
      'Englannin essee',
      'Historian tutkielma',
      'Fysiikan laboratoriotyö',
      'Kemian koe',
      'Äidinkielen kirjoitelma',
    ];

    for (const student of students) {
      for (let i = 0; i < 3; i++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const teacher = teachers.find(t => t.position?.includes(subject)) || teachers[0];
        const dueDate = new Date(2026, 3, 15 + i * 3).toISOString().split('T')[0];
        const statuses = ['pending', 'submitted', 'graded'];
        
        await firebaseStorage.createWilmaAssignment({
          studentId: student.studentId,
          title: assignmentTitles[Math.floor(Math.random() * assignmentTitles.length)],
          subject,
          description: 'Complete the assigned work and submit by the due date.',
          dueDate,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          grade: Math.random() > 0.5 ? Math.floor(6 + Math.random() * 5).toString() : undefined,
          teacherId: teacher.studentId,
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
        });
      }
      console.log(`✅ Created assignments for ${student.firstName} ${student.lastName}`);
    }

    // 7. Create Messages
    console.log('\n💬 Creating messages...');
    for (const student of students) {
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      
      await firebaseStorage.createWilmaMessage({
        fromUserId: teacher.id,
        fromUserName: `${teacher.firstName} ${teacher.lastName}`,
        toUserId: student.id,
        toUserName: `${student.firstName} ${student.lastName}`,
        subject: 'Kokeen tulokset',
        content: 'Hyvä työ viime kokeessa! Jatka samaan malliin.',
        isRead: Math.random() > 0.5,
      });
      
      console.log(`✅ Created message for ${student.firstName} ${student.lastName}`);
    }

    // 8. Create Attendance records
    console.log('\n📋 Creating attendance records...');
    for (const student of students) {
      for (let i = 0; i < 10; i++) {
        const date = new Date(2026, 3, 1 + i).toISOString().split('T')[0];
        const statuses = ['present', 'present', 'present', 'present', 'absent', 'late'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        await firebaseStorage.createWilmaAttendance({
          studentId: student.studentId,
          date,
          status,
          hours: status === 'present' ? 6 : status === 'late' ? 5 : 0,
          reason: status === 'absent' ? 'Sairaus' : undefined,
        });
      }
      console.log(`✅ Created attendance for ${student.firstName} ${student.lastName}`);
    }

    // 9. Create Exams
    console.log('\n📖 Creating exams...');
    for (const student of students) {
      for (let i = 0; i < 3; i++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const teacher = teachers.find(t => t.position?.includes(subject)) || teachers[0];
        const date = new Date(2026, 3, 15 + i * 5).toISOString().split('T')[0];
        
        await firebaseStorage.createWilmaExam({
          studentId: student.studentId,
          subject,
          date,
          time: '09:00-11:00',
          room: `Luokka ${Math.floor(100 + Math.random() * 400)}`,
          topics: `${subject} topics and concepts`,
          teacherId: teacher.studentId,
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
        });
      }
      console.log(`✅ Created exams for ${student.firstName} ${student.lastName}`);
    }

    console.log('\n✅ Wilma data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Parents: ${parents.length}`);
    console.log(`   - Teachers: ${teachers.length}`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Total users: ${parents.length + teachers.length + students.length}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('\nTeachers:');
    teachers.forEach(t => console.log(`   ${t.username} / ${t.plainPassword}`));
    console.log('\nStudents:');
    students.forEach(s => console.log(`   ${s.username} / ${s.plainPassword} (Class: ${s.studentClass})`));
    console.log('\nParents:');
    parents.forEach(p => console.log(`   ${p.username} / ${p.plainPassword}`));

  } catch (error) {
    console.error('❌ Error seeding Wilma data:', error);
    throw error;
  }
}

// Run the seed function
seedWilmaData()
  .then(() => {
    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
