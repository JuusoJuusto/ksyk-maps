import * as dotenv from 'dotenv';
import { sendPasswordSetupEmail } from './emailService.js';

// Load environment variables
dotenv.config();

async function sendTestEmail() {
  const testEmail = 'juusojuusto112@gmail.com';
  
  console.log('📧 Sending test email to:', testEmail);
  
  try {
    const emailBody = `
Hello!

This is a test email from KSYK Maps to verify that the email system is working correctly.

✅ If you received this email, your SMTP configuration is working perfectly!

Test Details:
- Sent at: ${new Date().toISOString()}
- Recipient: ${testEmail}
- Server: KSYK Maps Email System
- Purpose: Email system verification

The ticket system email notifications are now fully functional and will send:
1. Confirmation emails when tickets are created
2. Notifications to the owner when new tickets arrive
3. Status update emails when tickets are updated (pending → in_progress → resolved/closed)

---
KSYK Maps Support Team
https://ksykmaps.vercel.app
    `.trim();
    
    await sendPasswordSetupEmail(testEmail, 'KSYK Maps - Test Email ✅', emailBody);
    
    console.log('✅ Test email sent successfully!');
    console.log('📬 Check your inbox at:', testEmail);
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    throw error;
  }
}

// Run the test
console.log('🚀 Starting email test...');
sendTestEmail()
  .then(() => {
    console.log('🎉 Email test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Email test failed:', error);
    process.exit(1);
  });

export { sendTestEmail };
