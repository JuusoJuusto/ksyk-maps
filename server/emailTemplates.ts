/**
 * Professional Email Templates with Dark Mode Support
 * All templates use dark backgrounds with light text for better readability
 */

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #ffffff;
`;

const containerStyles = `
  max-width: 600px;
  margin: 0 auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const headerStyles = `
  background: rgba(0, 0, 0, 0.3);
  padding: 30px;
  text-align: center;
  border-bottom: 3px solid rgba(255, 255, 255, 0.2);
`;

const contentStyles = `
  padding: 40px 30px;
  background: rgba(0, 0, 0, 0.2);
`;

const cardStyles = `
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 25px;
  border-radius: 10px;
  margin: 20px 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const buttonStyles = `
  display: inline-block;
  padding: 14px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
`;

const footerStyles = `
  padding: 25px 30px;
  background: rgba(0, 0, 0, 0.4);
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

export function getWilmaInvitationEmail(data: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: string;
  appUrl?: string;
}): string {
  const appUrl = data.appUrl || 'https://ksykmaps.vercel.app';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Wilma</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #1a1a2e;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            🎓 Welcome to Wilma!
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
            Your account has been created
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #ffffff;">
            Hello <strong>${data.firstName} ${data.lastName}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.95);">
            Your Wilma account has been successfully created. You can now access the student management system with your credentials below.
          </p>

          <!-- Credentials Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #ffffff; border-bottom: 2px solid rgba(255, 255, 255, 0.2); padding-bottom: 10px;">
              📋 Your Login Credentials
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8); width: 40%;">Username:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff; background: rgba(0, 0, 0, 0.3); padding: 8px 12px; border-radius: 6px;">${data.username}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8);">Password:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff; background: rgba(0, 0, 0, 0.3); padding: 8px 12px; border-radius: 6px;">${data.password}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8);">Role:</td>
                <td style="padding: 12px 0; font-weight: 600; color: #ffffff; text-transform: capitalize;">${data.role}</td>
              </tr>
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/wilma" style="${buttonStyles}">
              🚀 Login to Wilma
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: rgba(255, 193, 7, 0.15); border-left: 4px solid #ffc107; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #ffffff;">
              <strong>🔒 Security Notice:</strong> Please change your password after your first login for security purposes.
            </p>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: rgba(255, 255, 255, 0.8);">
            If you have any questions or need assistance, please don't hesitate to contact our support team.
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            <strong>KSYK Maps - Wilma System</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 SL Studio. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 12px;">
            This email was sent to you because an account was created for you in the Wilma system.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getTicketResponseEmail(data: {
  ticketId: string;
  title: string;
  response: string;
  name?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Response</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #1a1a2e;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            💬 Ticket Response
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
            We've responded to your ticket
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #ffffff;">
            Hello${data.name ? ` <strong>${data.name}</strong>` : ''},
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.95);">
            We've reviewed your support ticket and have a response for you.
          </p>

          <!-- Ticket Info Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #ffffff;">
              🎫 Ticket #${data.ticketId}
            </h2>
            <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">
              ${data.title}
            </p>
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <p style="margin: 0; font-size: 15px; color: #ffffff; white-space: pre-wrap;">${data.response}</p>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ksykmaps.vercel.app/support" style="${buttonStyles}">
              📋 View Ticket
            </a>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: rgba(255, 255, 255, 0.8);">
            If you need further assistance, please reply to this ticket or create a new one.
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            <strong>KSYK Maps Support Team</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 SL Studio. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 12px;">
            Support Email: support.slstudio@gmail.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getUserInvitationEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  appUrl?: string;
}): string {
  const appUrl = data.appUrl || 'https://ksykmaps.vercel.app';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to KSYK Maps</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #1a1a2e;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            🗺️ Welcome to KSYK Maps!
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
            Your admin account is ready
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #ffffff;">
            Hello <strong>${data.firstName} ${data.lastName}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.95);">
            An administrator account has been created for you on KSYK Maps. You can now access the admin panel with your credentials below.
          </p>

          <!-- Credentials Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #ffffff; border-bottom: 2px solid rgba(255, 255, 255, 0.2); padding-bottom: 10px;">
              🔑 Your Login Credentials
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8); width: 40%;">Email:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff; background: rgba(0, 0, 0, 0.3); padding: 8px 12px; border-radius: 6px;">${data.email}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8);">Password:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff; background: rgba(0, 0, 0, 0.3); padding: 8px 12px; border-radius: 6px;">${data.password}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8);">Role:</td>
                <td style="padding: 12px 0; font-weight: 600; color: #ffffff; text-transform: capitalize;">${data.role}</td>
              </tr>
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/admin" style="${buttonStyles}">
              🚀 Access Admin Panel
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: rgba(255, 193, 7, 0.15); border-left: 4px solid #ffc107; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #ffffff;">
              <strong>🔒 Security Notice:</strong> Please change your password immediately after your first login.
            </p>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: rgba(255, 255, 255, 0.8);">
            Need help? Contact us at support.slstudio@gmail.com
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            <strong>KSYK Maps Admin System</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 SL Studio. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 12px;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPasswordResetEmail(data: {
  name: string;
  resetLink: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #1a1a2e;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            🔐 Password Reset Request
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
            Reset your password securely
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #ffffff;">
            Hello <strong>${data.name}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.95);">
            We received a request to reset your password. Click the button below to create a new password.
          </p>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetLink}" style="${buttonStyles}">
              🔑 Reset Password
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: rgba(244, 67, 54, 0.15); border-left: 4px solid #f44336; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #ffffff;">
              <strong>⚠️ Security Alert:</strong>
            </p>
            <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
              If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.
            </p>
          </div>

          <p style="font-size: 13px; margin: 25px 0 0 0; color: rgba(255, 255, 255, 0.7);">
            This link will expire in 1 hour for security reasons.
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            <strong>KSYK Maps Security Team</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 SL Studio. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getWilmaPasswordResetEmail(data: {
  name: string;
  tempPassword: string;
  appUrl?: string;
}): string {
  const appUrl = data.appUrl || 'https://ksykmaps.vercel.app';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Wilma</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #1a1a2e;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            🔐 Password Reset
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
            Your password has been reset
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #ffffff;">
            Hello <strong>${data.name}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.95);">
            Your Wilma password has been reset by an administrator. Below is your new temporary password.
          </p>

          <!-- Password Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #ffffff; border-bottom: 2px solid rgba(255, 255, 255, 0.2); padding-bottom: 10px;">
              🔑 Your New Temporary Password
            </h2>
            <div style="text-align: center; background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 1px;">
                Temporary Password
              </p>
              <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 2px;">
                ${data.tempPassword}
              </p>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/wilma" style="${buttonStyles}">
              🚀 Login to Wilma
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: rgba(255, 193, 7, 0.15); border-left: 4px solid #ffc107; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #ffffff;">
              <strong>🔒 Important:</strong>
            </p>
            <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
              You will be required to change this password when you log in. Please choose a strong, unique password that you haven't used before.
            </p>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: rgba(255, 255, 255, 0.8);">
            If you didn't request this password reset, please contact your administrator immediately.
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            <strong>KSYK Maps - Wilma System</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 SL Studio. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 12px;">
            This is an automated security email. Please do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
