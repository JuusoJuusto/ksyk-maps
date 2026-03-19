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
      pass: process.env.EMAIL_PASSWORD.replace(/\s/g, ''), // Remove spaces from password
    },
  });
};

export async function sendPasswordSetupEmail(email: string, firstName: string, tempPassword: string) {
  console.log('\n📧 ========== SENDING ADMIN INVITATION EMAIL ==========');
  console.log('To:', email);
  console.log('Name:', firstName);
  console.log('Password:', tempPassword);
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email configured:', !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD));
  console.log('=====================================================\n');

  const transporter = createTransporter();

  if (!transporter) {
    console.log('⚠️ Email not configured');
    return { success: false, mode: 'console', error: 'Email not configured' };
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 32px;
      font-weight: 700;
    }
    .header p {
      margin: 10px 0 0 0;
      color: #dbeafe;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      color: #4b5563;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .password-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .password-label {
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 15px;
    }
    .password {
      font-size: 28px;
      font-weight: 700;
      color: #1e40af;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      background-color: #ffffff;
      padding: 15px 25px;
      border-radius: 8px;
      display: inline-block;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .instructions {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .instructions p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
      line-height: 1.5;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
      color: #6b7280;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗺️ Welcome to KSYK Maps</h1>
      <p>Your admin account is ready!</p>
    </div>
    
    <div class="content">
      <div class="greeting">Hello ${firstName}! 👋</div>
      
      <div class="message">
        Your administrator account has been successfully created for the KSYK Maps system. You now have full access to manage the campus navigation platform.
      </div>
      
      <div class="password-box">
        <div class="password-label">YOUR TEMPORARY PASSWORD</div>
        <div class="password">${tempPassword}</div>
      </div>
      
      <div class="instructions">
        <p><strong>⚠️ Important:</strong> Please change this password after your first login for security purposes. You can update your password in the admin panel settings.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ksykmaps.vercel.app/admin-login" class="button" style="color: #ffffff; text-decoration: none;">
          Login to Admin Panel →
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>© 2026 KSYK Maps by StudiOWL</strong></p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  const emailContent = {
    from: `"KSYK Maps Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🗺️ Welcome to KSYK Maps - Admin Account Created',
    html: htmlContent,
    text: `Welcome to KSYK Maps!\n\nHello ${firstName}!\n\nYour administrator account has been created.\n\nTemporary Password: ${tempPassword}\n\nPlease login at: https://ksykmaps.vercel.app/admin-login\n\nRemember to change your password after first login.\n\n© 2026 KSYK Maps by StudiOWL`
  };

  try {
    console.log('📤 Attempting to send admin invitation email...');
    const info = await transporter.sendMail(emailContent);

    console.log('✅ Admin invitation email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
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

// Send ticket-related emails with beautiful template
export async function sendTicketEmail(email: string, subject: string, body: string, ticketData?: any) {
  console.log('\n📧 ========== SENDING TICKET EMAIL ==========');
  console.log('To:', email);
  console.log('Subject:', subject);
  console.log('===========================================\n');

  const transporter = createTransporter();

  if (!transporter) {
    console.log('⚠️ Email not configured');
    return { success: false, mode: 'console', error: 'Email not configured' };
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 32px;
      font-weight: 700;
    }
    .header p {
      margin: 10px 0 0 0;
      color: #dbeafe;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      color: #4b5563;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 30px;
      white-space: pre-wrap;
    }
    .ticket-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .ticket-label {
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 15px;
    }
    .ticket-id {
      font-size: 28px;
      font-weight: 700;
      color: #1e40af;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      background-color: #ffffff;
      padding: 15px 25px;
      border-radius: 8px;
      display: inline-block;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .info-section {
      background-color: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .info-section h3 {
      margin: 0 0 15px 0;
      color: #1f2937;
      font-size: 18px;
      font-weight: 600;
    }
    .info-item {
      margin: 8px 0;
      color: #4b5563;
      font-size: 15px;
    }
    .info-item strong {
      color: #1f2937;
      font-weight: 600;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-resolved {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-in-progress {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
      color: #6b7280;
      font-size: 13px;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎫 KSYK Maps Support</h1>
      <p>${subject}</p>
    </div>
    
    <div class="content">
      <div class="greeting">Hello! 👋</div>
      
      ${ticketData?.ticketId ? `
      <div class="ticket-box">
        <div class="ticket-label">YOUR TICKET ID</div>
        <div class="ticket-id">${ticketData.ticketId}</div>
      </div>
      ` : ''}
      
      ${ticketData ? `
      <div class="info-section">
        <h3>Ticket Information</h3>
        ${ticketData.type ? `<div class="info-item"><strong>Type:</strong> ${ticketData.type.toUpperCase()}</div>` : ''}
        ${ticketData.title ? `<div class="info-item"><strong>Subject:</strong> ${ticketData.title}</div>` : ''}
        ${ticketData.status ? `<div class="info-item"><strong>Status:</strong> <span class="status-badge status-${ticketData.status}">${ticketData.status.replace('_', ' ')}</span></div>` : ''}
      </div>
      ` : ''}
      
      <div class="message">${body}</div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ksykmaps.vercel.app" class="button" style="color: #ffffff; text-decoration: none;">
          Visit KSYK Maps →
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>© 2026 KSYK Maps by StudiOWL</strong></p>
      <p>Need help? Contact us at <a href="mailto:juusojuusto112@gmail.com">juusojuusto112@gmail.com</a></p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  const emailContent = {
    from: `"KSYK Maps Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: htmlContent,
    text: body
  };

  try {
    console.log('📤 Sending ticket email...');
    const info = await transporter.sendMail(emailContent);
    console.log('✅ Ticket email sent! Message ID:', info.messageId);
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Ticket email error:', error.message);
    return { success: false, error, mode: 'console' };
  }
}