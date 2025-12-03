// Simple Resend Email Test
// Run with: node test-email-simple.js

import { Resend } from 'resend';

const resend = new Resend('re_cjxCHufh_6dt8g21HwgeMNLvn81wbdcMC');

async function testEmail() {
  console.log('🧪 Testing Resend Email...\n');
  
  // CHANGE THIS TO YOUR EMAIL ADDRESS
  const testEmail = 'JuusoJuusto112@gmail.com';
  
  console.log(`Sending test email to: ${testEmail}`);
  console.log('⚠️  IMPORTANT: This email must be verified in Resend dashboard!\n');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'KSYK Map <onboarding@resend.dev>',
      to: [testEmail],
      subject: '🧪 Test Email from KSYK Map',
      html: `
        <h1>✅ Email Test Successful!</h1>
        <p>If you're reading this, your Resend email is working!</p>
        <p><strong>API Key:</strong> Configured correctly</p>
        <p><strong>Email:</strong> ${testEmail}</p>
        <p><strong>Status:</strong> Delivered successfully</p>
      `,
    });

    if (error) {
      console.error('❌ ERROR:', error);
      console.log('\n💡 COMMON FIXES:');
      console.log('1. Verify the recipient email at: https://resend.com/emails');
      console.log('2. Check if API key is correct');
      console.log('3. Make sure you have internet connection');
      return;
    }

    console.log('✅ SUCCESS!');
    console.log(`Email ID: ${data.id}`);
    console.log(`\nCheck your inbox: ${testEmail}`);
    console.log('(Also check spam/junk folder)');
    
  } catch (error) {
    console.error('❌ EXCEPTION:', error.message);
  }
}

testEmail();
