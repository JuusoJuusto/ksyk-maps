import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmail() {
  console.log('\n🧪 ========== EMAIL CONFIGURATION TEST ==========');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('===============================================\n');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email credentials not configured!');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD.replace(/\s/g, ''), // Remove spaces
    },
  });

  console.log('📧 Testing email connection...\n');

  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    // Send test email
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: `"KSYK Maps Test" <${process.env.EMAIL_USER}>`,
      to: process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com',
      subject: '✅ Email Test - KSYK Maps',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Email Test Successful!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <h2>Email Configuration Working!</h2>
            <p>This test email confirms that your email configuration is working correctly.</p>
            <ul>
              <li><strong>Host:</strong> ${process.env.EMAIL_HOST}</li>
              <li><strong>Port:</strong> ${process.env.EMAIL_PORT}</li>
              <li><strong>User:</strong> ${process.env.EMAIL_USER}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString('fi-FI')}</li>
            </ul>
            <p>You can now send bulk emails and password reset emails!</p>
          </div>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n🎉 EMAIL SYSTEM IS WORKING! 🎉\n');
    
  } catch (error: any) {
    console.error('❌ Email test failed:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Please check:');
      console.error('   1. Email address is correct');
      console.error('   2. App password is correct (not regular password)');
      console.error('   3. 2-Step Verification is enabled in Google Account');
      console.error('   4. App password has no spaces');
    }
    
    process.exit(1);
  }
}

testEmail();
