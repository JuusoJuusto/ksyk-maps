import nodemailer from 'nodemailer';

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

// Create transporter
let transporter: any = null;

async function getTransporter() {
  if (!transporter) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured. Emails will be logged to console only.');
      return null;
    }
    
    transporter = nodemailer.createTransport(EMAIL_CONFIG);
    
    // Test connection
    try {
      await transporter.verify();
      console.log('✅ Email service initialized and verified');
    } catch (error) {
      console.error('❌ Email service verification failed:', error);
      console.log('📧 Falling back to console mode');
      transporter = null;
      return null;
    }
  }
  return transporter;
}

export async function sendPasswordSetupEmail(email: string, firstName: string, tempPassword: string) {
  const transport = await getTransporter();
  
  const emailContent = {
    from: `"KSYK Map Admin" <${process.env.EMAIL_USER || 'noreply@ksyk.fi'}>`,
    to: email,
    subject: 'Welcome to KSYK Map - Set Your Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .password-box { background: white; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .password { font-size: 24px; font-weight: bold; color: #2563EB; letter-spacing: 2px; font-family: monospace; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗺️ Welcome to KSYK Map!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Your admin account has been created for the KSYK Map system.</p>
            
            <div class="password-box">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your temporary password:</p>
              <div class="password">${tempPassword}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Please change this password after your first login</li>
                <li>Do not share this password with anyone</li>
                <li>Keep this email secure or delete it after logging in</li>
              </ul>
            </div>
            
            <p><strong>Your login details:</strong></p>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Password:</strong> (shown above)</li>
              <li><strong>Login URL:</strong> <a href="http://localhost:3000/admin-login">http://localhost:3000/admin-login</a></li>
            </ul>
            
            <div style="text-align: center;">
              <a href="http://localhost:3000/admin-login" class="button">Login to KSYK Map</a>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              If you have any questions or need assistance, please contact the system administrator.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from KSYK Map Admin System</p>
            <p>© 2025 KSYK Map. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to KSYK Map!

Hello ${firstName}!

Your admin account has been created for the KSYK Map system.

Your temporary password: ${tempPassword}

IMPORTANT SECURITY NOTICE:
- Please change this password after your first login
- Do not share this password with anyone
- Keep this email secure or delete it after logging in

Your login details:
- Email: ${email}
- Password: ${tempPassword}
- Login URL: http://localhost:3000/admin-login

If you have any questions or need assistance, please contact the system administrator.

---
This is an automated message from KSYK Map Admin System
© 2025 KSYK Map. All rights reserved.
    `
  };
  
  if (!transport) {
    // Log to console if email not configured
    console.log('\n📧 ========== EMAIL WOULD BE SENT ==========');
    console.log('To:', email);
    console.log('Subject:', emailContent.subject);
    console.log('Temporary Password:', tempPassword);
    console.log('==========================================\n');
    return { success: true, mode: 'console' };
  }
  
  try {
    console.log(`📧 Attempting to send email to: ${email}`);
    console.log(`📧 Using SMTP: ${EMAIL_CONFIG.host}:${EMAIL_CONFIG.port}`);
    console.log(`📧 From: ${EMAIL_CONFIG.auth.user}`);
    
    const info = await transport.sendMail(emailContent);
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    console.log('   Temp Password:', tempPassword);
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Error sending email:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Response:', error.response);
    
    // Fallback to console
    console.log('\n📧 ========== EMAIL FAILED, SHOWING IN CONSOLE ==========');
    console.log('To:', email);
    console.log('Temporary Password:', tempPassword);
    console.log('Error Details:', error.message);
    console.log('======================================================\n');
    return { success: false, error, mode: 'console' };
  }
}

// Generate a random temporary password
export function generateTempPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
