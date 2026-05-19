// Test email for juuso.kaikula@ksyk.fi
import dotenv from 'dotenv';
dotenv.config();

import { sendEmail } from './server/emailService.js';

async function testEmailForJuuso() {
  console.log('\n🧪 ========== TESTING EMAIL FOR JUUSO.KAIKULA@KSYK.FI ==========\n');
  
  const testEmail = 'juuso.kaikula@ksyk.fi';
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: #fff; }
    .content { padding: 40px 30px; }
    .test-box { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
    .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Email System Test</h1>
      <p>KSYK Maps Email Configuration Verification</p>
    </div>
    <div class="content">
      <h2>Hello Juuso! 👋</h2>
      <p>This is a test email to verify that the KSYK Maps email system is working correctly for your account.</p>
      
      <div class="test-box">
        <h3 style="color: #1e40af; margin: 0 0 15px 0;">✅ EMAIL SYSTEM WORKING!</h3>
        <p style="margin: 0; color: #4b5563;">If you're reading this, the email configuration is correct and emails are being delivered successfully.</p>
      </div>
      
      <h3>Test Details:</h3>
      <ul>
        <li><strong>Recipient:</strong> juuso.kaikula@ksyk.fi</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString('fi-FI')}</li>
        <li><strong>System:</strong> KSYK Maps Email Service</li>
        <li><strong>Status:</strong> ✅ Operational</li>
      </ul>
      
      <p><strong>What this means:</strong></p>
      <ul>
        <li>✅ SMTP configuration is correct</li>
        <li>✅ Email credentials are valid</li>
        <li>✅ Emails can be sent successfully</li>
        <li>✅ Bulk email system is ready to use</li>
      </ul>
    </div>
    <div class="footer">
      <p><strong>© 2026 KSYK Maps by Nordbyte Studio</strong></p>
      <p>This is an automated test message.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  try {
    console.log(`📤 Sending test email to: ${testEmail}`);
    console.log('📧 Email configuration:');
    console.log(`   Host: ${process.env.EMAIL_HOST}`);
    console.log(`   Port: ${process.env.EMAIL_PORT}`);
    console.log(`   User: ${process.env.EMAIL_USER}`);
    console.log(`   Password set: ${!!process.env.EMAIL_PASSWORD}`);
    console.log('');
    
    const result = await sendEmail({
      to: testEmail,
      subject: '✅ KSYK Maps Email Test - System Verification',
      html: htmlContent,
      text: `Email System Test\n\nThis is a test email to verify the KSYK Maps email system is working correctly.\n\nRecipient: ${testEmail}\nTime: ${new Date().toLocaleString('fi-FI')}\nStatus: Operational\n\nIf you received this, the email system is working!`
    });
    
    console.log('\n📊 ========== TEST RESULTS ==========');
    console.log(`Success: ${result.success}`);
    console.log(`Mode: ${result.mode}`);
    if (result.messageId) {
      console.log(`Message ID: ${result.messageId}`);
    }
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    console.log('=====================================\n');
    
    if (result.success) {
      console.log('✅ EMAIL TEST PASSED! Check juuso.kaikula@ksyk.fi inbox.');
    } else {
      console.log('❌ EMAIL TEST FAILED! Check configuration.');
    }
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

testEmailForJuuso();
