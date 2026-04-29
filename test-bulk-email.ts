import * as dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function testBulkEmail() {
  console.log('\n🧪 ========== BULK EMAIL TEST ==========');
  
  try {
    // Import email service
    const emailService = await import('./server/emailService');
    
    // Get all students from Firestore
    const studentsSnapshot = await db.collection('wilma_users')
      .where('role', '==', 'student')
      .get();
    
    console.log(`📊 Found ${studentsSnapshot.size} students in database`);
    
    if (studentsSnapshot.empty) {
      console.log('⚠️ No students found. Creating a test student...');
      
      // Create a test student
      const testStudent = {
        email: process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com',
        firstName: 'Test',
        lastName: 'Student',
        studentId: 'TEST001',
        password: 'TempPass123!',
        isTemporaryPassword: true,
        role: 'student',
        parent1Email: process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com',
        createdAt: new Date().toISOString()
      };
      
      await db.collection('wilma_users').add(testStudent);
      console.log('✅ Test student created');
      
      // Send welcome email to test student
      console.log('\n📧 Sending welcome email to test student...');
      const result = await emailService.sendWilmaStudentWelcomeEmail(
        testStudent.email,
        `${testStudent.firstName} ${testStudent.lastName}`,
        testStudent.password,
        testStudent.studentId,
        [testStudent.parent1Email]
      );
      
      if (result.success) {
        console.log('✅ Welcome email sent successfully!');
        console.log('   Check your inbox:', testStudent.email);
      } else {
        console.error('❌ Failed to send welcome email:', result.error);
      }
    } else {
      // Send emails to all students with temporary passwords
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const doc of studentsSnapshot.docs) {
        const student = doc.data();
        
        if (student.email && student.password && student.isTemporaryPassword) {
          console.log(`\n📧 Sending email to ${student.email}...`);
          
          const parentEmails = [];
          if (student.parent1Email) parentEmails.push(student.parent1Email);
          if (student.parent2Email) parentEmails.push(student.parent2Email);
          
          try {
            const result = await emailService.sendWilmaStudentWelcomeEmail(
              student.email,
              `${student.firstName} ${student.lastName}`,
              student.password,
              student.studentId,
              parentEmails.length > 0 ? parentEmails : undefined
            );
            
            if (result.success) {
              sent++;
              console.log(`✅ Email sent to ${student.email}`);
            } else {
              failed++;
              errors.push(`${student.email}: ${result.error || 'Unknown error'}`);
              console.error(`❌ Failed to send to ${student.email}:`, result.error);
            }
          } catch (error: any) {
            failed++;
            errors.push(`${student.email}: ${error.message}`);
            console.error(`❌ Error sending to ${student.email}:`, error.message);
          }
        } else {
          console.log(`⏭️ Skipping ${student.email} - missing data or not temporary password`);
        }
      }
      
      console.log('\n📊 ========== BULK EMAIL RESULTS ==========');
      console.log(`✅ Sent: ${sent}`);
      console.log(`❌ Failed: ${failed}`);
      if (errors.length > 0) {
        console.log('\n❌ Errors:');
        errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      }
      console.log('==========================================\n');
    }
    
    console.log('🎉 BULK EMAIL TEST COMPLETE! 🎉\n');
    
  } catch (error: any) {
    console.error('❌ Bulk email test failed:', error);
    console.error('   Error:', error.message);
    process.exit(1);
  }
}

testBulkEmail();
