import nodemailer from 'nodemailer';

// Create Gmail transporter
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️ Email credentials not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export async function sendPasswordSetupEmail(email: string, firstName: string, tempPassword: string) {
  console.log('\n📧 ========== SENDING EMAIL ==========');
  console.log('To:', email);
  console.log('Name:', firstName);
  console.log('Password:', tempPassword);
  console.log('Email configured:', !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD));
  console.log('=====================================\n');

  const transporter = createTransporter();

  if (!transporter) {
    console.log('⚠️ Email not configured, showing password in console');
    console.log(`📝 Password for ${email}: ${tempPassword}`);
    return { success: true, mode: 'console', password: tempPassword };
  }

  const emailContent = {
    from: `"KSYK Map Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🗺️ Welcome to KSYK Map - Your Admin Account',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to KSYK Map</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937;
            background-color: #f3f4f6;
            padding: 20px;
          }
          .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header p {
            margin-top: 8px;
            opacity: 0.95;
            font-size: 16px;
          }
          .content { 
            padding: 40px 30px;
            background: white;
          }
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
          }
          .intro {
            color: #4b5563;
            margin-bottom: 24px;
            font-size: 15px;
          }
          .password-section {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 2px solid #3B82F6;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }
          .password-label {
            color: #6b7280;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
          }
          .password { 
            font-size: 32px; 
            font-weight: 700; 
            color: #1e40af; 
            letter-spacing: 3px; 
            font-family: 'Courier New', monospace;
            background: white;
            padding: 16px 24px;
            border-radius: 8px;
            display: inline-block;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
          }
          .warning-box { 
            background: #fef3c7; 
            border-left: 4px solid #f59e0b; 
            padding: 20px; 
            margin: 24px 0;
            border-radius: 8px;
          }
          .warning-box strong {
            color: #92400e;
            display: block;
            margin-bottom: 12px;
            font-size: 15px;
          }
          .warning-box ul {
            margin: 0;
            padding-left: 20px;
            color: #78350f;
          }
          .warning-box li {
            margin: 6px 0;
          }
          .info-box {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          .info-box h3 {
            color: #111827;
            font-size: 16px;
            margin-bottom: 12px;
          }
          .info-item {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-item:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #374151;
            min-width: 100px;
          }
          .info-value {
            color: #6b7280;
            word-break: break-all;
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: white !important; 
            padding: 16px 40px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 24px 0;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            transition: transform 0.2s;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          }
          .button-container {
            text-align: center;
            margin: 32px 0;
          }
          .footer { 
            text-align: center; 
            color: #9ca3af; 
            font-size: 13px; 
            padding: 24px 30px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 4px 0;
          }
          .help-text {
            color: #6b7280;
            font-size: 14px;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <h1>🗺️ Welcome to KSYK Map</h1>
            <p>Your admin account is ready!</p>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${firstName}! 👋</div>
            <p class="intro">
              Your administrator account has been successfully created for the KSYK Map system. 
              You now have full access to manage the campus navigation platform.
            </p>
            
            <div class="password-section">
              <div class="password-label">Your Temporary Password</div>
              <div class="password">${tempPassword}</div>
            </div>
            
            <div class="warning-box">
              <strong>🔒 Important Security Notice</strong>
              <ul>
                <li>Change this password immediately after your first login</li>
                <li>Never share your password with anyone</li>
                <li>Delete this email after logging in for security</li>
              </ul>
            </div>
            
            <div class="info-box">
              <h3>📋 Your Login Credentials</h3>
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">${email}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Password:</span>
                <span class="info-value">See above</span>
              </div>
              <div class="info-item">
                <span class="info-label">Login URL:</span>
                <span class="info-value">ksykmaps.vercel.app/admin-login</span>
              </div>
            </div>
            
            <div class="button-container">
              <a href="https://ksykmaps.vercel.app/admin-login" class="cta-button">
                🚀 Login to Admin Panel
              </a>
            </div>
            
            <div class="help-text">
              Need help? Contact your system administrator for assistance.
            </div>
          </div>
          
          <div class="footer">
            <p><strong>KSYK Map Admin System</strong></p>
            <p>© 2025 KSYK Map. All rights reserved.</p>
            <p style="margin-top: 12px; font-size: 12px;">
              This is an automated message.
            </p>
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
- Login URL: https://ksykmaps.vercel.app/admin-login

If you have any questions or need assistance, please contact the system administrator.

---
This is an automated message from KSYK Map Admin System
© 2025 KSYK Map. All rights reserved.
    `
  };

  try {
    const info = await transporter.sendMail(emailContent);

    console.log('✅ Email sent successfully via Gmail!');
    console.log('   Message ID:', info.messageId);
    return { success: true, mode: 'email', messageId: info.messageId, password: tempPassword };
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    console.log(`📝 Password for ${email}: ${tempPassword}`);
    return { success: false, error, mode: 'console', password: tempPassword };
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
