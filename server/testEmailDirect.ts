import nodemailer from 'nodemailer';

// Direct email test - bypasses all application logic
async function testEmailDirect() {
  console.log('\n🧪 ========== DIRECT EMAIL TEST ==========');
  console.log('Environment Variables:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length);
  console.log('  EMAIL_PASSWORD (first 4 chars):', process.env.EMAIL_PASSWORD?.substring(0, 4));
  console.log('=========================================\n');

  // Remove any spaces from password (common issue with Gmail App Passwords)
  const cleanPassword = process.env.EMAIL_PASSWORD?.replace(/\s/g, '');
  console.log('Cleaned password length:', cleanPassword?.length);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: cleanPassword, // Use cleaned password
    },
    debug: true, // Enable debug output
    logger: true // Enable logger
  });

  try {
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!');

    // Send test email
    console.log('\n📤 Sending test email...');
    const info = await transporter.sendMail({
      from: `"KSYK Maps Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self
      subject: 'Test Email - ' + new Date().toISOString(),
      text: 'This is a test email from KSYK Maps. If you receive this, the email system is working!',
      html: '<h1>Test Email</h1><p>This is a test email from KSYK Maps. If you receive this, the email system is working!</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    
    return { success: true, info };
  } catch (error: any) {
    console.error('❌ Email test failed!');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error command:', error.command);
    console.error('   Full error:', error);
    
    return { success: false, error };
  }
}

// Run the test
testEmailDirect()
  .then(result => {
    console.log('\n========== TEST COMPLETE ==========');
    console.log('Success:', result.success);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
